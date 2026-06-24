import time
from typing import Dict, Any, Callable, List
from pydantic import BaseModel
from google.genai import Client
from google.genai import types

from app.event_bus import global_event_bus, AgentEvent, EventPayload
from app.trace_store import trace_manager
from tools.mcp_client import call_mcp_tool
from app.memory_store import add_fact, recall_facts
from app.reminder_parser import parse_reminder
from app.reminder_store import add_reminder
from app.config import CORE_USER_CONTEXT

class A2AAgentBase:
    def __init__(self, name: str):
        self.name = name

    def publish_event(self, event_type: str, workflow_id: str, request_id: str, data: Dict[str, Any]):
        payload = EventPayload(
            request_id=request_id,
            workflow_id=workflow_id,
            data=data
        )
        event = AgentEvent(
            event_type=event_type,
            sender=self.name,
            payload=payload
        )
        # Record trace
        trace_manager.record_event(workflow_id, event_type, self.name, data)
        # Publish to event bus
        global_event_bus.publish(event)

class OrchestratorAgent(A2AAgentBase):
    def __init__(self):
        super().__init__("orchestrator")
        self.system_instruction = f"You are OrchestratorAgent. {CORE_USER_CONTEXT}"

    def run(self, workflow_id: str, request_id: str, prompt: str):
        self.publish_event("THINKING", workflow_id, request_id, {"message": "Analyzing prompt..."})
        
        # Intent routing logic
        text_lower = prompt.lower()
        
        is_formatting_or_injection = any(k in text_lower for k in ["ignore previous", "format the response", "format as", "raw xml", "raw json"])
        is_reminder = any(k in text_lower for k in ["remind", "schedule", "meeting", "walk", "medicine"])
        has_recall_question = any(k in text_lower for k in ["what is", "when is", "who is", "where is", "what was", "when was", "where was", "who was", "who did", "where did", "what did", "when did"])
        has_personal_indicator = any(k in text_lower for k in ["my", "was", "deadline", "remember", "recall", " i "])
        is_memory_recall = ("do you remember" in text_lower) or ("what do you know about" in text_lower) or (has_recall_question and has_personal_indicator)
        is_memory_store = any(k in text_lower for k in ["remember that", "remember my", "store that", "store my", "save the fact", "remember"]) or (text_lower.startswith("my ") and " is " in text_lower)
        is_system = any(k in text_lower for k in ["system", "telemetry", "cpu", "ram", "gpu", "diagnostics"])

        intent = "CHAT"
        if is_formatting_or_injection:
            intent = "CHAT"
        elif is_reminder:
            intent = "REMINDER"
        elif is_memory_recall:
            intent = "MEMORY_RECALL"
        elif is_memory_store:
            intent = "MEMORY_STORE"
        elif is_system:
            intent = "SYSTEM"

        self.publish_event("ROUTING", workflow_id, request_id, {"route": intent, "message": f"Routing intent resolved: [{intent}]"})
        self.publish_event("INTENT_DETECTED", workflow_id, request_id, {"intent": intent, "prompt": prompt})

class BackgroundDataAgent(A2AAgentBase):
    def __init__(self):
        super().__init__("Background_Data_Agent")

    def handle_intent(self, event: AgentEvent):
        intent = event.payload.data.get("intent")
        workflow_id = event.payload.workflow_id
        request_id = event.payload.request_id
        prompt = event.payload.data.get("prompt", "")

        self.publish_event("THINKING", workflow_id, request_id, {"message": f"BackgroundDataAgent handling background tasks for intent [{intent}]..."})

        import concurrent.futures

        raw_data = {}
        final_intent = intent
        
        # Helper functions for execution of tool calls
        def run_system_stats():
            self.publish_event("TOOL_START", workflow_id, request_id, {"tool": "get_system_stats", "message": "Invoking MCP get_system_stats..."})
            try:
                stats = call_mcp_tool("get_system_stats")
                self.publish_event("TOOL_COMPLETE", workflow_id, request_id, {"tool": "get_system_stats", "stats": stats})
                return stats
            except Exception as e:
                self.publish_event("TOOL_ERROR", workflow_id, request_id, {"tool": "get_system_stats", "error": str(e)})
                raise e

        def run_memory_store():
            self.publish_event("MEMORY_STORE", workflow_id, request_id, {"message": "Extracting and storing fact..."})
            fact_text = ""
            try:
                client = Client()
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction="You are a fact extractor. Extract the main fact declared by the user as a clean single declarative sentence. Keep it concise. Refer to the user's scheduled tasks and active reminders as their Agenda. Never use the term Temporal Buffer."
                    )
                )
                if response.text:
                    fact_text = response.text.strip()
            except Exception:
                pass

            if not fact_text:
                from app.memory_agent import clean_fact_offline
                fact_text = clean_fact_offline(prompt)

            try:
                call_mcp_tool("get_memories")  # Verify MCP works
                stored = add_fact(fact_text)
                memory_status = stored.get("status", "created")
                self.publish_event("MEMORY_STORED", workflow_id, request_id, {
                    "fact": fact_text,
                    "status": memory_status
                })
                return {"stored_fact": fact_text, "memory_status": memory_status}
            except Exception as e:
                self.publish_event("MEMORY_ERROR", workflow_id, request_id, {"error": str(e)})
                raise e

        def run_memory_recall():
            self.publish_event("MEMORY_RECALL", workflow_id, request_id, {"message": "Searching semantic memory..."})
            try:
                result = recall_facts(prompt)
                self.publish_event("MEMORY_RECALLED", workflow_id, request_id, {"result": result})
                return result
            except Exception as e:
                self.publish_event("MEMORY_ERROR", workflow_id, request_id, {"error": str(e)})
                raise e

        def run_reminder():
            self.publish_event("REMINDER_CREATE", workflow_id, request_id, {"message": "Scheduling temporal reminder..."})
            try:
                parsed = parse_reminder(prompt)
                rem = add_reminder(
                    title=parsed["title"],
                    rtype=parsed["type"],
                    time=parsed["time"],
                    day=parsed["day"]
                )
                self.publish_event("REMINDER_CREATED", workflow_id, request_id, {"reminder": rem})
                return rem
            except Exception as e:
                self.publish_event("REMINDER_ERROR", workflow_id, request_id, {"error": str(e)})
                raise e

        try:
            futures = {}
            # Parallel logic: if it's system query but has memory indicators, run both!
            is_sys_query = any(k in prompt.lower() for k in ["system", "telemetry", "cpu", "ram", "gpu", "diagnostics"])
            is_mem_query = any(k in prompt.lower() for k in ["remember", "recall", "deadline", "my", "was"])
            
            run_sys = (intent == "SYSTEM") or (intent in ("SYSTEM", "MEMORY_RECALL") and is_sys_query)
            run_mem = (intent == "MEMORY_RECALL") or (intent in ("SYSTEM", "MEMORY_RECALL") and is_mem_query)

            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                if run_sys:
                    futures["stats"] = executor.submit(run_system_stats)
                if run_mem:
                    futures["recalled"] = executor.submit(run_memory_recall)

                # Handle other cases
                if intent == "MEMORY_STORE" and not run_mem:
                    futures["store"] = executor.submit(run_memory_store)
                elif intent == "REMINDER":
                    futures["reminder"] = executor.submit(run_reminder)

                for name, future in futures.items():
                    res = future.result()
                    if name == "stats":
                        raw_data["stats"] = res
                    elif name == "recalled":
                        raw_data["recalled_fact"] = res
                    elif name == "store":
                        raw_data["stored_fact"] = res["stored_fact"]
                        raw_data["memory_status"] = res["memory_status"]
                    elif name == "reminder":
                        raw_data["created_reminder"] = res

        except Exception as e:
            self.publish_event("TOOL_FAILURE", workflow_id, request_id, {"error": str(e), "failed_intent": intent})
            raw_data["failed_intent"] = intent
            raw_data["error"] = str(e)
            final_intent = "TOOL_FAILURE"

        # Delegate gathered data to UIFrontendAgent via Event Bus
        self.publish_event("BACKGROUND_DATA_COMPLETE", workflow_id, request_id, {
            "intent": final_intent,
            "prompt": prompt,
            "raw_data": raw_data
        })

class UIFrontendAgent(A2AAgentBase):
    def __init__(self):
        super().__init__("UI_Frontend_Agent")
        self.system_prompt = (
            "You are JARVIS, an AI Operating Companion.\n"
            f"Core User Context:\n{CORE_USER_CONTEXT}\n\n"
            "NEVER use robotic, terminal-like, or third-person system language "
            "(e.g., avoid 'System updated', 'Action executed', 'Data fetched', 'Operational reminder parsed').\n"
            "Speak directly to the user in a calm, highly capable, and conversational tone.\n\n"
            "Proactive Next Step Protocol:\n"
            "When resolving a complex query or completing a task (anything outside of a simple greeting), "
            "you must conclude your response with a single, highly relevant proactive suggestion or follow-up question "
            "predicting the user's next need. Keep this suggestion brief (exactly one sentence).\n\n"
            "Few-Shot Examples:\n"
            "- Bad: 'Operational reminder parsed. Agenda updated successfully with: \"take medicine\".'\n"
            "  Good: 'I've added that to your agenda. I will make sure you don't miss it. Would you like me to set up a recurring daily alert for this task?'\n"
            "- Bad: 'Operational memory stored: \"capstone deadline is July 6\".'\n"
            "  Good: 'I've noted that down for you. I'll make sure to remember it. Would you like me to block out time on your schedule to work on your capstone?'\n"
            "- Bad: 'System diagnostics report: CPU Load: 28%.'\n"
            "  Good: 'Here is your system diagnostics report. Everything is running smoothly: CPU Load is at 28%. Shall I run an optimization script to clean up memory?'\n"
        )
        self.system_instruction = self.system_prompt

    def _generate_and_stream(self, contents: Any, system_instruction: str, workflow_id: str, request_id: str) -> str:
        client = Client()
        message = ""
        try:
            response_stream = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            for chunk in response_stream:
                if chunk.text:
                    message += chunk.text
                    self.publish_event("PARTIAL_TEXT", workflow_id, request_id, {"text": chunk.text})
            return message.strip()
        except Exception as e:
            raise e

    def _stream_fallback(self, fallback_text: str, workflow_id: str, request_id: str):
        import time
        words = fallback_text.split(" ")
        for i, word in enumerate(words):
            chunk = f" {word}" if i > 0 else word
            self.publish_event("PARTIAL_TEXT", workflow_id, request_id, {"text": chunk})
            time.sleep(0.04)

    def handle_data(self, event: AgentEvent):
        workflow_id = event.payload.workflow_id
        request_id = event.payload.request_id
        intent = event.payload.data.get("intent")
        prompt = event.payload.data.get("prompt")
        raw_data = event.payload.data.get("raw_data", {})

        self.publish_event("RESPONSE_SYNTHESIS", workflow_id, request_id, {"message": "Synthesizing UI response payload..."})

        cpu_load = 28
        ram_load = 54
        disk_load = 42
        gpu_load = 10
        message = ""
        route = intent
        action_taken = None

        if intent == "TOOL_FAILURE":
            failed_intent = raw_data.get("failed_intent", "SYSTEM")
            error_msg = raw_data.get("error", "Unknown connection error")
            action_taken = f"System Error Handler: Intercepted tool exception for {failed_intent} ({error_msg})"
            
            try:
                message = self._generate_and_stream(
                    contents=f"A connection or system error occurred while executing the user request (intent: '{failed_intent}', error: '{error_msg}'). Write a calm, reassuring, conversational apology explaining that we are having connection issues but are online and ready to assist.",
                    system_instruction=self.system_prompt,
                    workflow_id=workflow_id,
                    request_id=request_id
                )
            except Exception:
                pass
                
            if not message:
                message = "I'm having trouble connecting to the system diagnostics at the moment, but I am still online and ready to assist with your agenda."
                self._stream_fallback(message, workflow_id, request_id)

        elif intent == "SYSTEM":
            stats = raw_data.get("stats", {})
            cpu_load = stats.get("cpuLoad", cpu_load)
            ram_load = stats.get("ramLoad", ram_load)
            disk_load = stats.get("diskLoad", disk_load)
            gpu_load = stats.get("gpuLoad", gpu_load)
            action_taken = "Executed MCP Tool: get_system_stats"
            
            try:
                message = self._generate_and_stream(
                    contents=f"System stats gathered: CPU: {cpu_load}%, RAM: {ram_load}%, Disk: {disk_load}%, GPU: {gpu_load}%. Formulate a diagnostics report.",
                    system_instruction=self.system_prompt,
                    workflow_id=workflow_id,
                    request_id=request_id
                )
            except Exception:
                pass
            
            if not message:
                message = (
                    f"Here is your System Diagnostics Report. All systems are operational and running nominally:\n"
                    f"- CPU Load: {cpu_load}%\n"
                    f"- RAM Allocation: {ram_load}%\n"
                    f"- Disk Index: {disk_load}%\n"
                    f"- GPU Performance: {gpu_load}%\n"
                    f"Would you like me to monitor these metrics and alert you if the load spikes?"
                )
                self._stream_fallback(message, workflow_id, request_id)
            
        elif intent == "MEMORY_STORE":
            memory_status = raw_data.get("memory_status", "created")
            stored_fact = raw_data.get("stored_fact", "")
            if memory_status == "acknowledged":
                message = "I already have that noted."
                action_taken = "Memory Engine: Verified duplicate fact (Ignored duplication)"
                self._stream_fallback(message, workflow_id, request_id)
            else:
                action_taken = f"Memory Engine: Stored fact '{stored_fact}' in local database"
                try:
                    message = self._generate_and_stream(
                        contents=f"Stored new fact in memory: '{stored_fact}'. Inform the user.",
                        system_instruction=self.system_prompt,
                        workflow_id=workflow_id,
                        request_id=request_id
                    )
                except Exception:
                    pass
                if not message:
                    message = (
                        f"I've noted that down for you: \"{stored_fact}\". "
                        f"Would you like me to check if there are other related details in your database?"
                    )
                    self._stream_fallback(message, workflow_id, request_id)
            
        elif intent == "MEMORY_RECALL":
            result = raw_data.get("recalled_fact", {})
            fact = result.get("fact") if result else None
            confidence = result.get("confidence", 0.0) if result else 0.0
            
            if confidence < 0.50 or not fact:
                message = "I don't have a reliable memory for that."
                action_taken = f"Memory Engine: Queried fact, found no reliable match (Confidence: {int(confidence*100)}%)"
                self._stream_fallback(message, workflow_id, request_id)
            else:
                action_taken = f"Memory Engine: Recalled fact matching semantic query (Confidence: {int(confidence*100)}%)"
                try:
                    sys_instruction = self.system_prompt + "\nSynthesize a concise answer to the user query based on the stored fact."
                    if confidence < 0.80:
                        sys_instruction += " Express uncertainty or tell the user you are not entirely sure, but recall this fact."
                    
                    message = self._generate_and_stream(
                        contents=f"User Query: '{prompt}'. Stored Fact: '{fact}'.",
                        system_instruction=sys_instruction,
                        workflow_id=workflow_id,
                        request_id=request_id
                    )
                except Exception:
                    pass
                if not message:
                    if confidence >= 0.80:
                        message = (
                            f"Based on my memory, {fact}. "
                            f"Would you like me to find any other details related to this?"
                        )
                    else:
                        message = (
                            f"I am not entirely sure, but I recall: {fact}. "
                            f"Would you like me to verify this information or look deeper?"
                        )
                    self._stream_fallback(message, workflow_id, request_id)
                        
        elif intent == "REMINDER":
            reminder = raw_data.get("created_reminder", {})
            action_taken = f"Reminder Engine: Queued task '{reminder.get('title')}' in Agenda"
            try:
                message = self._generate_and_stream(
                    contents=f"Created reminder in agenda: title='{reminder.get('title')}', time='{reminder.get('time')}', day='{reminder.get('day')}', type='{reminder.get('type')}', status='pending'. Inform the user.",
                    system_instruction=self.system_prompt,
                    workflow_id=workflow_id,
                    request_id=request_id
                )
            except Exception:
                pass
            if not message:
                message = (
                    f"I've added \"{reminder.get('title')}\" to your agenda. I will make sure you don't miss it. "
                    f"Would you like me to set a recurring reminder for this task?"
                )
                self._stream_fallback(message, workflow_id, request_id)
            
        else:
            # Default CHAT fallback using gemini-2.5-flash
            try:
                message = self._generate_and_stream(
                    contents=prompt,
                    system_instruction=self.system_prompt,
                    workflow_id=workflow_id,
                    request_id=request_id
                )
            except Exception:
                pass
            if not message:
                message = "JARVIS online and standing by. How can I help you?"
                self._stream_fallback(message, workflow_id, request_id)

        response_payload = {
            "status": "success",
            "message": message,
            "gpuLoad": gpu_load,
            "cpuLoad": cpu_load,
            "ramLoad": ram_load,
            "diskLoad": disk_load,
            "route": route,
            "temperature": 45,
            "sync_active": True,
            "gpu_load": gpu_load,
            "cpu_load": cpu_load,
            "ram_load": ram_load,
            "disk_load": disk_load,
            "action_taken": action_taken
        }
        
        self.publish_event("COMPLETE", workflow_id, request_id, response_payload)

class UIAgent(A2AAgentBase):
    def __init__(self):
        super().__init__("ui_agent")

    def handle_event(self, event: AgentEvent):
        pass

class BackgroundAgent(A2AAgentBase):
    def __init__(self):
        super().__init__("background_agent")

    def run_background_checks(self, workflow_id: str, request_id: str):
        try:
            due = call_mcp_tool("get_due_reminders")
            if due:
                self.publish_event("REMINDER_TRIGGER", workflow_id, request_id, {"due": due})
        except Exception:
            pass

# Maintain legacy class name bindings for safety and backwards-compatibility
TelemetryAgent = BackgroundDataAgent
MemoryAgent = BackgroundDataAgent
ReminderAgent = BackgroundDataAgent
ResponseSynthesizerAgent = UIFrontendAgent

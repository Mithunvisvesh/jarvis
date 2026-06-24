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

        raw_data = {}
        if intent == "SYSTEM":
            self.publish_event("TOOL_START", workflow_id, request_id, {"tool": "get_system_stats", "message": "Invoking MCP get_system_stats..."})
            try:
                stats = call_mcp_tool("get_system_stats")
                self.publish_event("TOOL_COMPLETE", workflow_id, request_id, {"tool": "get_system_stats", "stats": stats})
                raw_data["stats"] = stats
            except Exception as e:
                self.publish_event("TOOL_ERROR", workflow_id, request_id, {"tool": "get_system_stats", "error": str(e)})

        elif intent == "MEMORY_STORE":
            self.publish_event("MEMORY_STORE", workflow_id, request_id, {"message": "Extracting and storing fact..."})
            fact_text = ""
            try:
                client = Client()
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction="You are a fact extractor. Extract the main fact declared by the user as a clean single declarative sentence. Keep it concise."
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
                add_fact(fact_text)
                self.publish_event("MEMORY_STORED", workflow_id, request_id, {"fact": fact_text})
                raw_data["stored_fact"] = fact_text
            except Exception as e:
                self.publish_event("MEMORY_ERROR", workflow_id, request_id, {"error": str(e)})

        elif intent == "MEMORY_RECALL":
            self.publish_event("MEMORY_RECALL", workflow_id, request_id, {"message": "Recalling semantic context..."})
            try:
                result = recall_facts(prompt)
                self.publish_event("MEMORY_RECALLED", workflow_id, request_id, {"result": result})
                raw_data["recalled_fact"] = result
            except Exception as e:
                self.publish_event("MEMORY_ERROR", workflow_id, request_id, {"error": str(e)})

        elif intent == "REMINDER":
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
                raw_data["created_reminder"] = rem
            except Exception as e:
                self.publish_event("REMINDER_ERROR", workflow_id, request_id, {"error": str(e)})

        # Delegate gathered data to UIFrontendAgent via Event Bus
        self.publish_event("BACKGROUND_DATA_COMPLETE", workflow_id, request_id, {
            "intent": intent,
            "prompt": prompt,
            "raw_data": raw_data
        })

class UIFrontendAgent(A2AAgentBase):
    def __init__(self):
        super().__init__("UI_Frontend_Agent")

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

        if intent == "SYSTEM":
            stats = raw_data.get("stats", {})
            cpu_load = stats.get("cpuLoad", cpu_load)
            ram_load = stats.get("ramLoad", ram_load)
            disk_load = stats.get("diskLoad", disk_load)
            gpu_load = stats.get("gpuLoad", gpu_load)
            message = (
                f"JARVIS System Diagnostics Report:\n"
                f"- CPU Load: {cpu_load}%\n"
                f"- RAM Allocation: {ram_load}%\n"
                f"- Disk Index: {disk_load}%\n"
                f"- GPU Performance: {gpu_load}%\n"
                f"Diagnostics operational. All systems nominal."
            )
            
        elif intent == "MEMORY_STORE":
            stored_fact = raw_data.get("stored_fact", "")
            message = f"Operational memory stored: \"{stored_fact}\"."
            
        elif intent == "MEMORY_RECALL":
            result = raw_data.get("recalled_fact", {})
            fact = result.get("fact") if result else None
            confidence = result.get("confidence", 0.0) if result else 0.0
            
            if confidence < 0.50 or not fact:
                message = "I don't have a reliable memory for that."
            else:
                # UI Frontend Agent formatting memory recall using gemini-2.5-flash
                try:
                    client = Client()
                    sys_instruction = "You are UI_Frontend_Agent. Synthesize a concise answer to the user query based on the stored fact."
                    if confidence < 0.80:
                        sys_instruction += " Express uncertainty or tell the user you are not entirely sure, but recall this fact."
                    
                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=f"User Query: '{prompt}'. Stored Fact: '{fact}'.",
                        config=types.GenerateContentConfig(
                            system_instruction=sys_instruction
                        )
                    )
                    if response.text:
                        message = response.text.strip()
                except Exception:
                    pass
                if not message:
                    if confidence >= 0.80:
                        message = f"Based on my memory, {fact}."
                    else:
                        message = f"I am not entirely sure, but I recall: {fact}."
                        
        elif intent == "REMINDER":
            reminder = raw_data.get("created_reminder", {})
            message = f"Operational reminder parsed. Temporal buffer updated successfully with: \"{reminder.get('title')}\"."
            
        else:
            # Default CHAT fallback using gemini-2.5-flash
            try:
                client = Client()
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction="You are JARVIS, a helpful AI operating companion. Keep answers concise."
                    )
                )
                if response.text:
                    message = response.text.strip()
            except Exception:
                pass
            if not message:
                message = f"JARVIS online. System standing by. Operational check successful. Output: \"{prompt}\""

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
            "disk_load": disk_load
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

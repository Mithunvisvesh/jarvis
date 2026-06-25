# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import datetime
from zoneinfo import ZoneInfo
import os
import google.auth

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.workflow import Workflow, START, Edge, node
from google.adk import Event
from google.genai import types
from google.adk.utils.content_utils import extract_text_from_content
from google.genai import Client

from tools.telemetry_server import get_system_stats
from app.memory_store import add_fact, recall_facts
from app.reminder_parser import parse_reminder
from app.reminder_store import add_reminder

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"


# --- PRODUCTION PATH (EXISTING CODESPACE PATH) ---
def get_weather(query: str) -> str:
    """Simulates a web search. Use it get information on weather."""
    if "sf" in query.lower() or "san francisco" in query.lower():
        return "It's 60 degrees and foggy."
    return "It's 90 degrees and sunny."


def get_current_time(query: str) -> str:
    """Simulates getting the current time for a city."""
    if "sf" in query.lower() or "san francisco" in query.lower():
        tz_identifier = "America/Los_Angeles"
    else:
        return f"Sorry, I don't have timezone information for query: {query}."

    tz = ZoneInfo(tz_identifier)
    now = datetime.datetime.now(tz)
    return f"The current time for query {query} is {now.strftime('%Y-%m-%d %H:%M:%S %Z%z')}"


root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model="gemini-flash-latest",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="You are a helpful AI assistant designed to provide accurate and useful information.",
    tools=[get_weather, get_current_time],
)

app = App(
    root_agent=root_agent,
    name="app",
)


# --- PARALLEL WORKFLOW PATH (PHASE 6 A2A GRAPH) ---

@node(name="orchestrator")
def orchestrator_node(ctx, node_input) -> Event:
    """Classifies the prompt intent into SYSTEM, REMINDER, MEMORY_STORE, MEMORY_RECALL, or CHAT."""
    text = ""
    if isinstance(node_input, types.Content):
        text = extract_text_from_content(node_input)
    elif isinstance(node_input, str):
        text = node_input

    text_lower = text.lower()
    
    # Precedence-based intent classification
    is_formatting_or_injection = any(k in text_lower for k in ["ignore previous", "format the response", "format as", "raw xml", "raw json"])
    is_mission = any(k in text_lower for k in ["finish my", "complete my", "help me finish", "help me with my", "achieve my", "goal:", "mission:", "create a mission", "new mission", "add mission"]) or ("help me" in text_lower and "capstone" in text_lower)
    is_reminder = any(k in text_lower for k in ["remind", "schedule", "meeting", "walk", "medicine"])
    has_recall_question = any(k in text_lower for k in ["what is", "when is", "who is", "where is", "what was", "when was", "where was", "who was", "who did", "where did", "what did", "when did"])
    has_personal_indicator = any(k in text_lower for k in ["my", "was", "deadline", "remember", "recall", " i "])
    is_memory_recall = ("do you remember" in text_lower) or ("what do you know about" in text_lower) or (has_recall_question and has_personal_indicator)
    is_memory_store = any(k in text_lower for k in ["remember that", "remember my", "store that", "store my", "save the fact", "remember"]) or (text_lower.startswith("my ") and " is " in text_lower)
    is_system = any(k in text_lower for k in ["system", "telemetry", "cpu", "ram", "gpu", "diagnostics"])

    intent = "CHAT"
    if is_formatting_or_injection:
        intent = "CHAT"
    elif is_mission:
        intent = "MISSION"
    elif is_reminder:
        intent = "REMINDER"
    elif is_memory_recall:
        intent = "MEMORY_RECALL"
    elif is_memory_store:
        intent = "MEMORY_STORE"
    elif is_system:
        intent = "SYSTEM"

    ctx.state["route"] = intent
    ctx.state["prompt"] = text
    return Event(route=intent, output=text)


@node(name="background_data_node")
def background_data_node(ctx, node_input) -> str:
    """Handles tool polling and memory/reminder updates in the background."""
    route = ctx.state.get("route", "CHAT")
    prompt = ctx.state.get("prompt") or str(node_input)
    
    session_id = "default"
    if hasattr(ctx, "session") and ctx.session:
        session_id = getattr(ctx.session, "id", str(ctx.session))
    workflow_id = ctx.state.get("workflow_id") or f"wf-{session_id}"
    request_id = ctx.state.get("request_id") or "req-default"
    
    from app.a2a_agents import BackgroundDataAgent
    from app.event_bus import AgentEvent, EventPayload, global_event_bus
    
    bg_agent = BackgroundDataAgent()
    
    # Capture the BACKGROUND_DATA_COMPLETE event published by the bg_agent
    captured_data = {}
    def on_bg_complete(event: AgentEvent):
        if event.payload.workflow_id == workflow_id:
            captured_data["event"] = event
            
    global_event_bus.subscribe("BACKGROUND_DATA_COMPLETE", on_bg_complete)
    
    # Create the INTENT_DETECTED event
    event = AgentEvent(
        event_type="INTENT_DETECTED",
        sender="orchestrator",
        payload=EventPayload(
            request_id=request_id,
            workflow_id=workflow_id,
            data={"intent": route, "prompt": prompt}
        )
    )
    
    # Run the background agent by handling the event
    bg_agent.handle_intent(event)
    
    # Retrieve the raw data from the captured event and store in ctx.state
    bg_complete_event = captured_data.get("event")
    if bg_complete_event:
        raw_data = bg_complete_event.payload.data.get("raw_data", {})
        ctx.state["raw_data"] = raw_data
        
        # Save specific keys to ctx.state to pass integration tests
        if route == "SYSTEM":
            stats = raw_data.get("stats", {})
            ctx.state['cpuLoad'] = stats.get('cpuLoad')
            ctx.state['ramLoad'] = stats.get('ramLoad')
            ctx.state['diskLoad'] = stats.get('diskLoad')
            ctx.state['gpuLoad'] = stats.get('gpuLoad')
            ctx.state['telemetryGathered'] = True
        elif route == "MEMORY_STORE":
            ctx.state["stored_fact"] = raw_data.get("stored_fact")
            ctx.state["memoryStored"] = True
        elif route == "MEMORY_RECALL":
            ctx.state["recalled_fact"] = raw_data.get("recalled_fact")
            ctx.state["memoryRecalled"] = True
        elif route == "REMINDER":
            ctx.state["created_reminder"] = raw_data.get("created_reminder")
            ctx.state["reminderCreated"] = True
        elif route == "MISSION":
            ctx.state["created_mission"] = raw_data.get("created_mission")
            ctx.state["missionCreated"] = True
            
    return "Background processing complete."


@node(name="ui_frontend_node")
def ui_frontend_node(ctx, node_input) -> str:
    """Formats the final UI React state payload (role of UI_Frontend_Agent)."""
    route = ctx.state.get("route", "CHAT")
    prompt = ctx.state.get("prompt") or str(node_input)
    
    session_id = "default"
    if hasattr(ctx, "session") and ctx.session:
        session_id = getattr(ctx.session, "id", str(ctx.session))
    workflow_id = ctx.state.get("workflow_id") or f"wf-{session_id}"
    request_id = ctx.state.get("request_id") or "req-default"
    
    from app.a2a_agents import UIFrontendAgent
    from app.event_bus import AgentEvent, EventPayload, global_event_bus
    
    ui_agent = UIFrontendAgent()
    
    # Capture the COMPLETE event published by ui_agent
    captured_payload = {}
    def on_complete(event: AgentEvent):
        if event.payload.workflow_id == workflow_id:
            captured_payload["data"] = event.payload.data
            
    global_event_bus.subscribe("COMPLETE", on_complete)
    
    # Reconstruct the BACKGROUND_DATA_COMPLETE event
    raw_data = ctx.state.get("raw_data", {})
    bg_complete_event = AgentEvent(
        event_type="BACKGROUND_DATA_COMPLETE",
        sender="Background_Data_Agent",
        payload=EventPayload(
            request_id=request_id,
            workflow_id=workflow_id,
            data={
                "intent": route,
                "prompt": prompt,
                "raw_data": raw_data
            }
        )
    )
    
    # Run the UI Frontend agent
    ui_agent.handle_data(bg_complete_event)
    
    # Extract the synthesized message from the COMPLETE event payload
    complete_data = captured_payload.get("data", {})
    
    # If complete_data has gpuLoad, save to ctx.state to keep state synced for POST /api/chat
    if route == "SYSTEM" and complete_data:
        ctx.state["cpuLoad"] = complete_data.get("cpuLoad")
        ctx.state["ramLoad"] = complete_data.get("ramLoad")
        ctx.state["diskLoad"] = complete_data.get("diskLoad")
        ctx.state["gpuLoad"] = complete_data.get("gpuLoad")
        
    message = complete_data.get("message", "")
    return message


jarvis_core_workflow = Workflow(
    name="jarvis_core_workflow",
    edges=[
        Edge(from_node=START, to_node=orchestrator_node),
        Edge(from_node=orchestrator_node, to_node=background_data_node, route=["SYSTEM", "REMINDER", "MEMORY_STORE", "MEMORY_RECALL", "MISSION"]),
        Edge(from_node=orchestrator_node, to_node=ui_frontend_node, route="CHAT"),
        Edge(from_node=background_data_node, to_node=ui_frontend_node)
    ]
)

workflow_app = App(
    root_agent=jarvis_core_workflow,
    name="workflow_app"
)

# ruff: noqa
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
from app.reminder_agent import reminder_agent_node
from app.memory_agent import memory_store_node, memory_recall_node

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"


# --- PRODUCTION PATH (EXISTING CODESPACE PATH) ---
def get_weather(query: str) -> str:
    """Simulates a web search. Use it get information on weather.

    Args:
        query: A string containing the location to get weather information for.

    Returns:
        A string with the simulated weather information for the queried location.
    """
    if "sf" in query.lower() or "san francisco" in query.lower():
        return "It's 60 degrees and foggy."
    return "It's 90 degrees and sunny."


def get_current_time(query: str) -> str:
    """Simulates getting the current time for a city.

    Args:
        city: The name of the city to get the current time for.

    Returns:
        A string with the current time information.
    """
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


# --- PARALLEL WORKFLOW PATH (PHASE 2 WORKFLOW) ---

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

    return Event(route=intent, output=text)


@node(name="telemetry_node")
def telemetry_node_node(ctx, node_input) -> str:
    """Gathers system stats from the telemetry server and saves to state."""
    stats = get_system_stats()
    ctx.state['cpuLoad'] = stats['cpuLoad']
    ctx.state['ramLoad'] = stats['ramLoad']
    ctx.state['diskLoad'] = stats['diskLoad']
    ctx.state['gpuLoad'] = stats['gpuLoad']
    return "Diagnostics successfully compiled."


@node(name="synthesis_node")
def synthesis_node_node(ctx, node_input) -> str:
    """Compiles a report or conversational response based on routing and state."""
    # 1. Telemetry diagnostics
    cpu = ctx.state.get('cpuLoad')
    if cpu is not None:
        ram = ctx.state.get('ramLoad')
        disk = ctx.state.get('diskLoad')
        gpu = ctx.state.get('gpuLoad')

        # Check for threshold alerts
        alerts = []
        if cpu > 85:
            alerts.append("CRITICAL CPU LOAD.")
        if ram > 90:
            alerts.append("CRITICAL RAM ALLOCATION.")
        alert_msg = f" ({' '.join(alerts)})" if alerts else ""

        return (
            f"JARVIS System Diagnostics Report:\n"
            f"- CPU Load: {cpu}%\n"
            f"- RAM Allocation: {ram}%\n"
            f"- Disk Index: {disk}%\n"
            f"- GPU Performance: {gpu}%\n"
            f"Diagnostics operational. All systems nominal.{alert_msg}"
        )

    # 2. Reminder created
    reminder = ctx.state.get('created_reminder')
    if reminder:
        return f"Operational reminder parsed. Temporal buffer updated successfully with: \"{reminder['title']}\"."

    # 3. Memory stored
    stored_fact = ctx.state.get('stored_fact')
    if stored_fact:
        return f"Operational memory stored: \"{stored_fact}\"."

    # 4. Memory recalled
    recalled = ctx.state.get('recalled_fact')
    if recalled:
        fact = recalled.get("fact")
        confidence = recalled.get("confidence", 0.0)
        
        if confidence < 0.50 or not fact:
            return "I don't have a reliable memory for that."
            
        raw_query = str(node_input)
        if confidence >= 0.80:
            # Answer normally
            try:
                client = Client()
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"Answer the user query: '{raw_query}' based on this stored fact: '{fact}'. Keep it concise.",
                )
                if response.text:
                    return response.text.strip()
            except Exception:
                pass
            return f"Based on my memory, {fact}."
        else:
            # Answer with uncertainty wording
            try:
                client = Client()
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"Answer the user query: '{raw_query}' based on this stored fact: '{fact}'. Express uncertainty or tell the user you are not entirely sure, but recall this fact. Keep it concise.",
                )
                if response.text:
                    return response.text.strip()
            except Exception:
                pass
            return f"I am not entirely sure, but I recall: {fact}."

    # 5. Default chat fallback
    prompt_text = str(node_input)
    try:
        client = Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt_text,
            config=types.GenerateContentConfig(
                system_instruction="You are JARVIS, a helpful AI operating companion. Keep answers concise."
            )
        )
        if response.text:
            return response.text
    except Exception:
        pass

    return f"JARVIS online. System standing by. Operational check successful. Output: \"{prompt_text}\""


jarvis_core_workflow = Workflow(
    name="jarvis_core_workflow",
    edges=[
        Edge(from_node=START, to_node=orchestrator_node),
        Edge(from_node=orchestrator_node, to_node=telemetry_node_node, route='SYSTEM'),
        Edge(from_node=orchestrator_node, to_node=reminder_agent_node, route='REMINDER'),
        Edge(from_node=orchestrator_node, to_node=memory_store_node, route='MEMORY_STORE'),
        Edge(from_node=orchestrator_node, to_node=memory_recall_node, route='MEMORY_RECALL'),
        Edge(from_node=orchestrator_node, to_node=synthesis_node_node, route='CHAT'),
        Edge(from_node=telemetry_node_node, to_node=synthesis_node_node),
        Edge(from_node=reminder_agent_node, to_node=synthesis_node_node),
        Edge(from_node=memory_store_node, to_node=synthesis_node_node),
        Edge(from_node=memory_recall_node, to_node=synthesis_node_node)
    ]
)

workflow_app = App(
    root_agent=jarvis_core_workflow,
    name="workflow_app"
)

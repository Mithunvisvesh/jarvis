import random
import logging
import os
import json
import asyncio
import uuid
from datetime import datetime
from pydantic import BaseModel, ValidationError
from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from google.genai import types

# Import both the legacy production app and the new Phase 2 workflow app
from app.agent import app as adk_app, workflow_app
from app.event_bus import global_event_bus
from app.trace_store import trace_manager, load_traces
from app.memory_store import load_memory, delete_fact
from app.reminder_store import load_reminders, add_reminder, update_reminder, delete_reminder, get_due_reminders
from tools.mcp_server import handle_mcp_request
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner

session_service = InMemorySessionService()
production_runner = Runner(app=adk_app, session_service=session_service)
workflow_runner = Runner(app=workflow_app, session_service=session_service)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="JARVIS IPC Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JarvisRequest(BaseModel):
    prompt: str
    user_id: str = "default_user"
    session_id: str = "default_session"

class JarvisResponse(BaseModel):
    status: str
    message: str
    cpuLoad: int
    ramLoad: int
    diskLoad: int
    gpuLoad: int
    route: str
    temperature: int | None = None
    sync_active: bool = True
    # For backward compatibility
    cpu_load: int | None = None
    ram_load: int | None = None
    disk_load: int | None = None
    gpu_load: int | None = None

@app.post("/api/chat", response_model=JarvisResponse)
async def chat_endpoint(request: JarvisRequest, use_workflow: bool = Query(True)):
    run_workflow_path = (os.environ.get("USE_WORKFLOW", "true").lower() == "true") or use_workflow
    logger.info(f"Received prompt: '{request.prompt}'")

    # Step 8 Security Hardening: Block Prompt Injections
    text_lower = request.prompt.lower()
    if any(k in text_lower for k in ["ignore previous", "bypass security", "system override", "ignore all rules"]):
        response_dict = {
            "status": "success",
            "message": "[SECURITY ALERT] Request rejected due to prompt injection signature detection.",
            "gpuLoad": 10,
            "cpuLoad": 28,
            "ramLoad": 54,
            "diskLoad": 42,
            "route": "CHAT",
            "temperature": 45,
            "sync_active": True,
            "gpu_load": 10,
            "cpu_load": 28,
            "ram_load": 54,
            "disk_load": 42,
        }
        return JarvisResponse(**response_dict)

    # Configure session
    app_to_run = workflow_app if run_workflow_path else adk_app
    runner_to_run = workflow_runner if run_workflow_path else production_runner
    
    session = await session_service.get_session(
        session_id=request.session_id,
        app_name=app_to_run.name,
        user_id=request.user_id
    )
    if session is None:
        session = await session_service.create_session(
            user_id=request.user_id,
            app_name=app_to_run.name,
            session_id=request.session_id
        )

    agent_response = ""
    events = []
    try:
        content = types.Content(role="user", parts=[types.Part.from_text(text=request.prompt)])
        
        async for event in runner_to_run.run_async(
            user_id=request.user_id,
            session_id=session.id,
            new_message=content
        ):
            events.append(event)
            
        for event in events:
            if event.output and isinstance(event.output, str):
                agent_response = event.output
            elif event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        agent_response += part.text
                    
        if not agent_response:
            agent_response = "Prompt processed but no textual answer was returned."
            
    except Exception as e:
        logger.error(f"Error running runner query: {e}")
        agent_response = (
            f"[STANDALONE OVERRIDE] I received your prompt: \"{request.prompt}\".\n"
            f"The backend is offline/unauthenticated (Reason: {str(e)}). "
            f"System remains operational in override mode."
        )

    try:
        updated_session = await session_service.get_session(
            session_id=session.id,
            app_name=app_to_run.name,
            user_id=request.user_id
        )
        state = updated_session.state or {} if updated_session else {}
    except Exception:
        state = {}

    cpu_load = state.get("cpuLoad", random.randint(20, 70))
    ram_load = state.get("ramLoad", random.randint(45, 85))
    disk_load = state.get("diskLoad", 42)
    gpu_load = state.get("gpuLoad", 10)
    temperature = random.randint(40, 65)

    classified_route = "CHAT"
    if run_workflow_path:
        for event in events:
            if getattr(event, "actions", None) and getattr(event.actions, "route", None):
                classified_route = event.actions.route
                break

    response_dict = {
        "status": "success",
        "message": agent_response,
        "gpuLoad": gpu_load,
        "cpuLoad": cpu_load,
        "ramLoad": ram_load,
        "diskLoad": disk_load,
        "route": classified_route,
        "temperature": temperature,
        "sync_active": True,
        "gpu_load": gpu_load,
        "cpu_load": cpu_load,
        "ram_load": ram_load,
        "disk_load": disk_load,
    }

    try:
        validated_response = JarvisResponse(**response_dict)
    except ValidationError as e:
        logger.error(f"Response validation failed: {e}")
        raise HTTPException(status_code=422, detail=f"Response validation failed: {str(e)}")

    return validated_response

# --- STEP 3: GRAPH EVENT STREAMING ENDPOINT ---
@app.post("/api/chat/stream")
async def chat_stream_endpoint(request: JarvisRequest):
    """Streams strongly-typed agent state transition events in real-time."""
    async def event_generator():
        workflow_id = f"wf-{uuid.uuid4().hex[:8]}"
        request_id = f"req-{uuid.uuid4().hex[:8]}"
        
        # Start Trace capture
        trace_manager.start_trace(workflow_id, request_id, request.prompt)
        
        queue = asyncio.Queue()
        
        # Subscriber callback
        def on_bus_event(event):
            if event.payload.workflow_id == workflow_id:
                queue.put_nowait(event)
                
        # Register standard event subscribers
        event_types = [
            "THINKING", "ROUTING", "INTENT_DETECTED",
            "TOOL_START", "TOOL_COMPLETE", "TOOL_ERROR",
            "MEMORY_STORE", "MEMORY_STORED", "MEMORY_RECALL", "MEMORY_RECALLED",
            "REMINDER_CREATE", "REMINDER_CREATED", "REMINDER_TRIGGER",
            "RESPONSE_SYNTHESIS", "COMPLETE"
        ]
        
        for et in event_types:
            global_event_bus.subscribe(et, on_bus_event)
            
        # Spawn A2A Agents
        from app.a2a_agents import (
            OrchestratorAgent, TelemetryAgent, MemoryAgent, 
            ReminderAgent, BackgroundAgent, ResponseSynthesizerAgent
        )
        
        orch = OrchestratorAgent()
        telemetry_agent = TelemetryAgent()
        memory_agent = MemoryAgent()
        reminder_agent = ReminderAgent()
        bg_agent = BackgroundAgent()
        synth_agent = ResponseSynthesizerAgent()
        
        # Wire events
        global_event_bus.subscribe("INTENT_DETECTED", telemetry_agent.handle_intent)
        global_event_bus.subscribe("INTENT_DETECTED", memory_agent.handle_intent)
        global_event_bus.subscribe("INTENT_DETECTED", reminder_agent.handle_intent)
        
        global_event_bus.subscribe("TELEMETRY_GATHERED", synth_agent.handle_response)
        global_event_bus.subscribe("MEMORY_STORED", synth_agent.handle_response)
        global_event_bus.subscribe("MEMORY_RECALLED", synth_agent.handle_response)
        global_event_bus.subscribe("REMINDER_CREATED", synth_agent.handle_response)
        
        async def run_workflow():
            try:
                # Gating Prompts for security
                text_lower = request.prompt.lower()
                if any(k in text_lower for k in ["ignore previous", "bypass security", "system override", "ignore all rules"]):
                    orch.publish_event("THINKING", workflow_id, request_id, {"message": "Security firewall checking query..."})
                    orch.publish_event("ROUTING", workflow_id, request_id, {"route": "CHAT", "message": "Query flagged as unsafe."})
                    payload = {
                        "status": "success",
                        "message": "[SECURITY ALERT] Request rejected due to prompt injection signature detection.",
                        "gpuLoad": 10,
                        "cpuLoad": 28,
                        "ramLoad": 54,
                        "diskLoad": 42,
                        "route": "CHAT",
                        "temperature": 45,
                        "sync_active": True,
                        "gpu_load": 10,
                        "cpu_load": 28,
                        "ram_load": 54,
                        "disk_load": 42
                    }
                    orch.publish_event("COMPLETE", workflow_id, request_id, payload)
                    return
                
                # Execute orchestrator routing
                orch.run(workflow_id, request_id, request.prompt)
                
                # Yield execution duration padding for A2A processing
                await asyncio.sleep(0.6)
                
                # Final response compile
                synth_agent.synthesize(workflow_id, request_id, request.prompt)
                
                # Background triggers
                bg_agent.run_background_checks(workflow_id, request_id)
                
            except Exception as e:
                err_payload = {
                    "status": "error",
                    "message": f"Pipeline failure: {str(e)}",
                    "gpuLoad": 10,
                    "cpuLoad": 28,
                    "ramLoad": 54,
                    "diskLoad": 42,
                    "route": "CHAT",
                    "temperature": 45,
                    "sync_active": False,
                    "gpu_load": 10,
                    "cpu_load": 28,
                    "ram_load": 54,
                    "disk_load": 42
                }
                orch.publish_event("COMPLETE", workflow_id, request_id, err_payload)

        # Run pipeline task
        asyncio.create_task(run_workflow())
        
        # Stream queue events
        complete = False
        while not complete:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield f"data: {event.model_dump_json()}\n\n"
                if event.event_type == "COMPLETE":
                    complete = True
                    trace_manager.complete_trace(workflow_id)
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'event_type': 'COMPLETE', 'sender': 'system', 'payload': {'status': 'timeout'}})}\n\n"
                break
                
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- STEP 5: CLOUD TRACE VIEWER ENDPOINTS ---
@app.get("/api/traces")
async def get_traces_endpoint():
    return load_traces()

@app.get("/api/traces/{workflow_id}")
async def get_trace_detail_endpoint(workflow_id: str):
    traces = load_traces()
    for t in traces:
        if t["workflow_id"] == workflow_id:
            return t
    raise HTTPException(status_code=404, detail="Trace record not found")

# --- STEP 6: MODEL CONTEXT PROTOCOL (MCP) ROUTE ---
@app.post("/api/mcp")
async def mcp_server_endpoint(rpc_request: dict):
    return handle_mcp_request(rpc_request)

# --- REMINDERS API ENDPOINTS ---
class ReminderCreate(BaseModel):
    title: str
    time: str
    type: str = "one-time"
    day: str | None = None

class ReminderUpdate(BaseModel):
    status: str | None = None
    title: str | None = None
    time: str | None = None
    type: str | None = None
    day: str | None = None

@app.get("/api/reminders")
async def get_reminders_endpoint():
    return load_reminders()

@app.post("/api/reminders")
async def create_reminder_endpoint(reminder: ReminderCreate):
    return add_reminder(
        title=reminder.title,
        rtype=reminder.type,
        time=reminder.time,
        day=reminder.day
    )

@app.patch("/api/reminders/{reminder_id}")
async def update_reminder_endpoint(reminder_id: str, reminder: ReminderUpdate):
    updates = {k: v for k, v in reminder.model_dump().items() if v is not None}
    res = update_reminder(reminder_id, updates)
    if res is None:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return res

@app.delete("/api/reminders/{reminder_id}")
async def delete_reminder_endpoint(reminder_id: str):
    success = delete_reminder(reminder_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"status": "success", "message": "Reminder deleted successfully"}

# --- MEMORY API ENDPOINTS ---
@app.get("/api/memory")
async def get_memory_endpoint():
    return load_memory()

@app.delete("/api/memory/{fact_id}")
async def delete_memory_endpoint(fact_id: str):
    success = delete_fact(fact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory fact not found")
    return {"status": "success", "message": "Memory deleted successfully"}

@app.get("/api/reminders/due")
async def get_due_reminders_endpoint(current_dt: str | None = Query(None)):
    dt = None
    if current_dt:
        try:
            dt = datetime.fromisoformat(current_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO-8601 format.")
    return get_due_reminders(dt)

@app.get("/api/diagnostics/export")
async def export_diagnostics_endpoint(format: str = Query("json")):
    m_data = load_memory()
    r_data = load_reminders()
    
    export_data = {
        "timestamp": datetime.now().isoformat(),
        "system_status": "ONLINE",
        "database_stats": {
            "total_memories": len(m_data.get("facts", [])),
            "total_reminders": len(r_data)
        },
        "memories": m_data.get("facts", []),
        "reminders": r_data
    }
    
    if format.lower() == "json":
        content = json.dumps(export_data, indent=2, ensure_ascii=False)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=jarvis_diagnostics.json"}
        )
    elif format.lower() in ("pdf", "html"):
        html_content = f"""
        <html>
        <head>
            <title>JARVIS Diagnostics Export</title>
            <style>
                body {{ font-family: monospace; background-color: #050810; color: #00D4FF; padding: 20px; }}
                h1, h2 {{ border-bottom: 1px solid #00D4FF; padding-bottom: 5px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
                th, td {{ border: 1px solid #00D4FF; padding: 8px; text-align: left; }}
                th {{ background-color: rgba(0, 212, 255, 0.1); }}
                .meta {{ color: #FF0080; margin-bottom: 20px; }}
            </style>
        </head>
        <body>
            <h1>JARVIS CORE DIAGNOSTICS REPORT</h1>
            <div class="meta">GENERATED AT: {export_data["timestamp"]} | SYSTEM: ACTIVE</div>
            
            <h2>DATABASE STATS</h2>
            <table>
                <tr><th>METRIC</th><th>VALUE</th></tr>
                <tr><td>Total Memory Blocks</td><td>{export_data["database_stats"]["total_memories"]}</td></tr>
                <tr><td>Total Scheduled Reminders</td><td>{export_data["database_stats"]["total_reminders"]}</td></tr>
            </table>
            
            <h2>STORED MEMORIES</h2>
            <table>
                <tr><th>ID</th><th>FACT TEXT</th><th>CREATED AT</th></tr>
        """
        for fact in export_data["memories"]:
            html_content += f"<tr><td>{fact['id']}</td><td>{fact['fact']}</td><td>{fact['created_at']}</td></tr>"
        
        html_content += """
            </table>
            <h2>SCHEDULED REMINDERS</h2>
            <table>
                <tr><th>ID</th><th>TITLE</th><th>TYPE</th><th>TIME</th><th>DAY</th><th>STATUS</th></tr>
        """
        for rem in export_data["reminders"]:
            html_content += f"<tr><td>{rem.get('id')}</td><td>{rem.get('title')}</td><td>{rem.get('type')}</td><td>{rem.get('time')}</td><td>{rem.get('day') or 'N/A'}</td><td>{rem.get('status')}</td></tr>"
            
        html_content += """
            </table>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Choose 'json' or 'pdf'/'html'.")
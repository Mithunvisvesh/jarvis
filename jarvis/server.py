from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
import random
import logging
import os

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.events.event import Event
from google.genai import types

# Import both the legacy production app and the new Phase 2 workflow app
from app.agent import app as adk_app, workflow_app

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

# Instantiate public session service and runners
session_service = InMemorySessionService()
production_runner = Runner(app=adk_app, session_service=session_service)
workflow_runner = Runner(app=workflow_app, session_service=session_service)

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
    # Platform-wide toggle: default to true now that workflow is verified
    run_workflow_path = (os.environ.get("USE_WORKFLOW", "true").lower() == "true") or use_workflow
    
    logger.info(f"Received prompt: '{request.prompt}' (Workflow path: {run_workflow_path})")
    
    # Configure session
    app_to_run = workflow_app if run_workflow_path else adk_app
    runner_to_run = workflow_runner if run_workflow_path else production_runner
    
    # Ensure session exists or create it
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
        
        # Run agent query asynchronously using public Runner API
        async for event in runner_to_run.run_async(
            user_id=request.user_id,
            session_id=session.id,
            new_message=content
        ):
            events.append(event)
            
        # Parse text responses from event stream
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
        # Offline fallback behavior remains intact
        agent_response = (
            f"[STANDALONE OVERRIDE] I received your prompt: \"{request.prompt}\".\n"
            f"The backend is offline/unauthenticated (Reason: {str(e)}). "
            f"System remains operational in override mode."
        )

    # 4. Telemetry retrieval from session state
    try:
        updated_session = await session_service.get_session(
            session_id=session.id,
            app_name=app_to_run.name,
            user_id=request.user_id
        )
        state = updated_session.state or {} if updated_session else {}
    except Exception:
        state = {}

    # Extract metrics from state if telemetry_node was run, otherwise use defaults
    cpu_load = state.get("cpuLoad", random.randint(20, 70))
    ram_load = state.get("ramLoad", random.randint(45, 85))
    disk_load = state.get("diskLoad", 42)
    gpu_load = state.get("gpuLoad", 10)
    temperature = random.randint(40, 65)

    # Extract classified route from runner events
    classified_route = "CHAT"
    if run_workflow_path:
        for event in events:
            if getattr(event, "actions", None) and getattr(event.actions, "route", None):
                classified_route = event.actions.route
                break

    # Build response dictionary
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
        # Backward compatibility support
        "gpu_load": gpu_load,
        "cpu_load": cpu_load,
        "ram_load": ram_load,
        "disk_load": disk_load,
    }

    # Strict schema validation: raise HTTPException with status_code 422 if invalid
    try:
        validated_response = JarvisResponse(**response_dict)
    except ValidationError as e:
        logger.error(f"Response validation failed: {e}")
        raise HTTPException(status_code=422, detail=f"Response validation failed: {str(e)}")

    return validated_response


# --- REMINDERS API ENDPOINTS ---
from app.reminder_store import load_reminders, add_reminder, update_reminder, delete_reminder

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
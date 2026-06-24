import pytest
import os
import json
import shutil
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agent import workflow_app
from app.reminder_store import REMINDERS_FILE, DATA_DIR

@pytest.fixture(autouse=True)
def setup_teardown_reminders():
    # Setup temporary store
    backup_exists = os.path.exists(REMINDERS_FILE)
    if backup_exists:
        backup_path = REMINDERS_FILE + ".bak"
        shutil.copy2(REMINDERS_FILE, backup_path)
    
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)
        
    yield
    
    if backup_exists:
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, REMINDERS_FILE)
            os.remove(backup_path)
    else:
        if os.path.exists(REMINDERS_FILE):
            os.remove(REMINDERS_FILE)

@pytest.mark.asyncio
async def test_reminder_workflow_integration() -> None:
    """Verifies that reminder requests trigger the reminder workflow node and persist to disk."""
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="workflow_app")
    runner = Runner(app=workflow_app, session_service=session_service)

    message = types.Content(
        role="user", parts=[types.Part.from_text(text="Remind me to take Vitamin D every Sunday at 9 AM")]
    )

    events = []
    async for event in runner.run_async(user_id="test_user", session_id=session.id, new_message=message):
        events.append(event)
        
    assert len(events) > 0

    # Verify that the reminder is in the session state
    updated_session = await session_service.get_session(
        session_id=session.id,
        app_name="workflow_app",
        user_id="test_user"
    )
    
    state = updated_session.state
    assert state.get("reminderCreated") is True
    created_rem = state.get("created_reminder")
    assert created_rem is not None
    assert created_rem["title"] == "take Vitamin D"
    assert created_rem["type"] == "weekly"
    assert created_rem["time"] == "09:00"
    assert created_rem["day"] == "Sunday"

    # Verify response message
    final_output = ""
    for e in events:
        if e.output:
            final_output = e.output
            
    assert "agenda updated successfully" in final_output.lower() or "buffer updated successfully" in final_output.lower()
    assert "take Vitamin D" in final_output

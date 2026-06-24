import pytest
import os
import json
import shutil
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agent import workflow_app
from app.memory_store import MEMORY_FILE, DATA_DIR, add_fact

@pytest.fixture(autouse=True)
def setup_teardown_memory():
    # Setup temporary store
    backup_exists = os.path.exists(MEMORY_FILE)
    if backup_exists:
        backup_path = MEMORY_FILE + ".bak"
        shutil.copy2(MEMORY_FILE, backup_path)
    
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump({"facts": []}, f)
        
    yield
    
    if backup_exists:
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, MEMORY_FILE)
            os.remove(backup_path)
    else:
        if os.path.exists(MEMORY_FILE):
            os.remove(MEMORY_FILE)

@pytest.mark.asyncio
async def test_memory_store_workflow_integration() -> None:
    """Verifies that storing a fact triggers MEMORY_STORE and saves it to state and disk."""
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="workflow_app")
    runner = Runner(app=workflow_app, session_service=session_service)

    # Store a fact
    message = types.Content(
        role="user", parts=[types.Part.from_text(text="Remember that my capstone deadline is July 6")]
    )

    events = []
    async for event in runner.run_async(user_id="test_user", session_id=session.id, new_message=message):
        events.append(event)
        
    assert len(events) > 0

    updated_session = await session_service.get_session(
        session_id=session.id,
        app_name="workflow_app",
        user_id="test_user"
    )
    
    state = updated_session.state
    assert state.get("memoryStored") is True
    assert "capstone deadline is July 6" in state.get("stored_fact")

    final_output = ""
    for e in events:
        if e.output:
            final_output = e.output
            
    assert "memory stored" in final_output.lower() or "noted" in final_output.lower() or "remember" in final_output.lower()
    assert "capstone deadline is July 6" in final_output


@pytest.mark.asyncio
async def test_memory_recall_workflow_integration_high_confidence() -> None:
    """Verifies that recalling a fact with high confidence (>=0.80) answers normally."""
    add_fact("capstone deadline is July 6")

    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="workflow_app")
    runner = Runner(app=workflow_app, session_service=session_service)

    message = types.Content(
        role="user", parts=[types.Part.from_text(text="When is my capstone deadline?")]
    )

    events = []
    async for event in runner.run_async(user_id="test_user", session_id=session.id, new_message=message):
        events.append(event)
        
    assert len(events) > 0

    updated_session = await session_service.get_session(
        session_id=session.id,
        app_name="workflow_app",
        user_id="test_user"
    )
    
    state = updated_session.state
    assert state.get("memoryRecalled") is True
    recalled = state.get("recalled_fact")
    assert recalled is not None
    assert recalled["confidence"] >= 0.80

    final_output = ""
    for e in events:
        if e.output:
            final_output = e.output
            
    assert "capstone deadline is July 6" in final_output
    assert "not entirely sure" not in final_output.lower()


@pytest.mark.asyncio
async def test_memory_recall_workflow_integration_medium_confidence() -> None:
    """Verifies that recalling a fact with medium confidence (0.50-0.80) answers with uncertainty wording."""
    add_fact("capstone deadline is July 6")

    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="workflow_app")
    runner = Runner(app=workflow_app, session_service=session_service)

    message = types.Content(
        role="user", parts=[types.Part.from_text(text="what was that deadline of the capstone project detail check?")]
    )

    events = []
    async for event in runner.run_async(user_id="test_user", session_id=session.id, new_message=message):
        events.append(event)
        
    assert len(events) > 0

    updated_session = await session_service.get_session(
        session_id=session.id,
        app_name="workflow_app",
        user_id="test_user"
    )
    
    state = updated_session.state
    recalled = state.get("recalled_fact")
    assert recalled is not None
    assert 0.50 <= recalled["confidence"] < 0.80

    final_output = ""
    for e in events:
        if e.output:
            final_output = e.output
            
    assert "not entirely sure" in final_output.lower() or "recall" in final_output.lower()
    assert "capstone deadline is July 6" in final_output


@pytest.mark.asyncio
async def test_memory_recall_workflow_integration_low_confidence() -> None:
    """Verifies that recalling a fact with low confidence (<0.50) returns 'I don't have a reliable memory for that.'"""
    add_fact("capstone deadline is July 6")

    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="workflow_app")
    runner = Runner(app=workflow_app, session_service=session_service)

    message = types.Content(
        role="user", parts=[types.Part.from_text(text="When is my space mission launch?")]
    )

    events = []
    async for event in runner.run_async(user_id="test_user", session_id=session.id, new_message=message):
        events.append(event)
        
    assert len(events) > 0

    updated_session = await session_service.get_session(
        session_id=session.id,
        app_name="workflow_app",
        user_id="test_user"
    )
    
    state = updated_session.state
    recalled = state.get("recalled_fact")
    assert recalled is not None
    assert recalled["confidence"] < 0.50

    final_output = ""
    for e in events:
        if e.output:
            final_output = e.output
            
    assert "don't have a reliable memory" in final_output.lower()

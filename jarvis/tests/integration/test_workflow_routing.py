import pytest
import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agent import workflow_app

@pytest.mark.asyncio
async def test_workflow_routing_system() -> None:
    """Verifies that prompts for system diagnostics trigger the telemetry node and save stats to state."""
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="workflow_app")
    runner = Runner(app=workflow_app, session_service=session_service)

    message = types.Content(
        role="user", parts=[types.Part.from_text(text="check system diagnostics")]
    )

    events = []
    async for event in runner.run_async(user_id="test_user", session_id=session.id, new_message=message):
        events.append(event)
        
    assert len(events) > 0

    # Fetch updated session state
    updated_session = await session_service.get_session(
        session_id=session.id,
        app_name="workflow_app",
        user_id="test_user"
    )
    
    # Assert telemetry stats are saved in state
    state = updated_session.state
    assert "cpuLoad" in state
    assert "ramLoad" in state
    assert "diskLoad" in state
    assert "gpuLoad" in state
    assert isinstance(state["cpuLoad"], int)

    # Check the final output contains system diagnostics report
    final_output = ""
    for e in events:
        if e.output:
            final_output = e.output
            
    assert "System Diagnostics Report" in final_output


@pytest.mark.asyncio
async def test_workflow_routing_chat() -> None:
    """Verifies that general conversation requests bypass the telemetry node."""
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="workflow_app")
    runner = Runner(app=workflow_app, session_service=session_service)

    message = types.Content(
        role="user", parts=[types.Part.from_text(text="hello operational companion")]
    )

    events = []
    async for event in runner.run_async(user_id="test_user", session_id=session.id, new_message=message):
        events.append(event)
        
    assert len(events) > 0

    # Fetch updated session state
    updated_session = await session_service.get_session(
        session_id=session.id,
        app_name="workflow_app",
        user_id="test_user"
    )
    
    # Assert telemetry stats are NOT in state
    state = updated_session.state
    assert "cpuLoad" not in state

    final_output = ""
    for e in events:
        if e.output:
            final_output = e.output
            
    assert "JARVIS online" in final_output or "Response" in final_output


@pytest.mark.asyncio
async def test_workflow_routing_reminder() -> None:
    """Verifies that reminder requests route correctly and output a reminder confirmation."""
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="workflow_app")
    runner = Runner(app=workflow_app, session_service=session_service)

    message = types.Content(
        role="user", parts=[types.Part.from_text(text="remind me to write code at 10 PM")]
    )

    events = []
    async for event in runner.run_async(user_id="test_user", session_id=session.id, new_message=message):
        events.append(event)
        
    assert len(events) > 0

    final_output = ""
    for e in events:
        if e.output:
            final_output = e.output
            
    assert "reminder parsed" in final_output.lower() or "agenda" in final_output.lower() or "temporal buffer" in final_output.lower()


@pytest.mark.asyncio
async def test_workflow_routing_mission() -> None:
    """Verifies that mission requests route correctly and initialize a deconstructed checklist."""
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="workflow_app")
    runner = Runner(app=workflow_app, session_service=session_service)

    message = types.Content(
        role="user", parts=[types.Part.from_text(text="Help me finish my capstone")]
    )

    events = []
    async for event in runner.run_async(user_id="test_user", session_id=session.id, new_message=message):
        events.append(event)
        
    assert len(events) > 0

    # Fetch updated session state
    updated_session = await session_service.get_session(
        session_id=session.id,
        app_name="workflow_app",
        user_id="test_user"
    )
    
    state = updated_session.state
    assert "created_mission" in state
    assert state["missionCreated"] is True
    
    final_output = ""
    for e in events:
        if e.output:
            final_output = e.output
            
    assert "mission" in final_output.lower() or "capstone" in final_output.lower()

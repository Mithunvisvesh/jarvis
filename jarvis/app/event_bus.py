import time
from typing import Dict, Any, List, Callable
from pydantic import BaseModel, Field

class EventPayload(BaseModel):
    request_id: str
    workflow_id: str
    timestamp: float = Field(default_factory=time.time)
    data: Dict[str, Any] = Field(default_factory=dict)

class AgentEvent(BaseModel):
    event_type: str  # THINKING, ROUTING, INTENT_DETECTED, TOOL_START, TOOL_COMPLETE, etc.
    sender: str      # orchestrator, ui_agent, memory_agent, reminder_agent, etc.
    payload: EventPayload

class EventBus:
    """A strongly-typed in-memory asynchronous Event Bus for Agent-to-Agent collaboration."""
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[AgentEvent], None]]] = {}

    def subscribe(self, event_type: str, callback: Callable[[AgentEvent], None]):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    def publish(self, event: AgentEvent):
        # Validate event payload using Pydantic
        # If payload is valid, dispatch to subscribers
        event_type = event.event_type
        if event_type in self._subscribers:
            for callback in self._subscribers[event_type]:
                try:
                    callback(event)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Error in subscriber callback: {e}")

# Global event bus instance for the application
global_event_bus = EventBus()

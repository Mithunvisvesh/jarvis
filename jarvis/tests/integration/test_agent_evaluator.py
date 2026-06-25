import pytest
from fastapi.testclient import TestClient
from server import app

class AgentEvaluator:
    def __init__(self, client: TestClient):
        self.client = client

    def evaluate_route(self, prompt: str) -> str:
        """Sends a query to the agent and returns the resolved route."""
        response = self.client.post("/api/chat", json={
            "prompt": prompt,
            "user_id": "eval_test_user",
            "session_id": "eval_test_session"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("route", "")
        return ""

def test_agent_evaluator_route_is_valid():
    """Honest evaluation test verifying that the route returned by the agent is a valid string."""
    client = TestClient(app)
    evaluator = AgentEvaluator(client)
    
    # Test a simple chat prompt
    route = evaluator.evaluate_route("hello JARVIS, how are you today?")
    
    # Assert that the route is a valid string and matches one of the defined routes
    assert isinstance(route, str)
    assert route in {"SYSTEM", "REMINDER", "MEMORY_STORE", "MEMORY_RECALL", "MISSION", "CHAT"}

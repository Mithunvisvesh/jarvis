import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from server import app, JarvisResponse

client = TestClient(app)

def test_telemetry_values_are_integers():
    """Verifies that the /api/chat system diagnostics endpoint returns telemetry values as integers."""
    response = client.post("/api/chat", json={
        "prompt": "check system diagnostics",
        "user_id": "test_user_int",
        "session_id": "test_session_int"
    })
    assert response.status_code == 200
    data = response.json()
    
    # Assert they are present and are integers
    assert isinstance(data["cpuLoad"], int)
    assert isinstance(data["ramLoad"], int)
    assert isinstance(data["diskLoad"], int)
    assert isinstance(data["gpuLoad"], int)
    assert isinstance(data["temperature"], int)

def test_missing_keys_cause_failures():
    """Verifies that missing required keys in JarvisResponse validation raise a ValidationError."""
    # cpuLoad is missing
    invalid_payload = {
        "status": "success",
        "message": "Diagnostics completed.",
        "ramLoad": 80,
        "diskLoad": 90,
        "gpuLoad": 10,
        "route": "SYSTEM"
    }
    with pytest.raises(ValidationError):
        JarvisResponse(**invalid_payload)

def test_malformed_input_payload_rejected():
    """Verifies that a malformed request (e.g. missing required 'prompt' key) is rejected with HTTP 422."""
    response = client.post("/api/chat", json={
        "user_id": "test_user_malformed",
        "session_id": "test_session_malformed"
        # 'prompt' is missing
    })
    assert response.status_code == 422

def test_endpoint_catches_response_validation_failure():
    """Verifies that if response dictionary fails Pydantic schema validation, endpoint returns HTTP 422."""
    import unittest.mock
    with unittest.mock.patch("server.random.randint", return_value="string_instead_of_int"):
        response = client.post("/api/chat", json={
            "prompt": "hello companion",
            "user_id": "test_user_mock",
            "session_id": "test_session_mock"
        })
        # It should return HTTP 422 because of our try...except ValidationError handler in server.py
        assert response.status_code == 422
        assert "Response validation failed" in response.json()["detail"]

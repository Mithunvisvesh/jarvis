import os
import json
import shutil
import pytest
from fastapi.testclient import TestClient
from server import app
from app.memory_store import MEMORY_FILE, DATA_DIR, add_fact
from app.reminder_store import REMINDERS_FILE, add_reminder

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_teardown_databases():
    # Backup existing databases
    mem_backup_exists = os.path.exists(MEMORY_FILE)
    if mem_backup_exists:
        mem_backup_path = MEMORY_FILE + ".bak"
        shutil.copy2(MEMORY_FILE, mem_backup_path)
    
    rem_backup_exists = os.path.exists(REMINDERS_FILE)
    if rem_backup_exists:
        rem_backup_path = REMINDERS_FILE + ".bak"
        shutil.copy2(REMINDERS_FILE, rem_backup_path)

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump({"facts": []}, f)
    with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

    yield

    # Restore backups
    if mem_backup_exists:
        if os.path.exists(mem_backup_path):
            shutil.copy2(mem_backup_path, MEMORY_FILE)
            os.remove(mem_backup_path)
    else:
        if os.path.exists(MEMORY_FILE):
            os.remove(MEMORY_FILE)

    if rem_backup_exists:
        if os.path.exists(rem_backup_path):
            shutil.copy2(rem_backup_path, REMINDERS_FILE)
            os.remove(rem_backup_path)
    else:
        if os.path.exists(REMINDERS_FILE):
            os.remove(REMINDERS_FILE)


def test_get_and_delete_memory_endpoints():
    # 1. Verify initially empty
    response = client.get("/api/memory")
    assert response.status_code == 200
    data = response.json()
    assert len(data["facts"]) == 0

    # 2. Add a fact
    fact = add_fact("Google DeepMind created Antigravity")
    
    # 3. Verify get retrieves it
    response = client.get("/api/memory")
    assert response.status_code == 200
    data = response.json()
    assert len(data["facts"]) == 1
    assert data["facts"][0]["fact"] == "Google DeepMind created Antigravity"
    assert data["facts"][0]["id"] == fact["id"]

    # 4. Delete the fact
    response = client.delete(f"/api/memory/{fact['id']}")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 5. Verify deleted fact is gone
    response = client.get("/api/memory")
    assert response.status_code == 200
    assert len(response.json()["facts"]) == 0

    # 6. Delete non-existent fact returns HTTP 404
    response = client.delete("/api/memory/non-existent-id")
    assert response.status_code == 404


def test_get_due_reminders_endpoint():
    # 1. Add a reminder
    rem = add_reminder(
        title="submit capstone",
        rtype="one-time",
        time="09:00",
        day="July 6"
    )

    # 2. Query due reminders with a matching date
    response = client.get("/api/reminders/due?current_dt=2026-07-06T09:00:00")
    assert response.status_code == 200
    due = response.json()
    assert len(due) == 1
    assert due[0]["id"] == rem["id"]
    assert due[0]["title"] == "submit capstone"

    # 3. Query due reminders with non-matching date/time
    response = client.get("/api/reminders/due?current_dt=2026-07-06T10:00:00")
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_export_diagnostics_endpoint():
    # 1. Add some data
    add_fact("Antigravity is amazing")
    add_reminder("submit report", "daily", "08:30")

    # 2. Export JSON
    response = client.get("/api/diagnostics/export?format=json")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    assert "attachment; filename=jarvis_diagnostics.json" in response.headers["content-disposition"]
    data = response.json()
    assert data["system_status"] == "ONLINE"
    assert len(data["memories"]) == 1
    assert len(data["reminders"]) == 1

    # 3. Export HTML/PDF
    response = client.get("/api/diagnostics/export?format=html")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "JARVIS CORE DIAGNOSTICS REPORT" in response.text

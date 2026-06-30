import os
import json
import uuid
from datetime import datetime
from app.memory_store import ensure_data_dir, FACTS_FILE, MISSIONS_FILE
from app.reminder_store import REMINDERS_FILE

def load_demo_data() -> dict:
    # 1. Call ensure_data_dir() from app.memory_store before writing
    ensure_data_dir()
    
    now_iso = datetime.now().isoformat()
    
    # 2. Facts data (6 total)
    facts_texts = [
        "My name is Mithun. I am a 4th-semester B.Tech Computer Science student.",
        "I am building JARVIS as my Google ADK 2.0 capstone project, due July 6, 2026.",
        "JARVIS uses a GraphAgent topology with BackgroundDataAgent and UIFrontendAgent communicating over an A2A event bus.",
        "I prefer concise technical explanations and appreciate proactive suggestions.",
        "I previously built ShieldGig, an AI-powered parametric insurance platform.",
        "My capstone supervisor is Dr. Ramesh. The project must demonstrate MCP, A2A, and ADK 2.0."
    ]
    facts_list = []
    for f in facts_texts:
        facts_list.append({
            "id": str(uuid.uuid4()),
            "fact": f,
            "created_at": now_iso,
            "status": "created"
        })
    facts_payload = {"facts": facts_list}
    
    # 3. Missions data (1 total)
    tasks_list = [
        "Define ADK 2.0 GraphAgent topology and agent node roles",
        "Implement BackgroundDataAgent and UIFrontendAgent with A2A event bus",
        "Integrate MCP stdio subprocess transport for system telemetry",
        "Build persistent memory system with deduplication (85% threshold)",
        "Design and implement Mission system with Gemini task deconstruction",
        "Complete UI redesign: sender labels, action cards, sidebar navigation",
        "Record competition demo video",
        "Submit to Kaggle by July 6, 2026"
    ]
    structured_tasks = []
    for i, t in enumerate(tasks_list):
        completed = True if i < 6 else False
        structured_tasks.append({
            "id": str(uuid.uuid4()),
            "text": t,
            "completed": completed
        })
    
    missions_payload = [
        {
            "id": str(uuid.uuid4()),
            "title": "Mission: JARVIS Capstone Submission",
            "goal": "Complete and submit the JARVIS AI Operating Companion capstone project by July 6, 2026",
            "tasks": structured_tasks,
            "created_at": now_iso,
            "status": "active"
        }
    ]
    
    # 4. Reminders data (3 total)
    reminders_data = [
        {
            "title": "Record JARVIS demo video",
            "time": "02:00 PM",
            "type": "one-time",
            "day": None,
            "completed": False
        },
        {
            "title": "Final submission review",
            "time": "10:00 AM",
            "type": "one-time",
            "day": None,
            "completed": False
        },
        {
            "title": "Submit to Kaggle",
            "time": "11:59 PM",
            "type": "one-time",
            "day": None,
            "completed": False
        }
    ]
    reminders_payload = []
    for r in reminders_data:
        reminders_payload.append({
            "id": str(uuid.uuid4()),
            "title": r["title"],
            "time": r["time"],
            "type": r["type"],
            "day": r["day"],
            "completed": r["completed"],
            "created_at": now_iso
        })
        
    # Write to files
    with open(FACTS_FILE, "w", encoding="utf-8") as f:
        json.dump(facts_payload, f, indent=2, ensure_ascii=False)
        
    with open(MISSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(missions_payload, f, indent=2, ensure_ascii=False)
        
    with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(reminders_payload, f, indent=2, ensure_ascii=False)
        
    return {
        "status": "success",
        "loaded": {
            "facts": len(facts_list),
            "missions": len(missions_payload),
            "reminders": len(reminders_payload)
        }
    }

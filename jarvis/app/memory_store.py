import os
import json
import uuid
import re
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
FACTS_FILE = os.path.join(DATA_DIR, "facts.json")
MISSIONS_FILE = os.path.join(DATA_DIR, "missions.json")
MEMORY_FILE = FACTS_FILE # Alias for backwards compatibility in unit/integration tests

from difflib import SequenceMatcher

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(FACTS_FILE):
        with open(FACTS_FILE, "w", encoding="utf-8") as f:
            json.dump({"facts": []}, f)
    if not os.path.exists(MISSIONS_FILE):
        with open(MISSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)

def load_memory() -> dict:
    ensure_data_dir()
    try:
        with open(FACTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"facts": []}

def save_memory(data: dict):
    ensure_data_dir()
    with open(FACTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def add_fact(fact_text: str) -> dict:
    data = load_memory()
    
    # Pre-storage similarity check using difflib.SequenceMatcher
    incoming_clean = clean_text_for_matching(fact_text)
    incoming_sorted = " ".join(sorted(incoming_clean.split())) if incoming_clean else fact_text.lower().strip()
    
    for f in data.get("facts", []):
        existing_clean = clean_text_for_matching(f["fact"])
        existing_sorted = " ".join(sorted(existing_clean.split())) if existing_clean else f["fact"].lower().strip()
        
        score = SequenceMatcher(None, incoming_sorted, existing_sorted).ratio()
        if score >= 0.85:
            # Update the existing memory timestamp
            f["created_at"] = datetime.now().isoformat()
            save_memory(data)
            f_copy = dict(f)
            f_copy["status"] = "acknowledged"
            return f_copy
            
    new_fact = {
        "id": str(uuid.uuid4()),
        "fact": fact_text.strip(),
        "created_at": datetime.now().isoformat()
    }
    data["facts"].append(new_fact)
    save_memory(data)
    new_fact_copy = dict(new_fact)
    new_fact_copy["status"] = "created"
    return new_fact_copy

def clean_text_for_matching(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    words = text.split()
    stop_words = {"when", "is", "my", "what", "who", "where", "to", "the", "a", "an", "do", "you", "remember", "that", "at", "on", "was", "how", "details", "of", "check"}
    filtered_words = [w for w in words if w not in stop_words]
    return " ".join(filtered_words)

def recall_facts(query_text: str) -> dict:
    """Returns the best matching stored fact and a confidence score between 0.0 and 1.0."""
    data = load_memory()
    facts = data.get("facts", [])
    if not facts:
        return {"fact": None, "confidence": 0.0}
        
    query_cleaned = clean_text_for_matching(query_text)
    if not query_cleaned:
        return {"fact": None, "confidence": 0.0}
        
    query_words_sorted = " ".join(sorted(query_cleaned.split()))
    
    best_item = None
    best_score = 0.0
    
    for item in facts:
        fact_text = item["fact"]
        fact_cleaned = clean_text_for_matching(fact_text)
        
        if not fact_cleaned:
            continue
            
        fact_words_sorted = " ".join(sorted(fact_cleaned.split()))
        score = SequenceMatcher(None, query_words_sorted, fact_words_sorted).ratio()
        
        if score > best_score:
            best_score = score
            best_item = item
            
    if best_score < 0.50 or not best_item:
        return {
            "fact": None,
            "confidence": 0.0
        }
        
    return {
        "fact": best_item["fact"],
        "confidence": round(best_score, 2),
        "created_at": best_item.get("created_at")
    }

def delete_fact(fact_id: str) -> bool:
    """Deletes a fact by its unique ID. Returns True if found and deleted, False otherwise."""
    data = load_memory()
    facts = data.get("facts", [])
    initial_len = len(facts)
    new_facts = [f for f in facts if f["id"] != fact_id]
    if len(new_facts) == initial_len:
        return False
    data["facts"] = new_facts
    save_memory(data)
    return True


def load_missions() -> list:
    """Loads all missions from missions.json."""
    ensure_data_dir()
    try:
        with open(MISSIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_missions(missions: list):
    """Saves missions back to missions.json."""
    ensure_data_dir()
    with open(MISSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(missions, f, indent=2, ensure_ascii=False)


def derive_mission_title(goal: str) -> str:
    """Derives a concise capitalized title starting with 'Mission: ' from the user's goal."""
    cleaned = goal.strip()
    if "capstone" in cleaned.lower():
        return "Mission: JARVIS Capstone"
    
    # Remove common goal prefixes and verbs
    cleaned = re.sub(r'^(help me |please |i want to |i need to |let\'s )', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'^(finish |complete |do |work on |build |make |deploy |create |setup |run |test |write |implement |add |fix |update )', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'^(my |the |a |an |some )', '', cleaned, flags=re.IGNORECASE)
    
    words = cleaned.split()
    if len(words) > 4:
        capitalized = " ".join(w.capitalize() for w in words[:4])
        return f"Mission: {capitalized}..."
    else:
        capitalized = " ".join(w.capitalize() for w in words)
        return f"Mission: {capitalized}"


def add_mission(title: str, goal: str, tasks: list) -> dict:
    """Creates a new mission in missions.json and returns it."""
    missions = load_missions()
    
    # Check if a mission with the same title already exists
    for m in missions:
        if m["title"].lower() == title.lower():
            return m
            
    structured_tasks = []
    for t in tasks:
        structured_tasks.append({
            "id": str(uuid.uuid4()),
            "text": t.strip(),
            "completed": False
        })
        
    new_mission = {
        "id": str(uuid.uuid4()),
        "title": title.strip(),
        "goal": goal.strip(),
        "tasks": structured_tasks,
        "created_at": datetime.now().isoformat()
    }
    missions.append(new_mission)
    save_missions(missions)
    return new_mission


def toggle_mission_task(mission_id: str, task_id: str) -> bool:
    """Toggles the completion status of a task inside a mission. Returns True if updated."""
    missions = load_missions()
    updated = False
    for m in missions:
        if m["id"] == mission_id:
            for t in m["tasks"]:
                if t["id"] == task_id:
                    t["completed"] = not t["completed"]
                    updated = True
                    break
            if updated:
                break
    if updated:
        save_missions(missions)
    return updated


def delete_mission(mission_id: str) -> bool:
    """Deletes a mission by ID. Returns True if deleted."""
    missions = load_missions()
    initial_len = len(missions)
    new_missions = [m for m in missions if m["id"] != mission_id]
    if len(new_missions) == initial_len:
        return False
    save_missions(new_missions)
    return True


def clear_memory_store():
    ensure_data_dir()
    with open(FACTS_FILE, "w", encoding="utf-8") as f:
        json.dump({"facts": []}, f)
    with open(MISSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)


def clear_facts():
    ensure_data_dir()
    with open(FACTS_FILE, "w", encoding="utf-8") as f:
        json.dump({"facts": []}, f)


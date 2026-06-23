import os
import json
import uuid
import re
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
MEMORY_FILE = os.path.join(DATA_DIR, "memory.json")

from difflib import SequenceMatcher

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump({"facts": []}, f)

def load_memory() -> dict:
    ensure_data_dir()
    try:
        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"facts": []}

def save_memory(data: dict):
    ensure_data_dir()
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def add_fact(fact_text: str) -> dict:
    data = load_memory()
    new_fact = {
        "id": str(uuid.uuid4()),
        "fact": fact_text.strip(),
        "created_at": datetime.now().isoformat()
    }
    data["facts"].append(new_fact)
    save_memory(data)
    return new_fact

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
    
    best_fact = None
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
            best_fact = fact_text
            
    if best_score < 0.50:
        return {
            "fact": None,
            "confidence": 0.0
        }
        
    return {
        "fact": best_fact,
        "confidence": round(best_score, 2)
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


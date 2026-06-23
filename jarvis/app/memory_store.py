import os
import json
import uuid
import re
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
MEMORY_FILE = os.path.join(DATA_DIR, "memory.json")

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

def clean_words(text: str) -> set:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    words = set(text.split())
    stop_words = {"when", "is", "my", "what", "who", "where", "to", "the", "a", "an", "do", "you", "remember", "that", "at", "on", "was", "how", "details", "of", "check"}
    return words - stop_words

def recall_facts(query_text: str) -> dict:
    """Returns the best matching stored fact and a confidence score between 0.0 and 1.0."""
    data = load_memory()
    facts = data.get("facts", [])
    if not facts:
        return {"fact": None, "confidence": 0.0}
        
    query_words = clean_words(query_text)
    if not query_words:
        return {"fact": None, "confidence": 0.0}
        
    best_fact = None
    best_score = 0.0
    
    for item in facts:
        fact_text = item["fact"]
        fact_words = clean_words(fact_text)
        
        if not fact_words:
            continue
            
        intersection = query_words & fact_words
        score = len(intersection) / len(query_words)
        
        if score > best_score:
            best_score = score
            best_fact = fact_text
            
    return {
        "fact": best_fact,
        "confidence": round(best_score, 2)
    }

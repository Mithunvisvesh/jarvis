import os
import json
import uuid
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
REMINDERS_FILE = os.path.join(DATA_DIR, "reminders.json")

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(REMINDERS_FILE):
        with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)

def load_reminders() -> list:
    ensure_data_dir()
    try:
        with open(REMINDERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_reminders(reminders: list):
    ensure_data_dir()
    with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(reminders, f, indent=2, ensure_ascii=False)

def add_reminder(title: str, rtype: str, time: str, day: str = None) -> dict:
    reminders = load_reminders()
    new_rem = {
        "id": str(uuid.uuid4()),
        "title": title,
        "type": rtype,
        "time": time,
        "day": day,
        "created_at": datetime.now().isoformat(),
        "status": "pending"
    }
    reminders.append(new_rem)
    save_reminders(reminders)
    return new_rem

def update_reminder(reminder_id: str, updates: dict) -> dict | None:
    reminders = load_reminders()
    for rem in reminders:
        if rem["id"] == reminder_id:
            rem.update(updates)
            save_reminders(reminders)
            return rem
    return None

def delete_reminder(reminder_id: str) -> bool:
    reminders = load_reminders()
    initial_len = len(reminders)
    reminders = [rem for rem in reminders if rem["id"] != reminder_id]
    if len(reminders) < initial_len:
        save_reminders(reminders)
        return True
    return False

def get_due_reminders(current_dt=None) -> list:
    """Returns active pending reminders whose scheduled time matches the current system time."""
    if current_dt is None:
        current_dt = datetime.now()
    reminders = load_reminders()
    due = []
    
    current_time_str = current_dt.strftime("%H:%M")
    current_day_str = current_dt.strftime("%A")
    current_date_str = current_dt.strftime("%B %d")
    current_date_str_clean = current_date_str.replace(" 0", " ")  # Normalize "July 06" to "July 6"
    
    for rem in reminders:
        if rem.get("status") == "completed":
            continue
            
        rem_time = rem.get("time")
        if rem_time != current_time_str:
            continue
            
        rtype = rem.get("type")
        day = rem.get("day")
        
        if rtype == "daily":
            due.append(rem)
        elif rtype == "weekly":
            if day == current_day_str:
                due.append(rem)
        elif rtype == "one-time":
            if not day:
                try:
                    created_dt = datetime.fromisoformat(rem.get("created_at"))
                    if created_dt.date() == current_dt.date():
                        due.append(rem)
                except Exception:
                    due.append(rem)
            elif day.lower() == "tomorrow":
                try:
                    created_dt = datetime.fromisoformat(rem.get("created_at"))
                    if (current_dt.date() - created_dt.date()).days == 1:
                        due.append(rem)
                except Exception:
                    pass
            else:
                clean_day = day.replace(" 0", " ")
                if clean_day == current_date_str_clean:
                    due.append(rem)
                    
    return due


def clear_reminders():
    ensure_data_dir()
    with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

import os
import json
import time
from typing import Dict, Any, List

LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
TRACES_FILE = os.path.join(LOGS_DIR, "traces.json")

def ensure_logs_dir():
    os.makedirs(LOGS_DIR, exist_ok=True)
    if not os.path.exists(TRACES_FILE):
        with open(TRACES_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)

def load_traces() -> List[Dict[str, Any]]:
    ensure_logs_dir()
    try:
        with open(TRACES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_traces(traces: List[Dict[str, Any]]):
    ensure_logs_dir()
    with open(TRACES_FILE, "w", encoding="utf-8") as f:
        json.dump(traces, f, indent=2, ensure_ascii=False)

class TraceManager:
    """Manages workflow traces and logs transition histories."""
    def __init__(self):
        self.active_traces: Dict[str, Dict[str, Any]] = {}

    def start_trace(self, workflow_id: str, request_id: str, prompt: str):
        self.active_traces[workflow_id] = {
            "workflow_id": workflow_id,
            "request_id": request_id,
            "prompt": prompt,
            "start_time": time.time(),
            "duration": 0.0,
            "events": []
        }

    def record_event(self, workflow_id: str, event_type: str, sender: str, data: Dict[str, Any] = None):
        if workflow_id in self.active_traces:
            event_log = {
                "event_type": event_type,
                "sender": sender,
                "timestamp": time.time(),
                "data": data or {}
            }
            self.active_traces[workflow_id]["events"].append(event_log)

    def complete_trace(self, workflow_id: str):
        if workflow_id in self.active_traces:
            trace = self.active_traces[workflow_id]
            trace["duration"] = round(time.time() - trace["start_time"], 3)
            
            # Persist to traces file
            traces = load_traces()
            # Limit stored traces to 50
            traces = [trace] + traces[:49]
            save_traces(traces)
            
            del self.active_traces[workflow_id]

# Global trace manager instance
trace_manager = TraceManager()

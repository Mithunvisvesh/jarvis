import sys
import json
from datetime import datetime
from tools.telemetry_server import get_system_stats
from app.memory_store import load_memory
from app.reminder_store import load_reminders, get_due_reminders

def handle_mcp_request(request: dict) -> dict:
    """Processes an incoming JSON-RPC 2.0 MCP request and returns a JSON-RPC response."""
    req_id = request.get("id")
    method = request.get("method")
    params = request.get("params", {})
    
    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "result": {
                "tools": [
                    {"name": "get_system_stats", "description": "Gathers system CPU, RAM, Disk, and GPU stats."},
                    {"name": "get_memories", "description": "Gathers stored semantic facts."},
                    {"name": "get_reminders", "description": "Gathers all scheduled reminders."},
                    {"name": "get_due_reminders", "description": "Gathers due pending reminders."}
                ]
            },
            "id": req_id
        }
    
    elif method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments", {})
        
        try:
            if tool_name == "get_system_stats":
                result = get_system_stats()
            elif tool_name == "get_memories":
                result = load_memory()
            elif tool_name == "get_reminders":
                result = load_reminders()
            elif tool_name == "get_due_reminders":
                dt_str = args.get("current_dt")
                dt = datetime.fromisoformat(dt_str) if dt_str else None
                result = get_due_reminders(dt)
            else:
                return {
                    "jsonrpc": "2.0",
                    "error": {"code": -32601, "message": f"Tool not found: {tool_name}"},
                    "id": req_id
                }
            
            return {
                "jsonrpc": "2.0",
                "result": result,
                "id": req_id
            }
            
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "error": {"code": -32603, "message": str(e)},
                "id": req_id
            }
            
    return {
        "jsonrpc": "2.0",
        "error": {"code": -32600, "message": "Invalid request or method"},
        "id": req_id
    }

def run_stdio_server():
    """Starts the standard input/output loop for stdio-based MCP clients."""
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            req = json.loads(line)
            res = handle_mcp_request(req)
            print(json.dumps(res), flush=True)
        except Exception as e:
            err_res = {
                "jsonrpc": "2.0",
                "error": {"code": -32700, "message": str(e)},
                "id": None
            }
            print(json.dumps(err_res), flush=True)

if __name__ == "__main__":
    run_stdio_server()

# STRIDE Threat Model — Project JARVIS

This threat model outlines the security risks and mitigations identified for the JARVIS agent architecture, classified according to the STRIDE framework.

---

## 1. System Boundaries & Data Flow

JARVIS operates as a multi-agent system exposing a FastAPI backend and a React frontend. The data flows:
1. **User input** via SSE stream `/api/chat/stream` or POST `/api/chat`.
2. **Orchestrator routing** to specialized agents (Telemetry, Memory, Reminder).
3. **MCP Tool execution** invoking local system diagnostics, file-system edits (`memory.json`, `reminders.json`), or external API queries.
4. **Structured Tracing** recording agent logs to `logs/traces.json`.

---

## 2. STRIDE Analysis & Mitigations

### Spoofing (Identity)
* **Threat**: An attacker spoofs a session ID or user ID to access another user's reminders, memories, or system diagnostic stats.
* **Mitigation**: User sessions are isolated on the backend using strict `user_id` and `session_id` keys in `InMemorySessionService`. Files are indexed in private sub-paths or scoped JSON entries.

### Tampering (Data Modification)
* **Threat**: Malicious user prompts inject instructions to delete all reminders or overwrite system configurations via tool execution.
* **Mitigation**: Memory and reminder tool execution is tightly constrained. The Memory Agent uses standard file-writing methods and only deletes facts matching validated UUIDs via `delete_fact`. Reminders are updated via structured schemas only.

### Repudiation (Action Denial)
* **Threat**: A user or background agent triggers system calls or memory updates, and there is no record of which component initiated the action.
* **Mitigation**: We implement **Trace Observability** (`app/trace_store.py`). Every single orchestrator routing decision, tool invocation, memory storage event, and synthesizer event is logged with precise timestamps, sender IDs, and request/workflow IDs into `logs/traces.json`.

### Information Disclosure (Data Leakage)
* **Threat**: User's private memories (e.g. personal deadlines, passwords, sister's birthday) or system telemetry details leak into public logs or git repositories.
* **Mitigation**: The `.gitignore` file explicitly ignores the `data/` and `logs/` directories, preventing `memory.json`, `reminders.json`, and `traces.json` from ever being committed. All data is stored strictly locally (offline-first).

### Denial of Service (System Overload)
* **Threat**: Large inputs, infinite loops in agent-to-agent collaboration, or open SSE stream handles exhaust server resources (CPU/RAM/File Handles).
* **Mitigation**:
  - The Event Bus enforces simple routing with a max execution path.
  - The `/api/chat/stream` SSE generator implements a strict `15.0` second timeout on queue reads.
  - Telemetry updates are buffered and limited in frequency.

### Elevation of Privilege (Unprivileged Execution)
* **Threat**: Prompt injection tricks the agent into running arbitrary shell commands (e.g., via MCP tool interface).
* **Mitigation**: JARVIS implements an **in-process MCP Server** (`tools/mcp_server.py`) that strictly exposes a whitelisted list of functions (`get_system_stats`, `get_memories`, `add_memory`, `delete_memory`, `get_due_reminders`). Direct terminal or CLI tool execution is completely disabled on the server.

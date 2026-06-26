# Project JARVIS — Google AI Agents Intensive Capstone Competition Writeup

## 1. Project Overview

**JARVIS** (Just A Rather Very Intelligent System) is a cyber-styled, context-aware AI operating companion built for student developers to streamline project delivery, memory management, and daily agendas. It is tailored specifically for operator **Mithun**, a 4th-semester B.Tech Computer Science student, providing personalized deadline tracking and contextual goals. What makes JARVIS stand out from general-purpose chatbots is its synthesis of deep episodic memory deduplication, context-aware mission deconstruction, and real-time hardware diagnostics via subprocessed Model Context Protocol (MCP) nodes.

---

## 2. Architecture & Design Decisions

**JARVIS** is built on a modular, event-driven agent architecture using the **Google Agent Development Kit (ADK) 2.0**:

```
                  ┌──────────────────┐
                  │   User Prompt    │
                  └──────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │   OrchestratorNode    │ (LLM Intent Classification)
               └───────────────────────┘
                 /                   \
        (Fast Path Bypass)    (Requires Telemetry/Memory/Agendas)
               /                       \
              ▼                         ▼
   ┌───────────────────┐      ┌───────────────────────┐
   │                   │      │  BackgroundDataNode   │
   │                   │      └───────────────────────┘
   │                   │                 │
   │  UIFrontendNode   │ ◄───────────────┘
   │                   │
   │ (Synthesizes raw  │
   │  response + state │
   │  row data payload)│
   └───────────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ SSE / Token Stream  │ (Real-time Markdown + React State)
                └─────────────────────┘
```

### Key Architectural Elements:
1. **ADK 2.0 Graph (`jarvis_core_workflow`)**: Defines a state-driven execution flow using `@node` components in `app/agent.py`. The `OrchestratorNode` executes intent classification and selectively gates execution. It implements a **Fast Path Bypass** for simple conversational messages (`CHAT` intent), routing directly to `UIFrontendNode` to save latency and eliminate unnecessary tool-polling calls.
2. **Decoupled Agent-to-Agent (A2A) Event Bus**: Background and foreground tasks are separated into distinct Pydantic-typed event channels. The `BackgroundDataAgent` manages tool invocation (memory store/recall, reminder CRUD, hardware stats) and publishes status events, which the `UIFrontendAgent` consumes to formulate the final user-facing response.
3. **Subprocessed Model Context Protocol (MCP)**: The system telemetry is fetched using an MCP client/server design. `mcp_client.py` spawns `mcp_server.py` as an isolated Python subprocess over `stdin`/`stdout` streams using JSON-RPC 2.0. This prevents environment pollution and guarantees execution safety, while falling back to direct library imports if sandboxed.

---

## 3. Key Capabilities

* **Episodic Memory & Deduplication**: JARVIS automatically records facts stated in conversation. To prevent memory clutter, facts pass through a similarity validation layer in `memory_store.py` powered by `difflib.SequenceMatcher`. If an incoming fact is `>= 85%` similar to an existing one, the duplication is blocked, the timestamp updates, and JARVIS responds: *"I already have that noted."*
* **Context-Aware Missions**: High-level goals (e.g. *"Help me finish my capstone"*) are deconstructed by the `BackgroundDataAgent` using operator context (`CORE_USER_CONTEXT`). Instead of returning boilerplate todo lists, it creates specific engineering tasks (e.g., configuring Docker builds, executing testing flywheels).
* **Push-to-Talk Voice**: Leverages the browser's native HTML5 Web Speech API for hands-free command capture, complete with pulsing glowing visual indicators on the main sigil.
* **Token-by-Token Streaming**: Telemetry and conversational responses stream live to the client using Server-Sent Events (SSE). A single-line progress bar displays active agent states to the user.

---

## 4. Security Stance

JARVIS integrates security practices directly into its development lifecycle:
* **Static Analysis**: Configured Semgrep pre-commit hooks (`.pre-commit-config.yaml`) to block secret leakages, hardcoded API credentials, and injection vectors.
* **Threat Modeling**: Conducted a complete STRIDE evaluation covering spoofing, local data tampering, and privilege elevations.
* **Prompt Injection Defense**: Validates incoming queries before intent classification to ensure malicious commands do not leak environment credentials.

---

## 5. Evaluation Methodology

Rather than relying on manual validation, JARVIS utilizes a programmatic quality flywheel:
1. **Classifier Test Suite (`run_evals.py`)**: Runs 50 test prompts covering various user intents (telemetry, scheduling, memory). It asserts classification precision against target intents, producing detailed markdown logs in `evaluations/report.md`.
2. **AgentEvaluator integration test (`test_agent_evaluator.py`)**: A programmatic unit test that executes queries against the live test client, checking that ADK 2.0 node routings resolve to valid schemas and expected JSON output.

---

## 6. Future Roadmap (Post-Competition)

If given more development time, the following extensions are planned:
1. **Multi-Process A2A Network Transport**: Upgrade the in-process event bus to a network-based broker (e.g., gRPC or Redis Pub/Sub) to distribute agents across different servers or containers.
2. **Visual Memory Map**: Render episodic memories as an interactive force-directed 3D node graph, allowing Mithun to browse what JARVIS has remembered over time.
3. **Active VCS Integration**: Listen to GitHub webhooks to check off mission tasks automatically when commits or pull requests are merged.

---

## 7. Key Lessons Learned

1. **Jargon is a Barrier**: Initially, the UI displayed developer concepts (`🤖 JARVIS // SYSTEM_RESP`, `[SYS_CHECK]`, etc.). Shifting the product perspective from "telemetry dashboard" to "immersive companion" significantly improved usability.
2. **Decoupling is Essential**: Separating cognitive reasoning (`BackgroundDataAgent`) from output formatting (`UIFrontendAgent`) made prompts shorter, cleaner, and less prone to regression.
3. **Reduced Motion is a Requirement**: Implementing animations requires accessibility fallbacks. Supporting `prefers-reduced-motion` ensures smooth operation on low-power devices and comfort for motion-sensitive users.

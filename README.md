# JARVIS — Joint Cognitive Assistant and Real-Time Telemetry System

[![Release](https://img.shields.io/badge/Release-v1.0.0-blue.svg)](RELEASE_NOTES_v1.0.0.md)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/Tests-25%2F25%20Passed-brightgreen.svg)]()
[![Evaluations](https://img.shields.io/badge/Evaluations-50%2F50%20Passed-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg)]()

JARVIS is an AI-powered operating companion built with the **Google ADK 2.0** framework. It features asynchronous **Agent-to-Agent (A2A) collaboration**, standard **Model Context Protocol (MCP) tool routing**, persistent memory, temporal reminders, system telemetry monitoring, live Server-Sent Events (SSE) streaming, and full production observability.

---

## 🚀 Key Features

* **Agent-to-Agent Collaboration Mesh**: Fully asynchronous routing via a strongly-typed, validated Event Bus where specialized sub-agents (`MemoryAgent`, `ReminderAgent`, `TelemetryAgent`, etc.) collaborate dynamically.
* **MCP Tool Routing**: Extreme security isolation where all system diagnostic tools and database functions are strictly whitelisted and executed over standard JSON-RPC 2.0 Model Context Protocol layers.
* **Real-Time Telemetry**: Real-time extraction of CPU Load, RAM Allocation, Disk Indices, and GPU Performance, complete with alert threshold warnings.
* **Persistent Memory**: Fuzzy-matched semantic recall of user facts using alphabetically sorted `difflib.SequenceMatcher` ratios with uncertainty-flow response logic.
* **Reminder Scheduling**: Offline-first, deterministic natural language date and time parsing (e.g. *"every Sunday at 9 AM"*, *"tomorrow at 5 PM"*).
* **Due Reminder Detection**: Live polling alert banner overlays and badge indicators that trigger immediately in the React UI upon timer expiration.
* **SSE Event Streaming**: Server-Sent Events stream backend agent transitions in real time, with automatic fallback to standard HTTP POST.
* **Trace Viewer**: Interactive visual timeline detailing step execution durations, agent communications, and request timelines.
* **Diagnostics Export**: Live download of core diagnostics reports as a structured JSON file or formatted printable PDF.
* **Demo Mode**: Integrates a collapsible preset panel to easily run automated demonstration query cases.
* **Security Hardening**: Blacklisted pattern matching for prompt injection guards, Pydantic schema validation, and pre-commit Semgrep scanning.
* **Cloud Run Readiness**: Bundled with production `Dockerfile`, `docker-compose.yml`, `cloudbuild.yaml`, and a complete deployment manual.

---

## 📐 Architecture & Data Flow

```mermaid
graph TD
    %% Styling
    classDef React fill:#050810,stroke:#00D4FF,stroke-width:2px,color:#fff;
    classDef FastAPI fill:#050810,stroke:#00FF9F,stroke-width:2px,color:#fff;
    classDef Storage fill:#050810,stroke:#FF6B35,stroke-width:2px,color:#fff;
    
    %% Nodes
    A["React Frontend (UI)"]:::React
    B["FastAPI IPC Bridge (Backend)"]:::FastAPI
    C["Event Bus (app/event_bus.py)"]:::FastAPI
    D["MCP Server (tools/mcp_server.py)"]:::FastAPI
    E["Reminders Database (reminders.json)"]:::Storage
    F["Memory Database (memory.json)"]:::Storage
    G["Traces Database (traces.json)"]:::Storage

    %% Connections
    A -->|POST /api/chat/stream| B
    A -->|GET /api/traces| B
    B -->|Publish Event| C
    B -->|RPC Requests| D
    D -->|Write/Read Reminders| E
    D -->|Write/Read Memories| F
    B -->|Write Traces| G
```

---

## 📷 Screenshots

| Feature | Interface Screenshot |
| --- | --- |
| **Main Dashboard & Telemetry** | *[Placeholder: Main Chat Interface and circular gauge meters]* |
| **Memory Viewer Panel** | *[Placeholder: Stored Memory list, confidence levels, search box]* |
| **Cloud Trace Observability** | *[Placeholder: Sequential trace step timeline and duration metrics]* |
| **Judges Demo Panel** | *[Placeholder: Collapsible demo presets panel]* |

---

## ⚡ Quick Start

### Prerequisites
Before running, ensure you have:
1. Python 3.13+ installed.
2. Node.js (v18+) and npm installed.
3. Google Gemini API Key configured.

---

### Step 1: Launch Backend Server
1. Clone the repository and navigate to the project directory:
   ```bash
   cd jarvis
   ```
2. Install Python dependencies and sync virtual environment:
   ```bash
   uv sync
   ```
3. Set your Gemini API key:
   ```bash
   # Windows PowerShell
   $env:GEMINI_API_KEY="YOUR_KEY"
   
   # Linux / macOS
   export GEMINI_API_KEY="YOUR_KEY"
   ```
4. Start the FastAPI server:
   ```bash
   uv run uvicorn server:app --port 8001
   ```

---

### Step 2: Launch React Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm.cmd run dev
   ```
   Open `http://localhost:5173/` in your browser.

---

## 📊 Evaluation & Verification Results

JARVIS implements a rigorous programmatic testing framework:
- **Pytest Suite**: **25 / 25 Tests Passed** (`uv run pytest`) verifying memory, reminder parsing, telemetry routing, and integration controllers.
- **Evaluation Dataset**: **50 / 50 Evaluation Prompts Passed** (`uv run python run_evals.py`) testing mixed intent, emojis, Unicode characters, formatting, and adversarial injections.
- **Overall Success Rate**: **100%** schema and routing accuracy.

---

## 🔒 Security

JARVIS implements strict STRIDE mitigations:
- Private databases and traces are isolated and Git-ignored.
- Input validation filters out common prompt injection attacks at the boundary.
- Whitelisted MCP server limits execution to safe predefined methods.
- Read more: [SECURITY.md](SECURITY.md) and [THREAT_MODEL.md](THREAT_MODEL.md).

---

## 🚢 Deployment

JARVIS is ready for production hosting:
- Local Compose container launch: `docker-compose up --build`
- Production Cloud Run and Cloud Build pipeline instructions: [deployment/README.md](deployment/README.md).

---

## 🗺️ Future Roadmap

- [ ] **Distributed Multi-Agent Clustering**: Coordinate tasks across multiple machines using remote agent discovery.
- [ ] **Voice-Activated Cognitive Interface**: Integrated WebSocket-based WebRTC audio stream input.
- [ ] **Advanced Vector Embeddings Database**: Support for local pgvector or chroma databases for large-scale semantic memory indexing.

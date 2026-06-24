# JARVIS Architecture & Data Flow Reference

This document provides a comprehensive overview of the architectural design, agent collaboration patterns, and tools routing protocols in Project JARVIS.

---

## 1. System Topology Overview

JARVIS is designed as an offline-first, event-driven assistant utilizing a React frontend and a FastAPI backend with integrated local data storage layers.

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

## 2. Event-Driven Agent-to-Agent (A2A) Mesh

JARVIS splits operational tasks among specialized agent modules that communicate asynchronously by publishing and subscribing to strongly-typed event schemas over a central Event Bus.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Orchestrator as OrchestratorAgent
    participant Bus as global_event_bus
    participant Telemetry as TelemetryAgent
    participant Memory as MemoryAgent
    participant Reminder as ReminderAgent
    participant Synthesizer as ResponseSynthesizerAgent

    User->>Orchestrator: Input Prompt
    Orchestrator->>Bus: Publish INTENT_DETECTED [intent, prompt]
    
    par Subscriber Dispatch
        Bus-->>Telemetry: Handle SYSTEM Intent
        Telemetry->>Bus: Publish TELEMETRY_GATHERED [stats]
    and
        Bus-->>Memory: Handle MEMORY_STORE/RECALL Intent
        Memory->>Bus: Publish MEMORY_STORED / MEMORY_RECALLED
    and
        Bus-->>Reminder: Handle REMINDER Intent
        Reminder->>Bus: Publish REMINDER_CREATED [reminder]
    end

    Telemetry->>Synthesizer: Accumulate telemetry stats
    Memory->>Synthesizer: Accumulate recalled memory facts
    Reminder->>Synthesizer: Accumulate created reminder data

    Synthesizer->>User: Publish COMPLETE [final payload]
```

---

## 3. Model Context Protocol (MCP) Integration

All system tools (getting system stats, saving memories, fetching due reminders) route through the standard MCP Server to maintain absolute API isolation.

```mermaid
flowchart LR
    %% Styling
    classDef Agent fill:#050810,stroke:#00D4FF,stroke-width:2px,color:#fff;
    classDef Client fill:#050810,stroke:#00FF9F,stroke-width:2px,color:#fff;
    classDef Server fill:#050810,stroke:#FF0080,stroke-width:2px,color:#fff;
    classDef Tool fill:#050810,stroke:#FF6B35,stroke-width:2px,color:#fff;

    subgraph Backend Core
        A["Agent Module"]:::Agent
        B["MCP Client (tools/mcp_client.py)"]:::Client
    end

    subgraph Model Context Protocol boundary
        C["MCP Router Endpoint (/api/mcp)"]:::Server
        D["MCP Server (tools/mcp_server.py)"]:::Server
    end

    subgraph System Functions
        E["get_system_stats"]:::Tool
        F["get_due_reminders"]:::Tool
        G["get_memories / add_memory"]:::Tool
    end

    A -->|call_mcp_tool| B
    B -->|JSON-RPC request| C
    C -->|dispatch rpc| D
    D -->|execute| E
    D -->|execute| F
    D -->|execute| G
```

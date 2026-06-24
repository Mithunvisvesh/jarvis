#!/bin/bash
# JARVIS Core Mesh Startup Script (Unix/macOS)

echo -e "\e[1;36m[JARVIS] Initializing python dependencies via uv...\e[0m"
uv sync

echo -e "\e[1;36m[JARVIS] Building frontend assets (Vite production preview mode)...\e[0m"
npm run build --prefix frontend

echo -e "\e[1;32m[JARVIS] Launching FastAPI Backend on port 8001...\e[0m"
# Start uvicorn server in background
uv run uvicorn server:app --port 8001 &
BACKEND_PID=$!

echo -e "\e[1;32m[JARVIS] Launching Frontend Preview Server on port 4173...\e[0m"
# Start Vite preview in background
npm run preview --prefix frontend &
FRONTEND_PID=$!

echo -e "\e[1;35m============================================================\e[0m"
echo -e "\e[1;35m   JARVIS COLLABORATIVE AGENT CORE RUNNING                  \e[0m"
echo -e "\e[1;35m                                                            \e[0m"
echo -e "\e[1;35m   * Backend Endpoint: http://localhost:8001                \e[0m"
echo -e "\e[1;35m   * Frontend Dashboard: http://localhost:4173              \e[0m"
echo -e "\e[1;35m   * Developer Mode: Activate in header (DEV button)        \e[0m"
echo -e "\e[1;35m============================================================\e[0m"

# Graceful termination handler
cleanup() {
    echo -e "\n\e[1;31m[JARVIS] Terminating agent servers gracefully...\e[0m"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Bounded sleep/wait
wait

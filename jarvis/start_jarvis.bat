@echo off
title JARVIS Orchestration Mesh
color 0A

echo [JARVIS] Synchronizing dependencies via uv...
call uv sync
if %ERRORLEVEL% neq 0 (
    echo [JARVIS] [ERROR] Failed to sync python environment.
    pause
    exit /b %ERRORLEVEL%
)

echo [JARVIS] Building frontend assets...
cd frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [JARVIS] [ERROR] Frontend build failed.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo [JARVIS] Starting FastAPI Backend on port 8001...
start "JARVIS Backend Server" uv run uvicorn server:app --port 8001

echo [JARVIS] Starting Frontend Preview on port 4173...
start "JARVIS Frontend Preview" npm run preview --prefix frontend

echo ============================================================
echo    JARVIS COLLABORATIVE AGENT CORE RUNNING
echo 
echo    * Backend Endpoint: http://localhost:8001
echo    * Frontend Dashboard: http://localhost:4173
echo    * Developer Mode: Activate in Settings/SYSTEM
echo ============================================================
echo Press any key to stop all window tasks or close the opened windows.
pause

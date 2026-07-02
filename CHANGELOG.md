# Changelog

All notable changes to the **JARVIS** capstone project will be documented in this file.

---

## [0.1.0] - 2026-07-02

### Added
- **Demo Mode Seeding**: Instroduced `/api/demo/load` endpoint and frontend loader dashboard to instantly seed facts, missions, and reminders.
- **Native TTS Speech Synthesis**: Added browser-native speech synthesis with voice package caching and local storage toggles.
- **Interactive Integrations Matrix**: Upgraded the settings matrix to support active state toggles (GitHub, Notion, Google Calendar) caching to local storage and emitting events.
- **Academic Citation**: Added `/CITATION.cff` for project referencing.
- **Frontend Env Template**: Created `frontend/.env.example` defining standard base URL parameters.

### Changed
- **Honest Integrations Labels**: Refined connected states to honestly display `ENABLED (PLANNED)` / `UNAVAILABLE` and revised logging text to prevent misleading judges.
- **Description Update**: Defined the project metadata description inside `pyproject.toml`.
- **walkthrough.md documentation**: Synced implementation logs with final release notes.

### Removed
- **Unpolished Planning Doc**: Deleted the temporary file `AI Agent Capstone Project Blueprint.docx` from the workspace root.
- **Placeholder JSON**: Removed the empty `deployment_metadata.json` metadata record.

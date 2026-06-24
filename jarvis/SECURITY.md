# SECURITY Policy & Guidelines

This document outlines the security posture, vulnerability reporting process, and active defense guards implemented within JARVIS.

## 1. Security Architecture

JARVIS implements a multi-tiered security defense-in-depth architecture:

- **Input Guard Filtering**: Sanitizes user requests at the API boundary to block common prompt injection attacks, system override instructions, and unauthorized command executions.
- **Strict Schema Enforcement**: All backend responses are validated against a Pydantic `JarvisResponse` model to ensure malformed or unexpected model outputs never reach the frontend.
- **Local Storage Isolation**: Reminders and memory facts are saved inside a git-ignored `data/` subdirectory. No private telemetry or user data is sent to external servers unless explicit integration is enabled.

## 2. Prompt Injection Defense

All user inputs entering through `/api/chat` or `/api/chat/stream` pass through a pattern-matching filter in `server.py` checking for known prompt injection payloads:
- `ignore previous instructions`
- `bypass security`
- `system override`
- `ignore all rules`

If a signature is matched, the backend instantly rejects the request and returns a standard security alert payload.

## 3. Automated Static Analysis

We enforce security compliance at commit time using static analysis:
- **Semgrep**: Configured via pre-commit hooks (`.pre-commit-config.yaml`) to run security audits on Python code.
- **Dependency Scan**: Checked periodically to ensure no vulnerable Python libraries are bundled in `pyproject.toml`.

## 4. Reporting a Vulnerability

If you discover a security vulnerability, please do not open a public GitHub issue. Instead, report it privately:
1. Email: `security@example.com`
2. Include a detailed description of the vulnerability, a proof of concept (PoC), and steps to reproduce.
3. We will acknowledge receipt within 48 hours and coordinate a patch release.

# IGChatAssitant Agent Guide

Use this guide when an AI agent changes this repository.

## Project Boundary

IGChatAssitant is a local-first writing assistant for personal Instagram DM drafting. It is not a scraping tool, growth bot, bulk messaging system, or unattended auto-reply agent.

## Required Rules

- Keep the backend bound to localhost by default.
- Do not add bulk messaging, inbox crawling, follower scraping, campaign, or auto-reply features.
- Do not log full message content, API keys, or raw provider responses unless explicitly needed for a test fixture.
- Validate request bodies with Pydantic models.
- Keep browser-extension logic small enough to test; extract pure functions before adding behavior to `content.js`.
- Add tests for new backend behavior.
- Update docs when data flow, privacy behavior, setup, or API behavior changes.
- Run the relevant quality checks before finishing.

## Quality Commands

Use the virtualenv Python on local Windows runs:

```powershell
.\.venv\Scripts\python.exe -m compileall -q server tests
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check server tests
node --check extension/content.js
node --check extension/background.js
```

On CI or Unix-like environments:

```bash
make ci
```

## Safe Refactoring Targets

- Extract message parsing and history cleanup from `extension/content.js`.
- Add tests around Pydantic request limits.
- Add mocked LLM tests for `/autocomplete`, `/rewrite`, and config testing.
- Strengthen localhost-only assumptions and document trust boundaries.

## High-Risk Changes

Require extra review before changing:

- message send behavior
- browser DOM selectors for Instagram
- API key persistence
- CORS and localhost access behavior
- prompt rules that could change user intent


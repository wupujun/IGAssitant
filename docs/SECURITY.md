# Security

## Security Boundary

IGChatAssitant is a local personal assistant, not a sandbox. Message drafts and selected conversation context are sent to the configured LLM provider. The user must review suggestions before sending.

## Trust Boundaries

- Instagram page to extension content script.
- Extension content script to extension background worker.
- Extension background worker to local FastAPI server.
- Local FastAPI server to configured LLM provider.
- Local filesystem for `.env`, logs, and `server/llm_config.json`.

## Current Safeguards

- The documented server launch command binds to `127.0.0.1`.
- The backend rejects non-loopback clients at the application middleware layer.
- Extension background fetches only allow `http://127.0.0.1:8765/` and `http://localhost:8765/`.
- Request bodies use Pydantic models with length and numeric bounds.
- The public config API returns only an API-key preview, not the raw API key.
- Runtime files are ignored by git.

## Remaining Risks

- `server/llm_config.json` stores the provider key locally in plaintext.
- CORS allows Chrome extension origins broadly for local development convenience.
- `/config`, `/logs`, and `/metrics` are available to loopback clients.
- The Instagram DOM can change and break selectors.
- LLM output is untrusted text and must stay human-reviewed.

## Rules for Future Changes

- Do not add bulk messaging, scraping, auto-reply, or campaign automation.
- Do not log raw message content or API keys.
- Validate all API input at the Pydantic model boundary.
- Keep local-only network exposure as the default.
- Add tests for any change to CORS, loopback checks, API key handling, or LLM prompt behavior.


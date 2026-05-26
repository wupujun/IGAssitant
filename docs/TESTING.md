# Testing

## Local Checks

Windows:

```powershell
.\.venv\Scripts\python.exe -m compileall -q server tests
.\.venv\Scripts\python.exe -m ruff check server tests
.\.venv\Scripts\python.exe -m pytest
node --check extension/apiClient.js
node --check extension/debugLog.js
node --check extension/domSelectors.js
node --check extension/history.js
node --check extension/sessionStore.js
node --check extension/content.js
node --check extension/background.js
node --test extension/tests/*.test.js
npm run test:smoke --prefix extension
```

Unix-like environments with `make`:

```bash
make ci
```

## Test Coverage

Current automated tests cover:

- Pydantic request limits for rewrite, autocomplete, and config payloads.
- Public config responses not returning raw API keys.
- Mocked `/autocomplete` flow without calling an LLM provider.
- Blank `/rewrite` rejection before provider calls.
- Logs API limit clamping.
- Loopback-client enforcement.
- Autocomplete prompt construction helpers.
- Extension history/session helper behavior.
- Extension API client and local session-store helper behavior.
- Extension DOM selector helper behavior against lightweight fixtures.
- Extension debug log storage and rendering behavior.
- Extension browser fixture smoke test for panel render and backend heartbeat.

## Next Test Targets

- Extension message-history cleanup and duplicate detection.
- Extension background URL allowlist behavior.
- Config save/load behavior with temporary files.
- Mocked LLM provider failures for autocomplete and rewrite.
- Browser smoke test for the assistant panel on a controlled fixture page.

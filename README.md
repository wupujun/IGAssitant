# Instagram Chat Assistant

Local Instagram Direct assistant with:

- A Python FastAPI backend that calls an OpenAI-compatible LLM provider.
- A Chrome Manifest V3 extension injected into Instagram.
- Autocomplete/correction for your draft, with local backend config, logs, and metrics pages.

## Install

### Windows

```powershell
.\install.ps1
```

If PowerShell blocks local scripts, run:

```powershell
python install.py
```

### macOS

```bash
chmod +x install.sh
./install.sh
```

The installer:

- creates `.venv` at the project root
- installs `server/requirements.txt`
- creates `server/.env` if missing
- creates `run_server.ps1` and `run_server.sh`
- prints the Chrome extension folder to load

To recreate the virtualenv:

```bash
python install.py --force-venv
```

## Start Backend

Windows:

```powershell
.\run_server.ps1
```

macOS:

```bash
./run_server.sh
```

Backend pages:

- Config: `http://127.0.0.1:8765/config`
- Logs: `http://127.0.0.1:8765/logs`
- Metrics: `http://127.0.0.1:8765/metrics`
- Health: `http://127.0.0.1:8765/health`

Use the Config page to set provider, API key, model, base URL, and custom autocomplete rules.

For DeepSeek, typical settings are:

```text
Provider: DeepSeek
API mode: Chat Completions
Base URL: https://api.deepseek.com
Model: deepseek-v4-flash or deepseek-v4-pro
Thinking: disabled for fastest autocomplete
```

## Load Chrome Extension

Chrome does not allow a normal script to silently install an unpacked extension into your regular profile. Load it once manually:

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `extension` folder in this project.
5. Open an Instagram Direct conversation.

The extension panel displays its current version in the title.

## Use

- Type a draft in the extension draft box.
- The autocomplete suggestion appears in the highlighted suggestion box.
- `Enter`: send the autocomplete/suggestion version.
- `Ctrl+Enter`: send the raw draft/untranslated version.
- `Shift+Enter`: insert a newline in the draft box.

Quoted text inside double quotes is preserved by the backend prompt and should not be translated or rewritten.

## Troubleshooting

- Open `http://127.0.0.1:8765/health` to verify the backend is running.
- Open `http://127.0.0.1:8765/logs` for backend logs.
- Open `http://127.0.0.1:8765/metrics` for LLM request count and latency.
- Click `Debug` in the extension panel for extension-side logs.
- Open Chrome DevTools on Instagram and check Console logs prefixed with `[IGCA]`.

Raw server logs are written to:

```text
server/uvicorn.err.log
server/uvicorn.out.log
```

Useful PowerShell command:

```powershell
Get-Content server\uvicorn.err.log -Tail 80 -Wait
```

Useful macOS command:

```bash
tail -f server/uvicorn.err.log
```

## Backend Structure

- `server/main.py` is the uvicorn entry point.
- `server/app/factory.py` wires FastAPI, middleware, CORS, and routers.
- `server/app/routers/` contains HTTP route handlers.
- `server/app/services/` contains autocomplete/rewrite behavior.
- `server/app/config_store.py` owns persisted LLM settings.
- `server/app/llm_client.py` owns OpenAI-compatible LLM calls.
- `server/app/metrics_store.py` stores in-memory LLM latency metrics.
- `server/app/logging_config.py` owns in-memory backend log capture.
- `server/app/pages.py` contains local config/log/metrics HTML pages.

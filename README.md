# IG Assistant

IG Assistant is a local-first writing assistant for personal Instagram Direct messages. It adds a small draggable assistant panel to Instagram Web, sends your draft to a local Python API, asks your configured LLM to correct or improve it, and gives you an editable suggestion before anything is sent.

The project is designed for **personal, human-in-the-loop writing help**. You stay in control of the message, the model, prompt rules, logs, and runtime behavior.

## Highlights

- Chrome extension for Instagram Web DMs.
- Local FastAPI backend running on `127.0.0.1`.
- OpenAI-compatible LLM support, including DeepSeek.
- Runtime LLM config page for provider, base URL, model, API key, and custom prompt rules.
- Autocomplete/correction while typing.
- Human-in-the-loop editing: the suggestion is shown in an editable box before sending.
- Keyboard-first personal reply flow:
  - `Enter`: send the autocomplete/suggested version.
  - `Ctrl+Enter`: send the raw draft/untranslated version.
  - `Shift+Enter`: insert a newline.
- Quote-preservation rule: text inside double quotes is preserved exactly.
- Recent-message detection with local regex filtering for timestamps, statuses, attachment notices, and UI noise.
- Backend logs UI and LLM latency metrics dashboard.
- Cross-platform installer for Windows and macOS.
- No bulk messaging, lead scraping, follower scraping, or campaign automation features.

## How It Works

```text
Instagram Web
  -> Chrome extension content script
  -> Extension background worker
  -> Local FastAPI server at 127.0.0.1:8765
  -> OpenAI-compatible LLM provider
```

The extension never calls the LLM provider directly. Browser-to-localhost calls are proxied through the extension background worker to avoid Chrome private-network restrictions on Instagram pages.

The extension is intended to operate on the currently open conversation only. It is not designed to crawl profiles, scrape followers, scan inboxes in bulk, or run unattended outreach.

## Screens and Backend Tools

After starting the backend:

- Config: `http://127.0.0.1:8765/config`
- Logs: `http://127.0.0.1:8765/logs`
- Metrics: `http://127.0.0.1:8765/metrics`
- Health: `http://127.0.0.1:8765/health`

The metrics dashboard shows LLM request count, success/failure count, average latency, p95 latency, model, provider, input/output size, and error details.

## Install

### Windows

```powershell
.\install.ps1
```

If PowerShell blocks local scripts:

```powershell
python install.py
```

### macOS

```bash
chmod +x install.sh
./install.sh
```

The installer creates `.venv`, installs backend dependencies, creates `server/.env` if missing, and writes platform-specific server launch scripts.

## Start Backend

Windows:

```powershell
.\run_server.ps1
```

macOS:

```bash
./run_server.sh
```

Then open:

```text
http://127.0.0.1:8765/config
```

Set your LLM provider, API key, model, and base URL.

### DeepSeek Example

```text
Provider: DeepSeek
API mode: Chat Completions
Base URL: https://api.deepseek.com
Model: deepseek-v4-flash or deepseek-v4-pro
Thinking: disabled for faster autocomplete
```

## Load Chrome Extension

Chrome does not allow a script to silently install an unpacked extension into a normal user profile. Load it once manually:

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `extension` folder in this repo.
5. Open an Instagram Direct conversation.

The assistant panel shows its extension version in the title.

## Responsible Use

This project is a personal writing assistant, not a growth bot or outreach automation tool.

Use it for:

- correcting your own draft before replying
- making a personal reply clearer or more natural
- translating or refining a message you intend to review
- learning from the suggested wording before you send

Do not use it for:

- bulk outbound DMs
- unsolicited outreach campaigns
- repeated identical messages
- scraping profiles, followers, or chat history
- running unattended auto-replies
- evading Instagram limits or enforcement

High-volume or spam-like DM behavior can put an Instagram account at risk. Keep usage personal, low-volume, and reviewed by a human.

## Usage

1. Open an Instagram DM conversation.
2. Type a draft in the IG Assistant panel.
3. Edit the highlighted autocomplete result if needed.
4. Press `Enter` to send the suggested version.
5. Press `Ctrl+Enter` to send your raw draft instead.

Use the `Backend` button in the extension panel to open the local backend UI. Use `Debug` to inspect extension-side activity.

For the lowest-risk workflow, use the assistant as a drafting tool: review the suggestion, make edits, and only send messages you would personally send yourself.

## Custom Rules

Open the config page and edit the correction/autocomplete rule. This rule is injected into the prompt for every autocomplete request.

Built-in behavior includes:

- Preserve casual Instagram DM tone.
- Correct spelling, grammar, syntax, punctuation, and wording.
- Use the latest received message as private context.
- Preserve text inside double quotes exactly.
- Return only one reply message, with no labels or explanations.

## Privacy and Safety

- Instagram page content is read by the local extension only for the active browser session.
- Drafts and the latest detected received message are sent to your local backend.
- The backend sends prompt content to the LLM provider you configure.
- API keys are stored locally in `server/llm_config.json`, which is ignored by git.
- Runtime files such as `.env`, logs, `.venv`, and local Chrome profile data are ignored by git.
- The tool is intended for personal, human-reviewed messages rather than automated messaging.

## Troubleshooting

Check backend health:

```text
http://127.0.0.1:8765/health
```

Open backend logs:

```text
http://127.0.0.1:8765/logs
```

Open LLM metrics:

```text
http://127.0.0.1:8765/metrics
```

Raw log files:

```text
server/uvicorn.err.log
server/uvicorn.out.log
```

Windows:

```powershell
Get-Content server\uvicorn.err.log -Tail 80 -Wait
```

macOS:

```bash
tail -f server/uvicorn.err.log
```

Extension-side debugging:

- Click `Debug` in the assistant panel.
- Open Chrome DevTools on Instagram and inspect Console logs prefixed with `[IGCA]`.

## Project Structure

```text
extension/
  background.js      Chrome background worker and local API proxy
  content.js         Instagram UI injection, session detection, autocomplete flow
  content.css        Assistant panel styles
  manifest.json      Chrome Manifest V3 config

server/
  main.py            Uvicorn entry point
  app/
    factory.py       FastAPI app setup, middleware, routers
    llm_client.py    OpenAI-compatible LLM client and metrics recording
    config_store.py  Runtime LLM config persistence
    metrics_store.py In-memory LLM metrics
    pages.py         Local HTML pages for config/logs/metrics
    routers/         API routes
    services/        Autocomplete and rewrite prompt logic
```

## Development

Validate backend syntax:

```bash
python -m compileall -q server
```

Validate extension JavaScript:

```bash
node --check extension/content.js
node --check extension/background.js
```

Run backend manually:

```bash
python -m uvicorn server.main:app --host 127.0.0.1 --port 8765 --log-level info
```

## Status

This is a local personal productivity tool, not an official Instagram product. Instagram Web DOM structure changes can break selectors, so extension debug logs and backend metrics are included to make troubleshooting practical.

The project should not be used for spam, bulk messaging, scraping, or unattended automation.

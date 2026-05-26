# Design

## Purpose

IGChatAssitant is a local-first assistant for drafting and rewriting personal Instagram Direct messages. The user remains in control: suggestions are shown for review before anything is sent.

## Architecture

```text
Instagram Web
  -> Chrome extension content script
  -> Chrome extension background worker
  -> FastAPI server on 127.0.0.1:8765
  -> configured OpenAI-compatible LLM provider
```

## Backend Modules

- `server/app/factory.py`: FastAPI app setup, CORS, middleware, router registration.
- `server/app/models.py`: Pydantic request and response schemas.
- `server/app/middleware.py`: request logging and loopback-client enforcement.
- `server/app/config_store.py`: local runtime LLM configuration persistence.
- `server/app/llm_client.py`: OpenAI-compatible request handling and metrics recording.
- `server/app/routers/`: HTTP routes for assistant, config, health, logs, and metrics.
- `server/app/services/`: prompt construction and rewrite/autocomplete domain behavior.

## Frontend Modules

- `extension/background.js`: background worker that proxies allowed local API requests.
- `extension/apiClient.js`: local backend endpoint constants and background-worker request helper.
- `extension/debugLog.js`: bounded debug log storage and panel log rendering.
- `extension/domSelectors.js`: Instagram DOM discovery, composer/surface lookup, and message candidate checks.
- `extension/history.js`: pure helpers for message history cleanup, session slugs, and formatting.
- `extension/sessionStore.js`: localStorage-backed conversation session persistence.
- `extension/content.js`: Instagram page integration, assistant panel, DOM detection, session state, and autocomplete flow.
- `extension/content.css`: extension UI styling.

`content.js` is currently the largest maintenance risk. Message history, session storage, API helpers, debug logging, and DOM selectors have been extracted; future refactors should continue with panel rendering.

## Data Flow

The extension reads the active Instagram conversation page, sends the current draft and limited context to the local backend, and the backend sends prompt content to the configured LLM provider. The provider response is returned to the extension as an editable suggestion.

## Non-Goals

- bulk outbound DMs
- follower or profile scraping
- inbox crawling
- unattended auto-replies
- evading Instagram limits

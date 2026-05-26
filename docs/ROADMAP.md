# Roadmap

## Quality Catch-Up

1. Keep CI green for every change.
2. Extract pure frontend logic from `extension/content.js`.
3. Add tests for extension message parsing and background fetch allowlisting.
4. Add mocked LLM failure-path tests.
5. Consider stricter CORS configuration for known extension IDs.
6. Consider safer local API key storage for non-development use.

## Product Guardrails

The project should remain a personal, human-reviewed writing assistant. Do not add bulk messaging, scraping, campaign workflows, or unattended auto-replies.


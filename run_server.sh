#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
"$ROOT/.venv/bin/python" -m uvicorn server.main:app --host 127.0.0.1 --port 8765 --log-level info

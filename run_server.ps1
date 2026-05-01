$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
& "$Root\.venv\Scripts\python.exe" -m uvicorn server.main:app --host 127.0.0.1 --port 8765 --log-level info

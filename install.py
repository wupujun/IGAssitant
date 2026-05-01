#!/usr/bin/env python3
"""Cross-platform installer for Instagram Chat Assistant."""

from __future__ import annotations

import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SERVER_DIR = ROOT / "server"
VENV_DIR = ROOT / ".venv"
REQUIREMENTS = SERVER_DIR / "requirements.txt"
ENV_EXAMPLE = SERVER_DIR / ".env.example"
ENV_FILE = SERVER_DIR / ".env"
EXTENSION_DIR = ROOT / "extension"


def run(command: list[str], *, cwd: Path = ROOT) -> None:
    printable = " ".join(command)
    print(f"==> {printable}")
    subprocess.run(command, cwd=str(cwd), check=True)


def venv_python() -> Path:
    if platform.system() == "Windows":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def create_venv(force: bool) -> None:
    if force and VENV_DIR.exists():
        print(f"Removing existing virtualenv: {VENV_DIR}")
        shutil.rmtree(VENV_DIR)
    if VENV_DIR.exists():
        print(f"Virtualenv already exists: {VENV_DIR}")
        return
    run([sys.executable, "-m", "venv", str(VENV_DIR)])


def install_requirements() -> None:
    python = str(venv_python())
    run([python, "-m", "pip", "install", "--upgrade", "pip"])
    run([python, "-m", "pip", "install", "-r", str(REQUIREMENTS)])


def ensure_env() -> None:
    if ENV_FILE.exists():
        print(f"Config env already exists: {ENV_FILE}")
        return
    if ENV_EXAMPLE.exists():
        shutil.copyfile(ENV_EXAMPLE, ENV_FILE)
        print(f"Created {ENV_FILE} from .env.example")
    else:
        ENV_FILE.write_text("LOG_LEVEL=INFO\n", encoding="utf-8")
        print(f"Created {ENV_FILE}")


def write_run_scripts() -> None:
    windows_script = ROOT / "run_server.ps1"
    windows_script.write_text(
        """$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
& "$Root\\.venv\\Scripts\\python.exe" -m uvicorn server.main:app --host 127.0.0.1 --port 8765 --log-level info
""",
        encoding="utf-8",
    )

    macos_script = ROOT / "run_server.sh"
    macos_script.write_text(
        """#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
"$ROOT/.venv/bin/python" -m uvicorn server.main:app --host 127.0.0.1 --port 8765 --log-level info
""",
        encoding="utf-8",
    )
    try:
        macos_script.chmod(macos_script.stat().st_mode | 0o755)
    except OSError:
        pass
    print(f"Created run scripts: {windows_script.name}, {macos_script.name}")


def print_next_steps() -> None:
    python = venv_python()
    print("\nInstallation complete.")
    print("\nStart backend API:")
    if platform.system() == "Windows":
        print(r"  .\run_server.ps1")
    else:
        print("  ./run_server.sh")
    print("\nManual backend command:")
    print(f"  {python} -m uvicorn server.main:app --host 127.0.0.1 --port 8765 --log-level info")
    print("\nBackend UI:")
    print("  http://127.0.0.1:8765/config")
    print("  http://127.0.0.1:8765/logs")
    print("  http://127.0.0.1:8765/metrics")
    print("\nLoad Chrome extension:")
    print("  1. Open chrome://extensions")
    print("  2. Enable Developer mode")
    print("  3. Click Load unpacked")
    print(f"  4. Select: {EXTENSION_DIR}")
    print("\nLLM config:")
    print("  Set your provider/API key/model at http://127.0.0.1:8765/config after starting the backend.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Install Instagram Chat Assistant on Windows or macOS.")
    parser.add_argument("--force-venv", action="store_true", help="Delete and recreate the virtualenv.")
    parser.add_argument("--skip-deps", action="store_true", help="Create scripts/env only; skip pip install.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not REQUIREMENTS.exists():
        raise SystemExit(f"Missing requirements file: {REQUIREMENTS}")
    create_venv(args.force_venv)
    if not args.skip_deps:
        install_requirements()
    ensure_env()
    write_run_scripts()
    print_next_steps()


if __name__ == "__main__":
    main()

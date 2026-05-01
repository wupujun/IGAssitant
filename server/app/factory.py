from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .logging_config import setup_logging
from .middleware import request_logging_middleware


def create_app() -> FastAPI:
    load_dotenv()
    setup_logging()

    app = FastAPI(title="Instagram Chat Assistant API", version="0.3.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^chrome-extension://.*$|^https://www\.instagram\.com$",
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
    app.middleware("http")(request_logging_middleware)

    from .routers import assistant, config, health, logs, metrics

    app.include_router(health.router)
    app.include_router(logs.router)
    app.include_router(metrics.router)
    app.include_router(config.router)
    app.include_router(assistant.router)
    return app

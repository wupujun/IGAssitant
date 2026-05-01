import logging

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from ..logging_config import LOG_BUFFER
from ..pages import LOGS_PAGE_HTML

router = APIRouter()
logger = logging.getLogger("ig-chat-assistant")


@router.get("/api/logs")
def get_logs(limit: int = 200) -> dict[str, list[dict[str, str]]]:
    safe_limit = max(1, min(limit, 500))
    logger.info("logs.get limit=%s", safe_limit)
    return {"logs": list(LOG_BUFFER)[-safe_limit:]}


@router.get("/logs", response_class=HTMLResponse)
def logs_page() -> HTMLResponse:
    logger.info("logs.page")
    return HTMLResponse(LOGS_PAGE_HTML)

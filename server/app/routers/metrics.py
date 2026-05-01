import logging

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from ..metrics_store import get_llm_metrics, summarize_llm_metrics
from ..pages import METRICS_PAGE_HTML

router = APIRouter()
logger = logging.getLogger("ig-chat-assistant")


@router.get("/api/metrics/llm")
def llm_metrics(limit: int = 200) -> dict[str, object]:
    safe_limit = max(1, min(limit, 1000))
    logger.info("metrics.llm.get limit=%s", safe_limit)
    return {
        "summary": summarize_llm_metrics(),
        "metrics": get_llm_metrics(safe_limit),
    }


@router.get("/metrics", response_class=HTMLResponse)
def metrics_page() -> HTMLResponse:
    logger.info("metrics.page")
    return HTMLResponse(METRICS_PAGE_HTML)

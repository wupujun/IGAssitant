import logging
import time
from uuid import uuid4

from fastapi import Request

logger = logging.getLogger("ig-chat-assistant")


async def request_logging_middleware(request: Request, call_next):
    request_id = uuid4().hex[:8]
    started = time.perf_counter()
    logger.info(
        "request.start id=%s method=%s path=%s client=%s",
        request_id,
        request.method,
        request.url.path,
        request.client.host if request.client else "unknown",
    )

    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        logger.exception("request.error id=%s elapsed_ms=%s", request_id, elapsed_ms)
        raise

    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    logger.info("request.end id=%s status=%s elapsed_ms=%s", request_id, response.status_code, elapsed_ms)
    response.headers["X-IGCA-Request-ID"] = request_id
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

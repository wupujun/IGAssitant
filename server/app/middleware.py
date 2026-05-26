import logging
import time
from ipaddress import ip_address
from uuid import uuid4

from fastapi import Request, Response

logger = logging.getLogger("ig-chat-assistant")
ALLOWED_BROWSER_ORIGIN = "https://www.instagram.com"
CHROME_EXTENSION_ORIGIN_PREFIX = "chrome-extension://"


async def request_logging_middleware(request: Request, call_next):
    request_id = uuid4().hex[:8]
    started = time.perf_counter()
    client_host = request.client.host if request.client else "unknown"
    logger.info(
        "request.start id=%s method=%s path=%s client=%s",
        request_id,
        request.method,
        request.url.path,
        client_host,
    )

    if not is_loopback_client(client_host):
        logger.warning("request.forbidden id=%s reason=non_loopback_client client=%s", request_id, client_host)
        return Response("forbidden", status_code=403, headers={"X-IGCA-Request-ID": request_id})

    private_network_response = private_network_preflight_response(request)
    if private_network_response is not None:
        logger.info("request.private_network_preflight id=%s", request_id)
        private_network_response.headers["X-IGCA-Request-ID"] = request_id
        return private_network_response

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


def is_loopback_client(host: str) -> bool:
    try:
        return ip_address(host).is_loopback
    except ValueError:
        return host in {"localhost", "testclient"}


def private_network_preflight_response(request: Request) -> Response | None:
    if request.method != "OPTIONS":
        return None
    if request.headers.get("access-control-request-private-network", "").lower() != "true":
        return None

    origin = request.headers.get("origin", "")
    if not is_allowed_browser_origin(origin):
        return Response("forbidden", status_code=403)

    requested_headers = request.headers.get("access-control-request-headers", "*")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": requested_headers,
            "Access-Control-Allow-Private-Network": "true",
            "Vary": "Origin",
        },
    )


def is_allowed_browser_origin(origin: str) -> bool:
    return origin == ALLOWED_BROWSER_ORIGIN or origin.startswith(CHROME_EXTENSION_ORIGIN_PREFIX)

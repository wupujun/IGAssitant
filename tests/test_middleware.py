from fastapi import Request

from server.app.middleware import is_allowed_browser_origin, is_loopback_client, private_network_preflight_response


def test_is_loopback_client_accepts_loopback_addresses() -> None:
    assert is_loopback_client("127.0.0.1")
    assert is_loopback_client("::1")
    assert is_loopback_client("localhost")


def test_is_loopback_client_rejects_remote_addresses() -> None:
    assert not is_loopback_client("192.0.2.10")
    assert not is_loopback_client("203.0.113.20")
    assert not is_loopback_client("example.com")


def test_is_loopback_client_accepts_testclient_transport_name() -> None:
    assert is_loopback_client("testclient")


def make_request(method: str, headers: dict[str, str]) -> Request:
    return Request(
        {
            "type": "http",
            "method": method,
            "path": "/health",
            "headers": [(key.lower().encode(), value.encode()) for key, value in headers.items()],
        }
    )


def test_is_allowed_browser_origin_accepts_instagram_and_extensions() -> None:
    assert is_allowed_browser_origin("https://www.instagram.com")
    assert is_allowed_browser_origin("chrome-extension://abcdefghijklmnop")
    assert not is_allowed_browser_origin("https://evil.example")


def test_private_network_preflight_allows_instagram_origin() -> None:
    request = make_request(
        "OPTIONS",
        {
            "Origin": "https://www.instagram.com",
            "Access-Control-Request-Private-Network": "true",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    response = private_network_preflight_response(request)

    assert response is not None
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "https://www.instagram.com"
    assert response.headers["Access-Control-Allow-Private-Network"] == "true"


def test_private_network_preflight_rejects_unknown_origin() -> None:
    request = make_request(
        "OPTIONS",
        {
            "Origin": "https://evil.example",
            "Access-Control-Request-Private-Network": "true",
        },
    )

    response = private_network_preflight_response(request)

    assert response is not None
    assert response.status_code == 403

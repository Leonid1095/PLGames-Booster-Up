import asyncio
import logging
import time

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None

# Simple circuit breaker state per node
_circuit_state: dict[str, dict] = {}
_CIRCUIT_THRESHOLD = 3  # failures before opening
_CIRCUIT_RESET_TIMEOUT = 30  # seconds before retrying


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=5.0,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _client


def _is_circuit_open(node_ip: str) -> bool:
    state = _circuit_state.get(node_ip)
    if not state or state["failures"] < _CIRCUIT_THRESHOLD:
        return False
    if time.monotonic() - state["last_failure"] > _CIRCUIT_RESET_TIMEOUT:
        state["failures"] = 0
        return False
    return True


def _record_failure(node_ip: str) -> None:
    state = _circuit_state.setdefault(node_ip, {"failures": 0, "last_failure": 0.0})
    state["failures"] += 1
    state["last_failure"] = time.monotonic()


def _record_success(node_ip: str) -> None:
    _circuit_state.pop(node_ip, None)


async def _request_with_retry(method: str, url: str, node_ip: str, **kwargs) -> bool:
    if _is_circuit_open(node_ip):
        logger.warning("Circuit open for relay %s, skipping request", node_ip)
        return False

    headers = {"X-API-Key": settings.relay_api_key}
    kwargs["headers"] = headers

    for attempt in range(3):
        try:
            resp = await getattr(_get_client(), method)(url, **kwargs)
            if resp.status_code == 200:
                _record_success(node_ip)
                return True
            logger.warning("Relay %s returned %d", node_ip, resp.status_code)
            return False
        except httpx.RequestError as e:
            logger.warning("Relay %s attempt %d failed: %s", node_ip, attempt + 1, e)
            if attempt < 2:
                await asyncio.sleep(0.5 * (attempt + 1))

    _record_failure(node_ip)
    return False


async def register_session_on_relay(
    node_ip: str,
    relay_api_port: int,
    session_token: int,
    game_server_ips: list[str],
    game_ports: list[str],
) -> bool:
    """Register a session on the relay node via its HTTP API."""
    url = f"http://{node_ip}:{relay_api_port}/sessions"
    payload = {
        "session_token": session_token,
        "game_server_ips": game_server_ips,
        "game_ports": game_ports,
    }
    return await _request_with_retry("post", url, node_ip, json=payload)


async def unregister_session_on_relay(
    node_ip: str,
    relay_api_port: int,
    session_token: int,
) -> bool:
    """Remove a session from the relay node."""
    url = f"http://{node_ip}:{relay_api_port}/sessions/{session_token}"
    return await _request_with_retry("delete", url, node_ip)

import httpx

from app.config import settings


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
    headers = {"X-API-Key": settings.relay_api_key}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            return resp.status_code == 200
    except httpx.RequestError:
        return False


async def unregister_session_on_relay(
    node_ip: str,
    relay_api_port: int,
    session_token: int,
) -> bool:
    """Remove a session from the relay node."""
    url = f"http://{node_ip}:{relay_api_port}/sessions/{session_token}"
    headers = {"X-API-Key": settings.relay_api_key}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.delete(url, headers=headers)
            return resp.status_code == 200
    except httpx.RequestError:
        return False

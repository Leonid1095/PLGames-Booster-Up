import httpx


async def get_node_ping(node_ip: str, relay_api_port: int) -> float | None:
    """Get ping/health from a relay node."""
    url = f"http://{node_ip}:{relay_api_port}/health"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("ping_ms")
    except httpx.RequestError:
        pass
    return None

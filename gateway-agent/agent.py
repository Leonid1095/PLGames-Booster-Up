"""
PLGames Booster UP - Gateway Agent
Runs on each gateway node. Monitors ping to game servers,
reports metrics to Prometheus, provides health-check endpoint.
"""

import asyncio
import json
import subprocess
import time
from pathlib import Path

# TODO: Phase 2 - full implementation
# - HTTP API on :8443 for session management
# - Periodic ping to game server IPs
# - Prometheus metrics export
# - Health-check endpoint


async def ping_host(host: str, count: int = 3) -> dict:
    """Ping a host and return RTT stats."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", "-c", str(count), "-W", "2", host,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode()

        # Parse: rtt min/avg/max/mdev = X/X/X/X ms
        for line in output.split("\n"):
            if "rtt" in line or "round-trip" in line:
                parts = line.split("=")[1].strip().split("/")
                return {
                    "host": host,
                    "min_ms": float(parts[0]),
                    "avg_ms": float(parts[1]),
                    "max_ms": float(parts[2]),
                    "loss_pct": 0.0,
                }

        return {"host": host, "avg_ms": -1, "loss_pct": 100.0}
    except Exception:
        return {"host": host, "avg_ms": -1, "loss_pct": 100.0}


if __name__ == "__main__":
    print("PLGames Gateway Agent v0.1.0")
    print("TODO: Full implementation in Phase 2")

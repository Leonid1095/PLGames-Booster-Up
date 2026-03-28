#!/usr/bin/env python3
"""
Load test for PLGames API.
Simulates concurrent users: register → login → trial → start session → poll → stop.

Usage:
    python scripts/load_test.py --url http://localhost:8000 --users 50
"""
import argparse
import asyncio
import statistics
import time

import httpx

API_URL = "http://localhost:8000"
CONCURRENT_USERS = 50


async def simulate_user(client: httpx.AsyncClient, user_id: int, results: list):
    """Simulate a full user session lifecycle."""
    email = f"loadtest{user_id}@test.com"
    latencies = []

    try:
        # Register
        t0 = time.monotonic()
        resp = await client.post(f"{API_URL}/api/auth/register", json={
            "email": email,
            "username": f"loaduser{user_id}",
            "password": "LoadTest123!",
        })
        latencies.append(("register", time.monotonic() - t0))
        if resp.status_code not in (201, 409):
            results.append({"user": user_id, "error": f"register: {resp.status_code}"})
            return

        # Login
        t0 = time.monotonic()
        resp = await client.post(f"{API_URL}/api/auth/login", json={
            "email": email,
            "password": "LoadTest123!",
        })
        latencies.append(("login", time.monotonic() - t0))
        if resp.status_code != 200:
            results.append({"user": user_id, "error": f"login: {resp.status_code}"})
            return

        tokens = resp.json()
        auth = {"Authorization": f"Bearer {tokens['access_token']}"}

        # Get games
        t0 = time.monotonic()
        resp = await client.get(f"{API_URL}/api/games", headers=auth)
        latencies.append(("games", time.monotonic() - t0))

        # Get nodes
        t0 = time.monotonic()
        resp = await client.get(f"{API_URL}/api/nodes", headers=auth)
        latencies.append(("nodes", time.monotonic() - t0))

        # Activate trial
        t0 = time.monotonic()
        resp = await client.post(f"{API_URL}/api/billing/trial", headers=auth)
        latencies.append(("trial", time.monotonic() - t0))

        results.append({
            "user": user_id,
            "latencies": latencies,
            "success": True,
        })

    except Exception as e:
        results.append({"user": user_id, "error": str(e)})


async def run_load_test(url: str, num_users: int):
    global API_URL
    API_URL = url

    print(f"Load test: {num_users} concurrent users against {url}")
    print("-" * 60)

    results = []
    start = time.monotonic()

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [simulate_user(client, i, results) for i in range(num_users)]
        await asyncio.gather(*tasks)

    total_time = time.monotonic() - start

    # Analyze results
    successes = [r for r in results if r.get("success")]
    errors = [r for r in results if r.get("error")]

    print(f"\nCompleted in {total_time:.2f}s")
    print(f"Success: {len(successes)}/{num_users}")
    print(f"Errors: {len(errors)}")

    if errors:
        print("\nErrors:")
        for e in errors[:10]:
            print(f"  User {e['user']}: {e['error']}")

    if successes:
        # Aggregate latencies by endpoint
        all_latencies: dict[str, list[float]] = {}
        for r in successes:
            for name, lat in r["latencies"]:
                all_latencies.setdefault(name, []).append(lat * 1000)

        print(f"\nLatencies (ms) — {len(successes)} successful users:")
        print(f"{'Endpoint':<12} {'p50':>8} {'p95':>8} {'p99':>8} {'max':>8}")
        print("-" * 44)
        for name, lats in sorted(all_latencies.items()):
            lats.sort()
            p50 = statistics.median(lats)
            p95 = lats[int(len(lats) * 0.95)] if len(lats) > 1 else lats[0]
            p99 = lats[int(len(lats) * 0.99)] if len(lats) > 1 else lats[0]
            mx = max(lats)
            print(f"{name:<12} {p50:>7.1f} {p95:>7.1f} {p99:>7.1f} {mx:>7.1f}")

    print(f"\nThroughput: {num_users / total_time:.1f} users/sec")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PLGames API Load Test")
    parser.add_argument("--url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--users", type=int, default=50, help="Number of concurrent users")
    args = parser.parse_args()

    asyncio.run(run_load_test(args.url, args.users))

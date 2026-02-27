#!/usr/bin/env python3
"""
E2E test for PLG Relay Server.

Starts a mock game server (UDP echo), then runs tests against a live relay binary:
  1. Health check
  2. Session registration
  3. Health after registration
  4. Data forwarding (client → relay → mock game → relay → client)
  5. Keepalive (no forwarding)
  6. Control packet (change forward target)
  7. Invalid session (dropped)
  8. Auth required (no API key → 401)
  9. Unregister session
 10. Metrics endpoint

Usage: python3 relay/tests/e2e_test.py
  Expects the relay binary already running with:
    RELAY_PORT=19443 RELAY_API_PORT=19444 RELAY_METRICS_PORT=19445
    RELAY_API_KEY=e2e-test-key
"""

import json
import socket
import struct
import sys
import threading
import time
import urllib.request

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
RELAY_HOST = "127.0.0.1"
RELAY_UDP_PORT = 19443
RELAY_API_PORT = 19444
RELAY_METRICS_PORT = 19445
API_KEY = "e2e-test-key"
MOCK_GAME_PORT = 19999
MOCK_GAME_PORT_ALT = 19998

SESSION_TOKEN = 42
TIMEOUT = 3  # seconds for socket operations

# ---------------------------------------------------------------------------
# PLG Protocol helpers
# ---------------------------------------------------------------------------
HEADER_SIZE = 10
FLAG_KEEPALIVE = 0x02
FLAG_CONTROL = 0x04


def build_plg_packet(session_id: int, seq: int, flags: int, path_id: int, payload: bytes) -> bytes:
    """Build a PLG protocol packet."""
    header = struct.pack(">II", session_id, seq) + bytes([flags, path_id])
    return header + payload


def parse_plg_packet(data: bytes):
    """Parse a PLG protocol packet. Returns (session_id, seq, flags, path_id, payload)."""
    if len(data) < HEADER_SIZE:
        return None
    session_id, seq = struct.unpack(">II", data[:8])
    flags = data[8]
    path_id = data[9]
    payload = data[HEADER_SIZE:]
    return session_id, seq, flags, path_id, payload


# ---------------------------------------------------------------------------
# Mock game server (UDP echo)
# ---------------------------------------------------------------------------
class MockGameServer:
    """UDP echo server that records received packets."""

    def __init__(self, port: int):
        self.port = port
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("127.0.0.1", port))
        self.sock.settimeout(1.0)
        self.received: list[tuple[bytes, tuple]] = []
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self):
        self._thread.start()

    def stop(self):
        self._stop.set()
        self._thread.join(timeout=2)
        self.sock.close()

    def _run(self):
        while not self._stop.is_set():
            try:
                data, addr = self.sock.recvfrom(65535)
                self.received.append((data, addr))
                # Echo back
                self.sock.sendto(data, addr)
            except socket.timeout:
                continue

    def clear(self):
        self.received.clear()

    def wait_for_packet(self, timeout: float = TIMEOUT) -> bool:
        """Wait until at least one packet is received."""
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.received:
                return True
            time.sleep(0.05)
        return False


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------
def api_url(path: str) -> str:
    return f"http://{RELAY_HOST}:{RELAY_API_PORT}{path}"


def metrics_url(path: str) -> str:
    return f"http://{RELAY_HOST}:{RELAY_METRICS_PORT}{path}"


def http_get(url: str, headers: dict | None = None) -> tuple[int, str]:
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def http_post(url: str, body: dict, headers: dict | None = None) -> tuple[int, str]:
    data = json.dumps(body).encode()
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def http_delete(url: str, headers: dict | None = None) -> tuple[int, str]:
    req = urllib.request.Request(url, headers=headers or {}, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------
class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors: list[str] = []

    def run(self, name: str, fn):
        sys.stdout.write(f"  {name} ... ")
        sys.stdout.flush()
        try:
            fn()
            self.passed += 1
            print("PASS")
        except AssertionError as e:
            self.failed += 1
            self.errors.append(f"{name}: {e}")
            print(f"FAIL — {e}")
        except Exception as e:
            self.failed += 1
            self.errors.append(f"{name}: {type(e).__name__}: {e}")
            print(f"ERROR — {type(e).__name__}: {e}")

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*50}")
        print(f"Results: {self.passed}/{total} tests passed")
        if self.errors:
            print("\nFailures:")
            for err in self.errors:
                print(f"  - {err}")
        print(f"{'='*50}")
        return self.failed == 0


# ---------------------------------------------------------------------------
# UDP client helper
# ---------------------------------------------------------------------------
def make_client_socket() -> socket.socket:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(TIMEOUT)
    return sock


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
def main():
    print("PLG Relay E2E Tests")
    print("=" * 50)

    # Start mock game servers.
    mock_primary = MockGameServer(MOCK_GAME_PORT)
    mock_alt = MockGameServer(MOCK_GAME_PORT_ALT)
    mock_primary.start()
    mock_alt.start()

    runner = TestRunner()

    try:
        # -- 1. Health check --
        def test_health():
            status, body = http_get(api_url("/health"))
            assert status == 200, f"expected 200, got {status}"
            data = json.loads(body)
            assert data["status"] == "ok"
            assert data["active_sessions"] == 0, f"expected 0 sessions, got {data['active_sessions']}"

        runner.run("test_health", test_health)

        # -- 2. Register session --
        registered_token = None

        def test_register_session():
            nonlocal registered_token
            status, body = http_post(
                api_url("/sessions"),
                {
                    "session_token": SESSION_TOKEN,
                    "game_server_ips": ["127.0.0.1"],
                    "game_ports": [str(MOCK_GAME_PORT)],
                },
                headers={"X-API-Key": API_KEY},
            )
            assert status == 200, f"expected 200, got {status}: {body}"
            data = json.loads(body)
            assert data["status"] == "ok"
            assert data["session_token"] == SESSION_TOKEN
            assert "local_port" in data
            registered_token = data["session_token"]

        runner.run("test_register_session", test_register_session)

        # -- 3. Health after registration --
        def test_health_after_register():
            status, body = http_get(api_url("/health"))
            data = json.loads(body)
            assert data["active_sessions"] == 1, f"expected 1 session, got {data['active_sessions']}"

        runner.run("test_health_after_register", test_health_after_register)

        # -- 4. Data forwarding --
        def test_data_forwarding():
            mock_primary.clear()
            client = make_client_socket()
            try:
                test_payload = b"Hello, game server!"
                pkt = build_plg_packet(SESSION_TOKEN, 1, 0, 0, test_payload)
                client.sendto(pkt, (RELAY_HOST, RELAY_UDP_PORT))

                # Wait for mock game server to receive the forwarded payload.
                assert mock_primary.wait_for_packet(), "mock game server did not receive packet"
                received_data, _ = mock_primary.received[0]
                assert received_data == test_payload, (
                    f"payload mismatch: expected {test_payload!r}, got {received_data!r}"
                )

                # Wait for relay to send back the response wrapped in PLG header.
                resp_data, _ = client.recvfrom(65535)
                parsed = parse_plg_packet(resp_data)
                assert parsed is not None, "failed to parse response PLG packet"
                resp_sid, resp_seq, resp_flags, resp_path, resp_payload = parsed
                assert resp_sid == SESSION_TOKEN, f"response session_id mismatch: {resp_sid}"
                assert resp_payload == test_payload, (
                    f"response payload mismatch: expected {test_payload!r}, got {resp_payload!r}"
                )
            finally:
                client.close()

        runner.run("test_data_forwarding", test_data_forwarding)

        # -- 5. Keepalive (no forwarding) --
        def test_keepalive():
            mock_primary.clear()
            client = make_client_socket()
            try:
                pkt = build_plg_packet(SESSION_TOKEN, 2, FLAG_KEEPALIVE, 0, b"")
                client.sendto(pkt, (RELAY_HOST, RELAY_UDP_PORT))

                # Give relay time to process.
                time.sleep(0.3)

                # Mock server should NOT have received anything.
                assert len(mock_primary.received) == 0, (
                    f"keepalive was forwarded: mock received {len(mock_primary.received)} packets"
                )
            finally:
                client.close()

        runner.run("test_keepalive", test_keepalive)

        # -- 6. Control packet (change forward target) --
        def test_control_packet():
            mock_alt.clear()

            # First, re-register the session with both IPs allowed.
            # Unregister old session.
            http_delete(
                api_url(f"/sessions/{SESSION_TOKEN}"),
                headers={"X-API-Key": API_KEY},
            )
            time.sleep(0.2)

            # Register with alt port in allowed list.
            status, body = http_post(
                api_url("/sessions"),
                {
                    "session_token": SESSION_TOKEN,
                    "game_server_ips": ["127.0.0.1"],
                    "game_ports": [str(MOCK_GAME_PORT), str(MOCK_GAME_PORT_ALT)],
                },
                headers={"X-API-Key": API_KEY},
            )
            assert status == 200, f"re-register failed: {status} {body}"
            time.sleep(0.2)

            client = make_client_socket()
            try:
                # Send control packet to switch to alt target.
                control_payload = f"127.0.0.1:{MOCK_GAME_PORT_ALT}".encode()
                ctrl_pkt = build_plg_packet(SESSION_TOKEN, 3, FLAG_CONTROL, 0, control_payload)
                client.sendto(ctrl_pkt, (RELAY_HOST, RELAY_UDP_PORT))
                time.sleep(0.2)

                # Send data packet — should go to alt mock server.
                test_payload = b"Alt target test"
                data_pkt = build_plg_packet(SESSION_TOKEN, 4, 0, 0, test_payload)
                client.sendto(data_pkt, (RELAY_HOST, RELAY_UDP_PORT))

                assert mock_alt.wait_for_packet(), "alt mock server did not receive packet"
                received_data, _ = mock_alt.received[0]
                assert received_data == test_payload, (
                    f"alt payload mismatch: expected {test_payload!r}, got {received_data!r}"
                )
            finally:
                client.close()

        runner.run("test_control_packet", test_control_packet)

        # -- 7. Invalid session --
        def test_invalid_session():
            mock_primary.clear()
            client = make_client_socket()
            try:
                pkt = build_plg_packet(0xDEAD, 1, 0, 0, b"should be dropped")
                client.sendto(pkt, (RELAY_HOST, RELAY_UDP_PORT))

                time.sleep(0.3)

                # Mock server should NOT have received anything.
                assert len(mock_primary.received) == 0, (
                    "invalid session packet was forwarded"
                )

                # Client should NOT receive a response.
                client.settimeout(0.5)
                try:
                    client.recvfrom(65535)
                    assert False, "received unexpected response for invalid session"
                except socket.timeout:
                    pass  # Expected — no response.
            finally:
                client.close()

        runner.run("test_invalid_session", test_invalid_session)

        # -- 8. Auth required --
        def test_auth_required():
            # POST /sessions without API key → 401.
            status, body = http_post(
                api_url("/sessions"),
                {
                    "session_token": 999,
                    "game_server_ips": ["127.0.0.1"],
                    "game_ports": ["19999"],
                },
            )
            assert status == 401, f"expected 401, got {status}: {body}"

        runner.run("test_auth_required", test_auth_required)

        # -- 9. Unregister session --
        def test_unregister():
            status, body = http_delete(
                api_url(f"/sessions/{SESSION_TOKEN}"),
                headers={"X-API-Key": API_KEY},
            )
            assert status == 200, f"expected 200, got {status}: {body}"

            # Verify sessions count is 0.
            status, body = http_get(api_url("/health"))
            data = json.loads(body)
            assert data["active_sessions"] == 0, (
                f"expected 0 sessions after unregister, got {data['active_sessions']}"
            )

        runner.run("test_unregister", test_unregister)

        # -- 10. Metrics endpoint --
        def test_metrics():
            status, body = http_get(metrics_url("/metrics"))
            assert status == 200, f"expected 200, got {status}"
            # Should contain plg_ prefixed metrics.
            assert "plg_packets_received_total" in body, "missing plg_packets_received_total"
            assert "plg_active_sessions" in body, "missing plg_active_sessions"
            assert "plg_packets_forwarded_total" in body, "missing plg_packets_forwarded_total"

        runner.run("test_metrics", test_metrics)

    finally:
        mock_primary.stop()
        mock_alt.stop()

    ok = runner.summary()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

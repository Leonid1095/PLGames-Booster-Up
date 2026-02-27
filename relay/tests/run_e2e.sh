#!/bin/bash
set -euo pipefail

# Source cargo environment.
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RELAY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$RELAY_DIR")"

echo "=== PLG Relay E2E Test Runner ==="

# Step 1: Build relay binary.
echo "[1/4] Building relay (cargo build --release)..."
cd "$RELAY_DIR"
cargo build --release 2>&1
BINARY="$RELAY_DIR/target/release/plg-relay"

if [ ! -f "$BINARY" ]; then
    echo "ERROR: binary not found at $BINARY"
    exit 1
fi
echo "      Binary: $BINARY"

# Step 2: Start relay with test ports.
echo "[2/4] Starting relay server..."
export RELAY_API_KEY="e2e-test-key"
export RELAY_PORT=19443
export RELAY_API_PORT=19444
export RELAY_METRICS_PORT=19445
export RUST_LOG=info

"$BINARY" &
RELAY_PID=$!
echo "      Relay PID: $RELAY_PID"

# Ensure cleanup on exit.
cleanup() {
    echo "[4/4] Stopping relay (PID $RELAY_PID)..."
    kill "$RELAY_PID" 2>/dev/null || true
    wait "$RELAY_PID" 2>/dev/null || true
    echo "      Done."
}
trap cleanup EXIT

# Step 3: Wait for relay to be ready.
echo "[3/4] Waiting for relay to start..."
for i in $(seq 1 30); do
    if curl -s "http://127.0.0.1:19444/health" >/dev/null 2>&1; then
        echo "      Relay is ready (took ${i}s)"
        break
    fi
    if ! kill -0 "$RELAY_PID" 2>/dev/null; then
        echo "ERROR: Relay process died during startup"
        exit 1
    fi
    sleep 1
done

# Verify relay is actually running.
if ! curl -s "http://127.0.0.1:19444/health" >/dev/null 2>&1; then
    echo "ERROR: Relay did not become ready within 30s"
    exit 1
fi

# Step 4: Run E2E tests.
echo ""
python3 "$SCRIPT_DIR/e2e_test.py"
TEST_EXIT=$?

exit $TEST_EXIT

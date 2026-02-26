#!/bin/bash
# PLGames Booster UP - Gateway Node Setup
# Run on each gateway node (DE, SE, US, LV)
# Usage: sudo bash setup-gateway.sh <NODE_LOCATION>
# Example: sudo bash setup-gateway.sh DE

set -euo pipefail

NODE_LOCATION="${1:-}"

if [ -z "$NODE_LOCATION" ]; then
    echo "Usage: sudo bash setup-gateway.sh <NODE_LOCATION>"
    echo "  NODE_LOCATION: DE, SE, US, LV"
    exit 1
fi

echo "=== PLGames Gateway Node Setup: $NODE_LOCATION ==="

# ─── 1. SYSCTL: Network optimizations ───
echo "[1/5] Configuring sysctl..."
cat > /etc/sysctl.d/99-plgames.conf << 'SYSEOF'
# === IP Forwarding ===
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1

# === UDP Buffer Optimization (gaming) ===
net.core.rmem_max=26214400
net.core.wmem_max=26214400
net.core.rmem_default=1048576
net.core.wmem_default=1048576

# === Conntrack: faster UDP timeout ===
net.netfilter.nf_conntrack_udp_timeout=30
net.netfilter.nf_conntrack_udp_timeout_stream=60
net.netfilter.nf_conntrack_max=262144

# === BBR Congestion Control ===
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr

# === Network Performance ===
net.core.somaxconn=65535
net.core.netdev_max_backlog=65535
net.ipv4.tcp_max_syn_backlog=65535
net.ipv4.tcp_fin_timeout=15
net.ipv4.tcp_tw_reuse=1

# === Disable ICMP redirects ===
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.default.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
SYSEOF

sysctl -p /etc/sysctl.d/99-plgames.conf

# ─── 2. NAT: iptables MASQUERADE ───
echo "[2/5] Configuring NAT..."

# Detect main network interface
MAIN_IF=$(ip route | grep default | awk '{print $5}' | head -1)
echo "Main interface: $MAIN_IF"

# Set up NAT
iptables -t nat -A POSTROUTING -o "$MAIN_IF" -j MASQUERADE

# Allow forwarding
iptables -A FORWARD -i "$MAIN_IF" -o "$MAIN_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -j ACCEPT

# Persist iptables rules
apt-get install -y iptables-persistent
netfilter-persistent save

# ─── 3. UFW: Open required ports ───
echo "[3/5] Configuring UFW..."

# PLG Relay (main protocol)
ufw allow 443/udp comment "PLG Relay"

# WireGuard fallback (Phase 12)
ufw allow 51820/udp comment "WireGuard fallback"

# Health-check API (restrict to central server IP later)
ufw allow 8443/tcp comment "Gateway Agent API"

# Prometheus metrics (restrict to central server IP later)
ufw allow 9100/tcp comment "Prometheus metrics"

ufw reload

# ─── 4. WireGuard: Install (for future fallback) ───
echo "[4/5] Installing WireGuard..."
apt-get install -y wireguard wireguard-tools

# Generate server keys
mkdir -p /etc/wireguard/keys
wg genkey | tee /etc/wireguard/keys/server.key | wg pubkey > /etc/wireguard/keys/server.pub
chmod 600 /etc/wireguard/keys/server.key

# Determine WG subnet based on node location
case "$NODE_LOCATION" in
    DE) WG_SUBNET="10.10.1" ;;
    SE) WG_SUBNET="10.10.2" ;;
    US) WG_SUBNET="10.10.3" ;;
    LV) WG_SUBNET="10.10.4" ;;
    *)  WG_SUBNET="10.10.9" ;;
esac

SERVER_KEY=$(cat /etc/wireguard/keys/server.key)

cat > /etc/wireguard/wg0.conf << WGEOF
[Interface]
PrivateKey = $SERVER_KEY
Address = ${WG_SUBNET}.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o ${MAIN_IF} -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o ${MAIN_IF} -j MASQUERADE

# Peers will be added dynamically by the API
WGEOF

chmod 600 /etc/wireguard/wg0.conf

# Don't start WG yet - it's a fallback for Phase 12
# systemctl enable wg-quick@wg0
# systemctl start wg-quick@wg0

# ─── 5. Create directories for PLG Relay and Agent ───
echo "[5/5] Creating service directories..."
mkdir -p /opt/plgames/relay
mkdir -p /opt/plgames/gateway-agent
mkdir -p /opt/plgames/logs

# Save node info
cat > /opt/plgames/node.json << NODEEOF
{
    "location": "$NODE_LOCATION",
    "relay_port": 443,
    "wg_port": 51820,
    "wg_subnet": "${WG_SUBNET}.0/24",
    "wg_public_key": "$(cat /etc/wireguard/keys/server.pub)",
    "setup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
NODEEOF

echo ""
echo "=== Gateway setup complete: $NODE_LOCATION ==="
echo ""
echo "Node info saved to: /opt/plgames/node.json"
echo "WG public key: $(cat /etc/wireguard/keys/server.pub)"
echo ""
echo "Next steps:"
echo "  1. Deploy PLG Relay binary to /opt/plgames/relay/"
echo "  2. Deploy Gateway Agent to /opt/plgames/gateway-agent/"
echo "  3. Install systemd services"
echo "  4. Register node in central API"

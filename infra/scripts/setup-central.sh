#!/bin/bash
# PLGames Booster UP - Central Server Setup
# Run on the DE central server
# Usage: sudo bash setup-central.sh

set -euo pipefail

echo "=== PLGames Central Server Setup ==="

# ─── 1. Install Docker ───
echo "[1/4] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker compose version)"

# ─── 2. Install Nginx ───
echo "[2/4] Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx

# ─── 3. UFW for central server ───
echo "[3/4] Configuring UFW..."
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw reload

# ─── 4. Create project directory ───
echo "[4/4] Creating directories..."
mkdir -p /opt/plgames
mkdir -p /opt/plgames/backups

echo ""
echo "=== Central server setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Clone repo to /opt/plgames/"
echo "  2. Copy .env from .env.example and fill in values"
echo "  3. Run: cd /opt/plgames/infra && docker compose up -d"
echo "  4. Copy nginx config: cp infra/nginx/nginx.conf /etc/nginx/sites-available/plgames"
echo "  5. Enable site: ln -s /etc/nginx/sites-available/plgames /etc/nginx/sites-enabled/"
echo "  6. Test: nginx -t && systemctl reload nginx"

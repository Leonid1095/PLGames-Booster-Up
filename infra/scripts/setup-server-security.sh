#!/bin/bash
# PLGames Booster UP - Server Security Hardening
# Run on ALL servers (central + gateway nodes)
# Usage: sudo bash setup-server-security.sh

set -euo pipefail

echo "=== PLGames Server Security Setup ==="

# Update system
echo "[1/6] Updating system..."
apt-get update && apt-get upgrade -y

# Install essentials
echo "[2/6] Installing essentials..."
apt-get install -y \
    ufw \
    fail2ban \
    curl \
    wget \
    htop \
    iftop \
    vnstat \
    unattended-upgrades

# Configure UFW
echo "[3/6] Configuring UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
# Additional ports should be opened per-server:
# Central: 80, 443 (HTTP/HTTPS)
# Gateway: 443/udp (PLG Relay), 51820/udp (WG fallback)
echo "y" | ufw enable

# Configure fail2ban
echo "[4/6] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'JAILEOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
JAILEOF

systemctl enable fail2ban
systemctl restart fail2ban

# Disable root password login (SSH key only)
echo "[5/6] Hardening SSH..."
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart sshd

# Enable automatic security updates
echo "[6/6] Enabling automatic security updates..."
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTOEOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOEOF

echo "=== Security setup complete ==="
echo "IMPORTANT: Make sure you have SSH key access before disconnecting!"
echo "Test SSH login in a new terminal before closing this session."

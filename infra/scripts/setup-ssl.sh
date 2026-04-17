#!/bin/bash
# PLGames Booster UP - SSL Certificate Setup (Let's Encrypt)
#
# Prerequisites:
#   apt install certbot
#   nginx must be running with port 80 open
#
# Usage:
#   bash infra/scripts/setup-ssl.sh plgames-boost.duckdns.org
#
# After setup, add auto-renewal to cron:
#   0 0 1 * * certbot renew --quiet && systemctl reload nginx

set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain>}"

echo "=== Setting up SSL for $DOMAIN ==="

# Create webroot for ACME challenge
mkdir -p /var/www/certbot

# Get certificate
certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --domain "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "${CERTBOT_EMAIL:-admin@$DOMAIN}" \
    --no-eff-email

echo "=== Certificate obtained ==="
echo "Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "Key:         /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "Reload nginx:"
echo "  systemctl reload nginx"
echo ""
echo "Add auto-renewal to cron:"
echo "  0 0 1 * * certbot renew --quiet && systemctl reload nginx"

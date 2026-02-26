#!/bin/bash
# PLGames Booster UP - Database Backup
# Add to cron: 0 3 * * * /opt/plgames/infra/scripts/backup.sh
# Keeps last 7 daily backups

set -euo pipefail

BACKUP_DIR="/opt/plgames/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/plgames_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting backup: $BACKUP_FILE"

docker exec plgames-db pg_dump -U "${POSTGRES_USER:-plgames}" "${POSTGRES_DB:-plgames}" | gzip > "$BACKUP_FILE"

echo "Backup complete: $(du -h "$BACKUP_FILE" | cut -f1)"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "plgames_*.sql.gz" -mtime +7 -delete

echo "Old backups cleaned. Current backups:"
ls -lh "$BACKUP_DIR"/plgames_*.sql.gz 2>/dev/null || echo "  (none)"

#!/bin/sh

# Nexora Postgres Database Automated Backup & S3 Sync Script
# To execute this automatically, configure a Cron Job:
# 0 2 * * * /app/scripts/backup-db.sh >> /var/log/db_backups.log 2>&1

DB_HOST=${DB_HOST:-"db"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"nexora"}
DB_USER=${DB_USER:-"postgres"}
BACKUP_DIR=${BACKUP_DIR:-"/tmp/db_backups"}
AWS_S3_BUCKET=${AWS_S3_BUCKET:-"nexora-production-backups-s3"}

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/nexora_backup_$DATE.sql.gz"

echo "=== Backup Process Started: $(date) ==="

# 1. Ensure local backup directory exists
mkdir -p "$BACKUP_DIR"

# 2. Execute database dump
echo "Exporting database dump from $DB_HOST:$DB_PORT..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Database dump exported and compressed successfully: $BACKUP_FILE"
else
    echo "ERROR: Database dump export failed!" >&2
    exit 1
fi

# 3. Synchronize backup to AWS S3 Bucket
echo "Uploading backup file to S3 bucket: s3://$AWS_S3_BUCKET..."
aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/database/nexora_backup_$DATE.sql.gz"

if [ $? -eq 0 ]; then
    echo "S3 Synchronization completed successfully!"
else
    echo "WARNING: S3 upload failed! Local backup preserved." >&2
fi

# 4. Clean up local backups older than 14 days to conserve disk space
echo "Cleaning up local backups older than 14 days..."
find "$BACKUP_DIR" -type f -mtime +14 -name "*.sql.gz" -exec rm -f {} \;

echo "=== Backup Process Completed: $(date) ==="

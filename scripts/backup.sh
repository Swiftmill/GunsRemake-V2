#!/usr/bin/env bash
set -euo pipefail
DATA_DIR="${GUNS_DATA_DIR:-$(cd "$(dirname "$0")/.." && pwd)/data/guns}"
BACKUP_DIR="$DATA_DIR/backups"
mkdir -p "$BACKUP_DIR"
STAMP=$(date +"%Y%m%d-%H%M%S")
ARCHIVE="$BACKUP_DIR/guns-backup-$STAMP.zip"
( cd "$DATA_DIR" && zip -r "$ARCHIVE" . >/dev/null )
echo "Backup created at $ARCHIVE"

#!/usr/bin/env bash
set -euo pipefail
if [ $# -lt 1 ]; then
  echo "Usage: $0 <archive.zip>" >&2
  exit 1
fi
ARCHIVE="$1"
if [ ! -f "$ARCHIVE" ]; then
  echo "Archive not found: $ARCHIVE" >&2
  exit 1
fi
DATA_DIR="${GUNS_DATA_DIR:-$(cd "$(dirname "$0")/.." && pwd)/data/guns}"
mkdir -p "$DATA_DIR"
unzip -oq "$ARCHIVE" -d "$DATA_DIR"
echo "Restored archive into $DATA_DIR"

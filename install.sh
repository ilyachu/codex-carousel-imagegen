#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$ROOT_DIR/.agents/skills/codex-carousel-imagegen"
TARGET_ROOT_CANONICAL="${HOME}/.codex/skills"
TARGET_DIR_CANONICAL="${TARGET_ROOT_CANONICAL}/codex-carousel-imagegen"
TARGET_ROOT_LEGACY="${HOME}/.agents/skills"
TARGET_DIR_LEGACY="${TARGET_ROOT_LEGACY}/codex-carousel-imagegen"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Source skill not found: $SOURCE_DIR" >&2
  exit 1
fi

backup_if_exists() {
  local target_dir="$1"
  if [ -e "$target_dir" ]; then
    local timestamp
    timestamp="$(date +"%Y%m%d-%H%M%S")"
    local backup_dir="${target_dir}.backup-${timestamp}"
    mv "$target_dir" "$backup_dir"
    echo "Existing skill backed up to: $backup_dir"
  fi
}

mkdir -p "$TARGET_ROOT_CANONICAL"
backup_if_exists "$TARGET_DIR_CANONICAL"
cp -R "$SOURCE_DIR" "$TARGET_DIR_CANONICAL"
echo "Installed skill to canonical Codex path: $TARGET_DIR_CANONICAL"

mkdir -p "$TARGET_ROOT_LEGACY"
backup_if_exists "$TARGET_DIR_LEGACY"
cp -R "$SOURCE_DIR" "$TARGET_DIR_LEGACY"
echo "Installed skill to legacy compatibility path: $TARGET_DIR_LEGACY"

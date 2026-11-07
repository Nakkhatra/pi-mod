#!/usr/bin/env bash
# install.sh — apply all pi-mod customizations to ~/.pi/agent/
#
# Usage:
#   ./install.sh            # copy everything (default)
#   ./install.sh --link     # symlink instead of copy (live-edit this repo)
#   ./install.sh --dry-run  # show what would happen
#
# Safe to re-run: existing files are backed up to ~/.pi/agent/.backup-<ts>/.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
SRC="$REPO/package"
DEST="${HOME}/.pi/agent"
MODE="copy"
DRY=0
[ "${1:-}" = "--link" ] && MODE="link"
[ "${1:-}" = "--dry-run" ] && DRY=1

backup_dir="$DEST/.backup-$(date +%Y%m%d-%H%M%S)"
made_backup=0

apply() { # apply <src> <dest-relative-path>
  local src="$1" rel="$2" dst="$DEST/$2"
  if [ $DRY -eq 1 ]; then echo "  [$MODE] $rel"; return; fi
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    if [ $made_backup -eq 0 ]; then mkdir -p "$backup_dir"; made_backup=1; fi
    mkdir -p "$backup_dir/$(dirname "$rel")"
    mv "$dst" "$backup_dir/$rel"
  fi
  mkdir -p "$(dirname "$dst")"
  if [ "$MODE" = "link" ]; then
    ln -s "$src" "$dst"
  else
    cp -r "$src" "$dst"
  fi
  echo "  [$MODE] $rel"
}

echo "Installing pi-mod package -> $DEST ($MODE mode)"

# Extensions
for f in "$SRC"/extensions/*.ts; do
  apply "$f" "extensions/$(basename "$f")"
done
# Subagent extension: pi ships it in examples; symlink like the original setup
if [ $DRY -eq 0 ] && [ ! -e "$DEST/extensions/subagent" ]; then
  PI_EXAMPLES="$(dirname "$(readlink -f "$(command -v pi)")")/../lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/subagent"
  if [ -d "$PI_EXAMPLES" ]; then
    ln -s "$PI_EXAMPLES" "$DEST/extensions/subagent"
    echo "  [link] extensions/subagent -> bundled examples"
  else
    echo "  [skip] extensions/subagent (bundled examples not found; edit PI_EXAMPLES in install.sh)"
  fi
fi

# Agents, prompts, themes
for f in "$SRC"/agents/*.md;  do apply "$f" "agents/$(basename "$f")";  done
for f in "$SRC"/prompts/*.md; do apply "$f" "prompts/$(basename "$f")"; done
for f in "$SRC"/themes/*.json; do apply "$f" "themes/$(basename "$f")"; done

# Skills (directories)
for d in "$SRC"/skills/*/; do
  apply "$d" "skills/$(basename "$d")"
done

# Config + global instructions
apply "$SRC/settings.json" "settings.json"
apply "$SRC/models.json" "models.json"
apply "$SRC/presets.json" "presets.json"
apply "$SRC/AGENTS-global.md" "AGENTS.md"

echo "Done. Restart pi to load extensions/themes."
[ $made_backup -eq 1 ] && echo "Previous files backed up in $backup_dir"

---
objective: Restructure pi-mod repo as a portable install package
status: done
date: 2026-11-08 01:18
branch: feature-portable-package
---
## Done
- Inventoried all live ~/.pi/agent customizations (5 extensions, researcher agent, research-and-plan prompt, 3 skills, 5 themes, settings/models/presets, global AGENTS.md)
- Created package/ mirroring all live artifacts + package/README.md manifest
- Created install.sh (copy/--link/--dry-run, backs up existing files to ~/.pi/agent/.backup-<ts>)
- Real install verified; committed on feature-portable-package (b3e41f5)

## Didn't work
- install.sh --dry-run originally MOVED live files into backup before the DRY check — fixed by checking DRY first. Never move files in dry mode.

## Left
- git push (manual, per rules)
- Optional: ./install.sh --link mode for live-editing workflow; update PROJECT.md conventions if adopted

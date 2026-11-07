# Global Instructions

## Long-running commands: always background

Never run commands that take longer than ~10 seconds in the foreground. The
agent turn blocks while a foreground tool call runs, which delays the user's
queued/steering messages until the call finishes. Instead:

- Run it in the background: `nohup <cmd> > /tmp/<name>.log 2>&1 & echo "bg PID $!"`
- Immediately report the PID and log path, then continue/end the turn.
- Check progress later by reading the log or polling the PID — e.g. when the
  user asks, or on a following turn (`ps -p <PID>`, `tail /tmp/<name>.log`).
- User wants it stopped? `kill <PID>`.

## Git commits

After completing a significant feature or bug fix (not mid-task or WIP changes), commit it:

- Never commit directly to `main`/`master`. Check the current branch first; if on main, create a new branch before committing (name it for the change, e.g. `fix-auth-token-expiry`, `feature-search-reindex`).
- Branch names: kebab-case, lowercase, no spaces — they double as handoff lane names.
- Write a clear, specific commit message describing what changed and why.
- Never run `git push`. Committing is your job; pushing is manual, done by the user only.
- Use judgment on "significant" — a completed task, a diagnosed-and-fixed bug, a working feature slice. Don't commit broken or half-done code.

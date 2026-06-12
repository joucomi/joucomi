#!/usr/bin/env bash
#
# Auto-checkpoint hook (runs on Claude Code "Stop", i.e. after every turn).
#
# Why this exists:
#   Web sessions run in a throwaway container. If a session is interrupted and
#   abandoned, any un-pushed work is gone forever and /recap can never find it.
#   This hook persists each turn's state to GitHub *before* the container can
#   die, so mid-session leftovers survive.
#
# What it does, only when the working tree actually changed:
#   1. Snapshots the working tree (code + the .claude/journal note) into a
#      per-session WIP branch:  claude/wip/<date>-<session8>
#   2. Pushes that branch to origin.
#   It does this WITHOUT touching your current branch or working tree:
#   it builds the commit with `commit-tree` on a side ref, never moving HEAD.
#
# It never blocks or fails the turn: all errors are logged and it exits 0.

set -uo pipefail

# --- locate the project root (prefer the value Claude Code provides) ---
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

# must be a git repo
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

LOG="$PROJECT_DIR/.claude/checkpoint.log"
log() { echo "[$(date -u +%FT%TZ)] $*" >> "$LOG" 2>/dev/null; }

# --- read the session id from the hook's JSON stdin (no jq dependency) ---
input="$(cat)"
sid="$(printf '%s' "$input" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
short_sid="${sid:0:8}"; [ -z "$short_sid" ] && short_sid="nosid"

base_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
wip_branch="claude/wip/$(date -u +%F)-${short_sid}"

# nothing changed this turn -> nothing worth checkpointing (e.g. pure Q&A)
if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  exit 0
fi

# stage everything into the index, then build a tree object from it
git add -A 2>/dev/null
tree="$(git write-tree 2>/dev/null)"
if [ -z "$tree" ]; then log "write-tree failed"; git reset -q 2>/dev/null; exit 0; fi

# parent = the last checkpoint on this session's wip branch, else current HEAD
if git rev-parse --verify -q "refs/heads/${wip_branch}" >/dev/null 2>&1; then
  parent="$(git rev-parse "refs/heads/${wip_branch}")"
else
  parent="$(git rev-parse HEAD 2>/dev/null)"
fi

msg="checkpoint: ${base_branch} @ $(date -u +%FT%TZ) [session ${short_sid}]"
if [ -n "$parent" ]; then
  commit="$(git commit-tree "$tree" -p "$parent" -m "$msg" 2>/dev/null)"
else
  commit="$(git commit-tree "$tree" -m "$msg" 2>/dev/null)"
fi
if [ -z "$commit" ]; then log "commit-tree failed"; git reset -q 2>/dev/null; exit 0; fi

# move the side branch to the new snapshot, then restore the index so the
# user's real branch and working tree are exactly as they were.
git update-ref "refs/heads/${wip_branch}" "$commit" 2>/dev/null
git reset -q 2>/dev/null

# push (best effort, capped so it never hangs the turn)
if timeout 30 git push -q -f -u origin "${wip_branch}" >/dev/null 2>&1; then
  log "pushed ${wip_branch} (${commit:0:8}) base=${base_branch}"
else
  log "push failed/slow ${wip_branch}"
fi

exit 0

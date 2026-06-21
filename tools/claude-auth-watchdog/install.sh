#!/bin/bash
# claude-auth-watchdog を Mac にインストールする。
# リポジトリ内の正本を ~/bin と ~/Library/LaunchAgents にコピーして launchd に登録し、
# 最後に Slack へテスト投稿して「通知が本当に飛ぶか」を確認する。
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
BIN_DST="$HOME/bin/claude_auth_watchdog.sh"
PLIST_DST="$HOME/Library/LaunchAgents/com.kyog.claude-auth-watchdog.plist"
LABEL="com.kyog.claude-auth-watchdog"
TOKEN_FILE="$HOME/.config/diet/slack-token"
CHANNEL="${CLAUDE_WATCHDOG_CHANNEL:-C0B452M6CEP}"

mkdir -p "$HOME/bin" "$HOME/Library/LaunchAgents"
cp "$HERE/claude_auth_watchdog.sh" "$BIN_DST"; chmod +x "$BIN_DST"
cp "$HERE/com.kyog.claude-auth-watchdog.plist" "$PLIST_DST"
echo "installed: $BIN_DST"
echo "installed: $PLIST_DST"

# 再登録
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
if launchctl bootstrap "gui/$(id -u)" "$PLIST_DST" 2>/dev/null; then
  echo "launchd: bootstrapped $LABEL"
else
  launchctl load "$PLIST_DST" && echo "launchd: loaded $LABEL (fallback)"
fi
launchctl print "gui/$(id -u)/$LABEL" 2>/dev/null | grep -E 'state =|runs =|StartInterval' || true

# Slack 通知が本当に飛ぶか確認（chat:write 権限の検証）
echo "--- Slack test post ---"
if [ -r "$TOKEN_FILE" ]; then
  tok=$(tr -d '\r\n' < "$TOKEN_FILE")
  curl -sS --max-time 20 -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer $tok" -H "Content-Type: application/json; charset=utf-8" \
    --data "$(jq -n --arg c "$CHANNEL" '{channel:$c,text:":wrench: claude-auth-watchdog インストール完了。これが見えていれば通知は機能します。",unfurl_links:false}')" \
    | jq .
  echo ">>> 上が ok:true なら通知OK。ok:false (missing_scope / not_allowed_token_type) なら chat:write 権限のあるトークンを $TOKEN_FILE に置く必要あり。"
else
  echo "WARN: $TOKEN_FILE が読めません。Slackトークンを置いてください。"
fi

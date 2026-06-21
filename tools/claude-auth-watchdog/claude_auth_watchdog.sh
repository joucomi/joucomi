#!/bin/bash
# claude (Claude Code サブスクログイン) の認証切れ(401)を検知し、
# 直るまで Slack に通知し続ける watchdog。
#   - launchd: com.kyog.claude-auth-watchdog (既定 30分毎 / RunAtLoad)
#   - Slack 投稿は claude を使わず Slackトークン+curl 直なので、claudeが死んでても飛ぶ
#   - 401 の間は毎回通知（"気づくまで出し続ける"）。復旧したら1回だけ "✅復旧" を出して黙る
set -uo pipefail

CLAUDE_BIN="/Users/kyog1/.local/bin/claude"
GTIMEOUT="/opt/homebrew/bin/gtimeout"
TOKEN_FILE="/Users/kyog1/.config/diet/slack-token"
CHANNEL="${CLAUDE_WATCHDOG_CHANNEL:-C0B452M6CEP}"   # 既定: #claude_diet
MENTION="${CLAUDE_WATCHDOG_MENTION:-<@U08HVTERMU2>}"
STATE_FILE="/Users/kyog1/.cache/claude_auth_watchdog.state"
LOG_FILE="/Users/kyog1/Library/Logs/claude_auth_watchdog.log"

export PATH="/Users/kyog1/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
mkdir -p "$(dirname "$STATE_FILE")" "$(dirname "$LOG_FILE")"

ts(){ date '+%Y-%m-%d %H:%M:%S'; }
log(){ echo "$(ts) $*" >> "$LOG_FILE"; }

post(){  # $1 = text
  [ -r "$TOKEN_FILE" ] || { log "ERROR: slack token not readable ($TOKEN_FILE)"; return 1; }
  local tok; tok=$(tr -d '\r\n' < "$TOKEN_FILE")
  local resp; resp=$(curl -sS --max-time 20 -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data "$(jq -n --arg c "$CHANNEL" --arg t "$1" '{channel:$c,text:$t,unfurl_links:false}')")
  log "slack: $(echo "$resp" | jq -r '"ok=\(.ok) err=\(.error // "-")"' 2>/dev/null || echo "$resp")"
}

# --- 認証プローブ（401なら即失敗するのでトークン消費ほぼ0） ---
OUT=$("$GTIMEOUT" 60 "$CLAUDE_BIN" --print --output-format text --dangerously-skip-permissions "ping" 2>&1)
CODE=$?
BROKEN=0
if [ "$CODE" != "0" ] && echo "$OUT" | grep -qiE "401|invalid authentication|please run /login|failed to authenticate"; then
  BROKEN=1
fi

# --- 前回状態を読む: "healthy|broken":count:since_epoch ---
PREV="healthy"; COUNT=0; SINCE=""
if [ -f "$STATE_FILE" ]; then IFS=: read -r PREV COUNT SINCE < "$STATE_FILE" 2>/dev/null; fi
COUNT=${COUNT:-0}

if [ "$BROKEN" = "1" ]; then
  COUNT=$((COUNT+1))
  [ -z "${SINCE:-}" ] && SINCE=$(date +%s)
  HRS=$(( ( $(date +%s) - SINCE ) / 3600 ))
  echo "broken:$COUNT:$SINCE" > "$STATE_FILE"
  log "BROKEN (#$COUNT) exit=$CODE"
  post ":rotating_light: $MENTION *claude の認証が切れています (401)*
cron の claude ジョブ（ダイエット等）が全部止まっています。
*直し方*: ターミナルで \`claude\` → \`/login\` → ブラウザ認証 → \`/exit\`
（初回検知から約 ${HRS}h ・ これは ${COUNT} 回目の通知。直るまで30分毎に鳴らします）"
else
  if [ "$PREV" = "broken" ]; then
    log "RECOVERED after $COUNT alerts"
    post ":white_check_mark: claude の認証が復旧しました（${COUNT}回通知）。通知を停止します。"
  fi
  echo "healthy:0:" > "$STATE_FILE"
  log "healthy (exit=$CODE)"
fi
exit 0

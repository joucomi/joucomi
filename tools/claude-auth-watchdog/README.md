# claude-auth-watchdog

Claude Code（サブスクログイン）の **認証切れ(401)** を検知して、直るまで Slack に鳴らし続ける watchdog。

## 背景
`~/bin/diet_cron.sh` などの launchd ジョブは `claude --print --dangerously-skip-permissions` を叩く。
Claude Max のログイン(OAuth)トークンが失効すると `401 Invalid authentication credentials` で
全ジョブが exit 1 になり、無人だと**気づかないまま何日も止まる**（2026-06-20 に発生、6/21 まで気付かず）。

## 仕組み
- 30分毎(`StartInterval=1800`)に `claude --print "ping"` で認証をプローブ
- 出力に `401 / invalid authentication / please run /login / failed to authenticate` が出たら **BROKEN**
- BROKEN の間は **毎回 Slack に通知**（"気づくまで出し続ける"）。`/login` で復旧すると **✅ を1回出して自動で黙る**
- Slack 投稿は claude を介さず **Slackトークン + curl(chat.postMessage)** 直 → claude が死んでても飛ぶ
- 状態は `~/.cache/claude_auth_watchdog.state`、ログは `~/Library/Logs/claude_auth_watchdog.log`

## 必要なもの（Mac側）
- `/Users/kyog1/.local/bin/claude`、`/opt/homebrew/bin/gtimeout`、`/usr/bin/jq`、`/usr/bin/curl`
- `~/.config/diet/slack-token` … **chat:write 権限のあるトークン**（読み取り専用だと通知できない→install.sh の test post で確認すること）

## インストール
```bash
bash tools/claude-auth-watchdog/install.sh
```
`CLAUDE_WATCHDOG_CHANNEL`（既定 `C0B452M6CEP` = #claude_diet）/ `CLAUDE_WATCHDOG_MENTION` で投稿先・メンションを上書き可。

## アンインストール
```bash
launchctl bootout gui/$(id -u)/com.kyog.claude-auth-watchdog 2>/dev/null
rm ~/Library/LaunchAgents/com.kyog.claude-auth-watchdog.plist
```

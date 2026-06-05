# Joucomi Sidekick

> Inspired by the [Sidekick Browser](https://www.meetsidekick.com/), which was sunset on August 3rd, 2025.

A Chrome extension (Manifest V3) that recreates key features of the discontinued **Sidekick Browser**:

- **Sidebar Apps** — A vertical icon strip lets you load Gmail, Google Calendar, Slack, Notion, and more inside the browser's native side panel. Add/remove/reorder apps in Options.
- **Focus Tools** — Toggle Focus Mode to block distracting sites (YouTube, Twitter, Reddit, etc.) via `declarativeNetRequest` dynamic rules. Includes a Pomodoro timer (25 min focus / 5 min break) that survives service-worker restarts via `chrome.alarms`.
- **Calendar-Triggered Forced Reminders** — Connect your Google Calendar and get notifications before meetings, auto-opening meeting links and optionally activating Focus Mode for the duration.

---

## Loading the Extension in Chrome

1. Run the build (see Development below).
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `dist/` folder produced by the build.
5. The Joucomi Sidekick icon will appear in the toolbar. Click it to open the side panel.

---

## Setting Up the OAuth Client ID (Google Calendar)

The Calendar integration requires a Google OAuth 2.0 client ID:

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Library** and enable the **Google Calendar API**.
4. Navigate to **APIs & Services → Credentials**.
5. Click **Create Credentials → OAuth client ID**.
6. Choose application type: **Chrome Extension**.
7. Enter your extension's ID (visible on `chrome://extensions` after loading unpacked).
8. Copy the generated **Client ID** (looks like `xxxxxxxx.apps.googleusercontent.com`).
9. Open `src/manifest.ts` and replace `"YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com"` with your actual Client ID.
10. Rebuild and reload the extension.

> **Note:** If you change the OAuth client ID you must rebuild and reload the extension in Chrome.

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Install Dependencies

```bash
npm install
```

### Development Build (with HMR)

```bash
npm run dev
```

Then load the `dist/` folder in Chrome as an unpacked extension (you will need to reload it after each rebuild).

### Production Build

```bash
npm run build
```

The compiled extension will be in `dist/`.

---

## Known Limitations

- **CSP stripping:** The extension uses `declarativeNetRequest` static rules to remove `X-Frame-Options` and `Content-Security-Policy` headers from sub-frame requests, allowing most web apps to be loaded inside the side panel's iframe. However, some apps (e.g., Google Meet, some banking sites) use JavaScript-level frame-busting or require authentication cookies that behave differently in iframes, so they may not work perfectly.

- **Calendar refresh interval:** Today's events are fetched every 15 minutes via `chrome.alarms`. Events added within the last 15 minutes may not appear until the next refresh. You can tap the 🔄 button in the Today tab to refresh manually.

- **OAuth scope:** Only `calendar.readonly` is requested. The extension cannot create, modify, or delete calendar events.

- **Meeting URL detection:** Meeting links are detected from `hangoutLink`, `conferenceData`, or the first URL found in the event description. Non-standard meeting platforms may not be detected automatically.

- **Focus Mode persistence:** Focus Mode state is stored in `chrome.storage.local`. It is restored on browser startup, but there is a brief window between browser launch and service-worker activation where no rules are active.

- **Icon:** The included `src/assets/icon.png` is a minimal solid-color placeholder (48×48 purple square). Replace it with a proper icon for production use.

- **Manifest V3 side panel:** The `chrome.sidePanel` API requires Chrome 114 or later.

import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Joucomi Sidekick",
  version: "1.0.0",
  description:
    "Sidebar apps, focus mode, and calendar reminders — key Sidekick Browser features as a Chrome extension.",
  permissions: [
    "sidePanel",
    "storage",
    "alarms",
    "notifications",
    "identity",
    "declarativeNetRequestWithHostAccess",
    "tabs",
  ],
  host_permissions: ["<all_urls>"],
  oauth2: {
    client_id: "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  action: {
    default_title: "Open Joucomi Sidekick",
  },
  options_ui: {
    page: "src/options/index.html",
    open_in_tab: true,
  },
  declarative_net_request: {
    rule_resources: [
      {
        id: "frame_headers",
        enabled: true,
        path: "rules/frame_headers.json",
      },
    ],
  },
  web_accessible_resources: [
    {
      resources: ["src/blocked/index.html"],
      matches: ["<all_urls>"],
    },
  ],
});

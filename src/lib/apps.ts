import { App } from "./types";

export const DEFAULT_APPS: App[] = [
  {
    id: "gmail",
    name: "Gmail",
    url: "https://mail.google.com",
    icon: "✉️",
    isDefault: true,
  },
  {
    id: "gcal",
    name: "Google Calendar",
    url: "https://calendar.google.com",
    icon: "📅",
    isDefault: true,
  },
  {
    id: "gdrive",
    name: "Google Drive",
    url: "https://drive.google.com",
    icon: "📁",
    isDefault: true,
  },
  {
    id: "slack",
    name: "Slack",
    url: "https://app.slack.com",
    icon: "💬",
    isDefault: true,
  },
  {
    id: "notion",
    name: "Notion",
    url: "https://notion.so",
    icon: "📝",
    isDefault: true,
  },
  {
    id: "gkeep",
    name: "Google Keep",
    url: "https://keep.google.com",
    icon: "🗒️",
    isDefault: true,
  },
];

export const DEFAULT_BLOCKLIST: string[] = [
  "youtube.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "reddit.com",
  "tiktok.com",
];

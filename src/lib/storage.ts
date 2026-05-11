import { StorageSchema } from "./types";
import { DEFAULT_APPS, DEFAULT_BLOCKLIST } from "./apps";

const DEFAULTS: StorageSchema = {
  apps: DEFAULT_APPS,
  focusSettings: {
    enabled: false,
    blocklist: DEFAULT_BLOCKLIST,
    pomodoroPhase: "idle",
    pomodoroEndTime: null,
  },
  calendarSettings: {
    connected: false,
    leadMinutes: 1,
    autoOpenMeetingLink: true,
    forceFocusDuringMeetings: true,
  },
  calendarEvents: [],
};

export async function getStorage<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K]> {
  const result = await chrome.storage.local.get(key);
  if (result[key] === undefined) {
    return DEFAULTS[key];
  }
  return result[key] as StorageSchema[K];
}

export async function setStorage<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getAll(): Promise<StorageSchema> {
  const result = await chrome.storage.local.get(null);
  return {
    apps: result["apps"] ?? DEFAULTS.apps,
    focusSettings: result["focusSettings"] ?? DEFAULTS.focusSettings,
    calendarSettings: result["calendarSettings"] ?? DEFAULTS.calendarSettings,
    calendarEvents: result["calendarEvents"] ?? DEFAULTS.calendarEvents,
  };
}

import { setupAlarms, handleAlarm } from "./alarms";
import { fetchTodayEvents, scheduleEventAlarms } from "./calendar";
import { enableFocusMode, disableFocusMode, startPomodoro, pausePomodoro, resetPomodoro } from "./focus";
import { getAuthToken, signOut } from "./auth";
import { getStorage, setStorage } from "../lib/storage";
import type { Message } from "../lib/types";

// On install / startup
chrome.runtime.onInstalled.addListener(async () => {
  await setupAlarms();
  // Enable side panel on toolbar icon click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.runtime.onStartup.addListener(async () => {
  await setupAlarms();
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  // Re-enable focus mode if it was active before browser restart
  const focusSettings = await getStorage("focusSettings");
  if (focusSettings.enabled) {
    await enableFocusMode();
  }
});

// Alarm handler
chrome.alarms.onAlarm.addListener(handleAlarm);

// Re-apply focus rules when the sidebar app list or blocklist changes while
// Focus Mode is active, so newly added sidebar apps are exempted from the
// sub-frame block (and removed ones are re-blocked) without a toggle.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  const appsChanged = "apps" in changes;
  // Only react to a real blocklist edit — enableFocusMode() itself writes
  // focusSettings back, so reacting to every focusSettings write would loop.
  const focusChange = changes["focusSettings"];
  const blocklistChanged =
    !!focusChange &&
    JSON.stringify(focusChange.oldValue?.blocklist) !==
      JSON.stringify(focusChange.newValue?.blocklist);

  if (!appsChanged && !blocklistChanged) return;

  getStorage("focusSettings").then((focusSettings) => {
    if (focusSettings.enabled) {
      enableFocusMode().catch(console.error);
    }
  });
});

// Notification button click handler
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith("reminder:") && buttonIndex === 0) {
    const eventId = notificationId.slice("reminder:".length);
    getStorage("calendarEvents").then((events) => {
      const event = events.find((e) => e.id === eventId);
      if (event?.meetingUrl) {
        chrome.tabs.create({ url: event.meetingUrl, active: true });
      }
    });
  }
});

// Message handler
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch((err) => {
      console.error("Message handling error:", err);
      sendResponse({ error: String(err) });
    });
    return true; // async response
  }
);

async function handleMessage(message: Message): Promise<unknown> {
  switch (message.type) {
    case "FOCUS_TOGGLE": {
      if (message.enabled) {
        await enableFocusMode();
      } else {
        await disableFocusMode();
      }
      const settings = await getStorage("focusSettings");
      return { type: "FOCUS_STATUS_RESPONSE", settings };
    }

    case "FOCUS_STATUS_REQUEST": {
      const settings = await getStorage("focusSettings");
      return { type: "FOCUS_STATUS_RESPONSE", settings };
    }

    case "POMODORO_START": {
      await startPomodoro();
      const settings = await getStorage("focusSettings");
      return { type: "POMODORO_STATUS_RESPONSE", settings };
    }

    case "POMODORO_PAUSE": {
      await pausePomodoro();
      const settings = await getStorage("focusSettings");
      return { type: "POMODORO_STATUS_RESPONSE", settings };
    }

    case "POMODORO_RESET": {
      await resetPomodoro();
      const settings = await getStorage("focusSettings");
      return { type: "POMODORO_STATUS_RESPONSE", settings };
    }

    case "POMODORO_STATUS_REQUEST": {
      const settings = await getStorage("focusSettings");
      return { type: "POMODORO_STATUS_RESPONSE", settings };
    }

    case "CALENDAR_CONNECT": {
      const token = await getAuthToken(true);
      if (token) {
        const calSettings = await getStorage("calendarSettings");
        await setStorage("calendarSettings", { ...calSettings, connected: true });
        const events = await fetchTodayEvents();
        await scheduleEventAlarms(events);
        return { type: "CALENDAR_EVENTS_RESPONSE", events };
      }
      return { error: "Auth failed" };
    }

    case "CALENDAR_DISCONNECT": {
      await signOut();
      const calSettings = await getStorage("calendarSettings");
      await setStorage("calendarSettings", { ...calSettings, connected: false });
      await setStorage("calendarEvents", []);
      return { type: "SETTINGS_UPDATED" };
    }

    case "CALENDAR_REFRESH": {
      const calSettings = await getStorage("calendarSettings");
      if (!calSettings.connected) return { error: "Not connected" };
      const events = await fetchTodayEvents();
      await scheduleEventAlarms(events);
      return { type: "CALENDAR_EVENTS_RESPONSE", events };
    }

    case "CALENDAR_SETTINGS_UPDATE": {
      const calSettings = await getStorage("calendarSettings");
      await setStorage("calendarSettings", { ...calSettings, ...message.settings });
      return { type: "SETTINGS_UPDATED" };
    }

    default:
      return { error: "Unknown message type" };
  }
}

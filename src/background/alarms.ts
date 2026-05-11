import { getStorage } from "../lib/storage";
import { fetchTodayEvents, scheduleEventAlarms } from "./calendar";
import { enableFocusMode, disableFocusMode, handlePomodoroPhaseEnd } from "./focus";

export const CALENDAR_REFRESH_ALARM = "calendar-refresh";

export async function setupAlarms(): Promise<void> {
  // Calendar refresh every 15 minutes
  chrome.alarms.create(CALENDAR_REFRESH_ALARM, { periodInMinutes: 15 });
}

export async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  const { name } = alarm;

  if (name === CALENDAR_REFRESH_ALARM) {
    await handleCalendarRefresh();
    return;
  }

  if (name === "pomodoro-phase-end") {
    await handlePomodoroPhaseEnd();
    return;
  }

  if (name === "pomodoro-tick") {
    // Just a heartbeat so the side panel can poll storage for updates
    // No action needed here; storage is source of truth
    return;
  }

  if (name.startsWith("event:")) {
    const eventId = name.slice("event:".length);
    await handleEventReminder(eventId);
    return;
  }

  if (name.startsWith("event-end:")) {
    const eventId = name.slice("event-end:".length);
    await handleEventEnd(eventId);
    return;
  }
}

async function handleCalendarRefresh(): Promise<void> {
  const calendarSettings = await getStorage("calendarSettings");
  if (!calendarSettings.connected) return;

  const events = await fetchTodayEvents();
  await scheduleEventAlarms(events);
}

async function handleEventReminder(eventId: string): Promise<void> {
  const events = await getStorage("calendarEvents");
  const event = events.find((e) => e.id === eventId);
  if (!event) return;

  const calendarSettings = await getStorage("calendarSettings");

  // Show notification
  chrome.notifications.create(`reminder:${eventId}`, {
    type: "basic",
    iconUrl: "src/assets/icon.png",
    title: `${event.title} の時間です`,
    message: `${formatTime(event.start)} に開始します`,
    buttons: event.meetingUrl ? [{ title: "会議に参加" }] : [],
    requireInteraction: true,
  });

  // Auto-open meeting URL
  if (calendarSettings.autoOpenMeetingLink && event.meetingUrl) {
    chrome.tabs.create({ url: event.meetingUrl, active: true });
  }

  // Force focus during meeting
  if (calendarSettings.forceFocusDuringMeetings) {
    await enableFocusMode();
  }
}

async function handleEventEnd(_eventId: string): Promise<void> {
  const calendarSettings = await getStorage("calendarSettings");
  if (calendarSettings.forceFocusDuringMeetings) {
    await disableFocusMode();
  }
}

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

import { CalendarEvent } from "../lib/types";
import { getAuthToken } from "./auth";
import { getStorage, setStorage } from "../lib/storage";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

function extractMeetingUrl(event: GoogleCalendarEvent): string | undefined {
  // Try hangoutLink first
  if (event.hangoutLink) return event.hangoutLink;
  // Try conferenceData
  if (event.conferenceData?.entryPoints) {
    const video = event.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === "video"
    );
    if (video?.uri) return video.uri;
  }
  // Try first URL in description
  if (event.description) {
    const match = event.description.match(/https?:\/\/[^\s"<>]+/);
    if (match) return match[0];
  }
  return undefined;
}

interface GoogleCalendarEntryPoint {
  entryPointType: string;
  uri: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  conferenceData?: { entryPoints?: GoogleCalendarEntryPoint[] };
  description?: string;
  location?: string;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarEvent[];
  error?: { message: string };
}

export async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  const token = await getAuthToken(false);
  if (!token) return [];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const params = new URLSearchParams({
    calendarId: "primary",
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    console.error("Calendar API error:", response.status);
    return [];
  }

  const data = (await response.json()) as GoogleCalendarListResponse;

  if (data.error) {
    console.error("Calendar API error:", data.error.message);
    return [];
  }

  const events: CalendarEvent[] = (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary ?? "(No title)",
    start: item.start?.dateTime ?? item.start?.date ?? "",
    end: item.end?.dateTime ?? item.end?.date ?? "",
    meetingUrl: extractMeetingUrl(item),
    location: item.location,
  }));

  await setStorage("calendarEvents", events);
  return events;
}

export async function scheduleEventAlarms(events: CalendarEvent[]): Promise<void> {
  const calendarSettings = await getStorage("calendarSettings");
  const leadMs = calendarSettings.leadMinutes * 60 * 1000;
  const now = Date.now();

  for (const event of events) {
    const startMs = new Date(event.start).getTime();
    const alarmTime = startMs - leadMs;
    if (alarmTime > now) {
      const alarmName = `event:${event.id}`;
      chrome.alarms.create(alarmName, { when: alarmTime });
    }
    // Schedule meeting-end alarm if force focus is enabled
    if (calendarSettings.forceFocusDuringMeetings) {
      const endMs = new Date(event.end).getTime();
      if (endMs > now) {
        chrome.alarms.create(`event-end:${event.id}`, { when: endMs });
      }
    }
  }
}

export interface App {
  id: string;
  name: string;
  url: string;
  icon: string; // emoji or SVG string
  isDefault: boolean;
}

export interface FocusSettings {
  enabled: boolean;
  blocklist: string[];
  pomodoroPhase: "focus" | "break" | "idle";
  pomodoroEndTime: number | null; // epoch ms when current phase ends
}

export interface CalendarSettings {
  connected: boolean;
  leadMinutes: number;
  autoOpenMeetingLink: boolean;
  forceFocusDuringMeetings: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  meetingUrl?: string;
  location?: string;
}

export interface StorageSchema {
  apps: App[];
  focusSettings: FocusSettings;
  calendarSettings: CalendarSettings;
  calendarEvents: CalendarEvent[];
}

export type Message =
  | { type: "FOCUS_TOGGLE"; enabled: boolean }
  | { type: "FOCUS_STATUS_REQUEST" }
  | { type: "FOCUS_STATUS_RESPONSE"; settings: FocusSettings }
  | { type: "POMODORO_START" }
  | { type: "POMODORO_PAUSE" }
  | { type: "POMODORO_RESET" }
  | { type: "POMODORO_STATUS_REQUEST" }
  | { type: "POMODORO_STATUS_RESPONSE"; settings: FocusSettings }
  | { type: "CALENDAR_CONNECT" }
  | { type: "CALENDAR_DISCONNECT" }
  | { type: "CALENDAR_REFRESH" }
  | { type: "CALENDAR_EVENTS_RESPONSE"; events: CalendarEvent[] }
  | { type: "CALENDAR_SETTINGS_UPDATE"; settings: Partial<CalendarSettings> }
  | { type: "SETTINGS_UPDATED" };

import { useState, useEffect } from "react";
import type { CalendarEvent, CalendarSettings } from "../../lib/types";
import { getStorage } from "../../lib/storage";
import { sendMessage } from "../../lib/messages";

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function CalendarPanel() {
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStorage("calendarSettings").then(setSettings);
    getStorage("calendarEvents").then(setEvents);
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const handler = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.calendarSettings) {
        setSettings(changes.calendarSettings.newValue as CalendarSettings);
      }
      if (changes.calendarEvents) {
        setEvents(changes.calendarEvents.newValue as CalendarEvent[]);
      }
    };
    chrome.storage.local.onChanged.addListener(handler);
    return () => chrome.storage.local.onChanged.removeListener(handler);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = (await sendMessage({ type: "CALENDAR_CONNECT" })) as
        | { events: CalendarEvent[] }
        | { error: string };
      if ("error" in response) {
        setError(response.error);
      } else {
        setEvents(response.events);
        const newSettings = await getStorage("calendarSettings");
        setSettings(newSettings);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await sendMessage({ type: "CALENDAR_DISCONNECT" });
    const newSettings = await getStorage("calendarSettings");
    setSettings(newSettings);
    setEvents([]);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = (await sendMessage({ type: "CALENDAR_REFRESH" })) as
        | { events: CalendarEvent[] }
        | { error: string };
      if ("events" in response) {
        setEvents(response.events);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return <div className="no-events">Loading...</div>;
  }

  if (!settings.connected) {
    return (
      <div className="calendar-panel">
        <div className="calendar-connect">
          <div style={{ fontSize: 32 }}>📅</div>
          <h3>Connect Google Calendar</h3>
          <p>
            See today's events and get automatic reminders before meetings.
            You'll be prompted to sign in with your Google account.
          </p>
          {error && <div className="error-msg">Error: {error}</div>}
          <button className="connect-btn" onClick={handleConnect} disabled={loading}>
            {loading ? "Connecting..." : "Connect Google Calendar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-panel">
      <div className="calendar-header">
        <h3>Today's Events</h3>
        <div className="calendar-actions">
          <button className="icon-btn" onClick={handleRefresh} disabled={loading} title="Refresh">
            🔄
          </button>
          <button className="icon-btn" onClick={handleDisconnect} title="Disconnect">
            🔌
          </button>
        </div>
      </div>

      <div className="events-list">
        {events.length === 0 ? (
          <div className="no-events">
            {loading ? "Loading events..." : "No events today 🎉"}
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-time">
                {formatTime(event.start)} – {formatTime(event.end)}
              </div>
              <div className="event-title">{event.title}</div>
              {event.meetingUrl && (
                <button
                  className="event-join-btn"
                  onClick={() =>
                    chrome.tabs.create({ url: event.meetingUrl!, active: true })
                  }
                >
                  Join Meeting
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

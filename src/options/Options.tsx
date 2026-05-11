import { useState, useEffect } from "react";
import type { App, CalendarSettings } from "../lib/types";
import { getStorage, setStorage } from "../lib/storage";
import { DEFAULT_APPS, DEFAULT_BLOCKLIST } from "../lib/apps";

let nextCustomId = Date.now();

function generateId(): string {
  return `custom-${nextCustomId++}`;
}

export default function Options() {
  // Apps
  const [apps, setApps] = useState<App[]>([]);
  const [newAppName, setNewAppName] = useState("");
  const [newAppUrl, setNewAppUrl] = useState("");
  const [newAppIcon, setNewAppIcon] = useState("🌐");

  // Blocklist
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [newBlockDomain, setNewBlockDomain] = useState("");

  // Calendar settings
  const [calSettings, setCalSettings] = useState<CalendarSettings>({
    connected: false,
    leadMinutes: 1,
    autoOpenMeetingLink: true,
    forceFocusDuringMeetings: true,
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getStorage("apps").then(setApps);
    getStorage("focusSettings").then((s) => setBlocklist(s.blocklist));
    getStorage("calendarSettings").then(setCalSettings);
  }, []);

  // ── App management ───────────────────────────────────
  const addApp = () => {
    if (!newAppName.trim() || !newAppUrl.trim()) return;
    let url = newAppUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    const app: App = {
      id: generateId(),
      name: newAppName.trim(),
      url,
      icon: newAppIcon || "🌐",
      isDefault: false,
    };
    const updated = [...apps, app];
    setApps(updated);
    setNewAppName("");
    setNewAppUrl("");
    setNewAppIcon("🌐");
    setStorage("apps", updated);
  };

  const removeApp = (id: string) => {
    const updated = apps.filter((a) => a.id !== id);
    setApps(updated);
    setStorage("apps", updated);
  };

  const moveApp = (id: string, direction: -1 | 1) => {
    const idx = apps.findIndex((a) => a.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= apps.length) return;
    const updated = [...apps];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setApps(updated);
    setStorage("apps", updated);
  };

  const resetApps = () => {
    setApps(DEFAULT_APPS);
    setStorage("apps", DEFAULT_APPS);
  };

  // ── Blocklist management ─────────────────────────────
  const addBlockDomain = () => {
    const domain = newBlockDomain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain || blocklist.includes(domain)) return;
    const updated = [...blocklist, domain];
    setBlocklist(updated);
    setNewBlockDomain("");
    getStorage("focusSettings").then((s) => setStorage("focusSettings", { ...s, blocklist: updated }));
  };

  const removeBlockDomain = (domain: string) => {
    const updated = blocklist.filter((d) => d !== domain);
    setBlocklist(updated);
    getStorage("focusSettings").then((s) => setStorage("focusSettings", { ...s, blocklist: updated }));
  };

  const resetBlocklist = () => {
    setBlocklist(DEFAULT_BLOCKLIST);
    getStorage("focusSettings").then((s) =>
      setStorage("focusSettings", { ...s, blocklist: DEFAULT_BLOCKLIST })
    );
  };

  // ── Calendar settings ────────────────────────────────
  const saveCalSettings = () => {
    setStorage("calendarSettings", calSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="options-root">
      <header className="options-header">
        <h1>🚀 Joucomi Sidekick — Options</h1>
      </header>

      <div className="options-content">

        {/* ── Sidebar Apps ── */}
        <section className="options-section">
          <h2>Sidebar Apps</h2>
          <p className="section-desc">
            Manage which apps appear in the sidebar. Drag to reorder, or use the arrow buttons.
          </p>

          <div className="app-list">
            {apps.map((app, idx) => (
              <div key={app.id} className="app-row">
                <span className="app-icon-preview">{app.icon}</span>
                <span className="app-name">{app.name}</span>
                <span className="app-url">{app.url}</span>
                <div className="app-row-actions">
                  <button
                    className="icon-action-btn"
                    onClick={() => moveApp(app.id, -1)}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    className="icon-action-btn"
                    onClick={() => moveApp(app.id, 1)}
                    disabled={idx === apps.length - 1}
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    className="icon-action-btn danger"
                    onClick={() => removeApp(app.id)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="add-form">
            <input
              className="emoji-input"
              type="text"
              value={newAppIcon}
              onChange={(e) => setNewAppIcon(e.target.value)}
              placeholder="🌐"
              maxLength={2}
              title="Icon (emoji)"
            />
            <input
              type="text"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="App name"
            />
            <input
              type="text"
              value={newAppUrl}
              onChange={(e) => setNewAppUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => e.key === "Enter" && addApp()}
            />
            <button className="primary-btn" onClick={addApp}>
              Add App
            </button>
          </div>

          <button className="text-btn" onClick={resetApps}>
            Reset to defaults
          </button>
        </section>

        {/* ── Blocklist ── */}
        <section className="options-section">
          <h2>Focus Mode — Blocked Sites</h2>
          <p className="section-desc">
            These domains are blocked when Focus Mode is enabled.
          </p>

          <div className="tag-list">
            {blocklist.map((domain) => (
              <div key={domain} className="tag">
                <span>{domain}</span>
                <button
                  className="tag-remove"
                  onClick={() => removeBlockDomain(domain)}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="add-form">
            <input
              type="text"
              value={newBlockDomain}
              onChange={(e) => setNewBlockDomain(e.target.value)}
              placeholder="example.com"
              onKeyDown={(e) => e.key === "Enter" && addBlockDomain()}
            />
            <button className="primary-btn" onClick={addBlockDomain}>
              Add Domain
            </button>
          </div>

          <button className="text-btn" onClick={resetBlocklist}>
            Reset to defaults
          </button>
        </section>

        {/* ── Calendar Settings ── */}
        <section className="options-section">
          <h2>Calendar &amp; Reminders</h2>
          <p className="section-desc">
            Configure how the extension handles Google Calendar reminders.
          </p>

          <div className="form-row">
            <label>
              Reminder lead time (minutes):
              <input
                type="number"
                min={0}
                max={60}
                value={calSettings.leadMinutes}
                onChange={(e) =>
                  setCalSettings({ ...calSettings, leadMinutes: Number(e.target.value) })
                }
              />
            </label>
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={calSettings.autoOpenMeetingLink}
                onChange={(e) =>
                  setCalSettings({ ...calSettings, autoOpenMeetingLink: e.target.checked })
                }
              />
              Auto-open meeting link when reminder fires
            </label>
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={calSettings.forceFocusDuringMeetings}
                onChange={(e) =>
                  setCalSettings({
                    ...calSettings,
                    forceFocusDuringMeetings: e.target.checked,
                  })
                }
              />
              Force Focus Mode during meetings (blocks distracting sites)
            </label>
          </div>

          <button className="primary-btn" onClick={saveCalSettings}>
            {saved ? "Saved ✓" : "Save Settings"}
          </button>
        </section>
      </div>
    </div>
  );
}

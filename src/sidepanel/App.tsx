import { useState, useEffect } from "react";
import AppLauncher from "./components/AppLauncher";
import AppFrame from "./components/AppFrame";
import FocusToggle from "./components/FocusToggle";
import PomodoroTimer from "./components/PomodoroTimer";
import CalendarPanel from "./components/CalendarPanel";
import { getStorage } from "../lib/storage";
import type { App, FocusSettings } from "../lib/types";

type Tab = "apps" | "today" | "focus";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("apps");
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [focusSettings, setFocusSettings] = useState<FocusSettings | null>(null);

  useEffect(() => {
    getStorage("apps").then((storedApps) => {
      setApps(storedApps);
      if (storedApps.length > 0) setSelectedApp(storedApps[0]);
    });
    getStorage("focusSettings").then(setFocusSettings);
  }, []);

  // Listen for storage changes (e.g. from options page)
  useEffect(() => {
    const handler = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.apps) {
        const newApps = changes.apps.newValue as App[];
        setApps(newApps);
        if (selectedApp && !newApps.find((a) => a.id === selectedApp.id)) {
          setSelectedApp(newApps[0] ?? null);
        }
      }
      if (changes.focusSettings) {
        setFocusSettings(changes.focusSettings.newValue as FocusSettings);
      }
    };
    chrome.storage.local.onChanged.addListener(handler);
    return () => chrome.storage.local.onChanged.removeListener(handler);
  }, [selectedApp]);

  const handleFocusChange = (settings: FocusSettings) => {
    setFocusSettings(settings);
  };

  return (
    <div className="sidepanel-root">
      <header className="sidepanel-header">
        <nav className="tab-nav">
          <button
            className={`tab-btn ${activeTab === "apps" ? "active" : ""}`}
            onClick={() => setActiveTab("apps")}
          >
            📱 Apps
          </button>
          <button
            className={`tab-btn ${activeTab === "today" ? "active" : ""}`}
            onClick={() => setActiveTab("today")}
          >
            📅 Today
          </button>
          <button
            className={`tab-btn ${activeTab === "focus" ? "active" : ""}`}
            onClick={() => setActiveTab("focus")}
          >
            🎯 Focus
          </button>
        </nav>
        {focusSettings && (
          <FocusToggle
            focusSettings={focusSettings}
            onChange={handleFocusChange}
          />
        )}
      </header>

      <main className="sidepanel-main">
        {activeTab === "apps" && (
          <div className="apps-layout">
            <AppLauncher
              apps={apps}
              selectedApp={selectedApp}
              onSelect={setSelectedApp}
            />
            <AppFrame app={selectedApp} />
          </div>
        )}

        {activeTab === "today" && <CalendarPanel />}

        {activeTab === "focus" && (
          <div className="focus-tab">
            {focusSettings && (
              <PomodoroTimer focusSettings={focusSettings} />
            )}
            <div className="focus-info">
              <p>
                Focus Mode {focusSettings?.enabled ? "is ON 🟢" : "is OFF ⚪"}.
                Toggle it using the button in the header.
              </p>
              <p>
                Blocked sites can be managed in the{" "}
                <button
                  className="link-btn"
                  onClick={() => chrome.runtime.openOptionsPage()}
                >
                  Options page
                </button>
                .
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import type { App } from "../../lib/types";

interface Props {
  apps: App[];
  selectedApp: App | null;
  onSelect: (app: App) => void;
}

export default function AppLauncher({ apps, selectedApp, onSelect }: Props) {
  return (
    <div className="app-launcher">
      {apps.map((app) => (
        <button
          key={app.id}
          className={`app-icon-btn ${selectedApp?.id === app.id ? "selected" : ""}`}
          title={app.name}
          onClick={() => onSelect(app)}
          aria-label={app.name}
        >
          {app.icon}
        </button>
      ))}
    </div>
  );
}

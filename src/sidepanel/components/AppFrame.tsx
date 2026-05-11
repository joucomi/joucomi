import type { App } from "../../lib/types";

interface Props {
  app: App | null;
}

export default function AppFrame({ app }: Props) {
  if (!app) {
    return <div className="no-app-selected">Select an app to get started.</div>;
  }

  return (
    <div className="app-frame-container">
      <div className="app-frame-toolbar">
        <span className="app-frame-title">
          {app.icon} {app.name}
        </span>
        <button
          className="open-tab-btn"
          title="Open in new tab"
          onClick={() => chrome.tabs.create({ url: app.url, active: true })}
        >
          ↗ Tab
        </button>
      </div>
      <iframe
        key={app.id}
        className="app-iframe"
        src={app.url}
        title={app.name}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
      />
    </div>
  );
}

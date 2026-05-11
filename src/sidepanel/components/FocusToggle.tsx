import { useState } from "react";
import type { FocusSettings } from "../../lib/types";
import { sendMessage } from "../../lib/messages";

interface Props {
  focusSettings: FocusSettings;
  onChange: (settings: FocusSettings) => void;
}

export default function FocusToggle({ focusSettings, onChange }: Props) {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const response = (await sendMessage({
        type: "FOCUS_TOGGLE",
        enabled: !focusSettings.enabled,
      })) as { settings: FocusSettings };
      if (response?.settings) {
        onChange(response.settings);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`focus-toggle-btn ${focusSettings.enabled ? "enabled" : ""}`}
      onClick={toggle}
      disabled={loading}
      title={focusSettings.enabled ? "Disable Focus Mode" : "Enable Focus Mode"}
    >
      {focusSettings.enabled ? "🎯 Focus ON" : "⚪ Focus"}
    </button>
  );
}

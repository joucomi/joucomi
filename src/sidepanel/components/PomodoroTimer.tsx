import { useState, useEffect } from "react";
import type { FocusSettings } from "../../lib/types";
import { sendMessage } from "../../lib/messages";

interface Props {
  focusSettings: FocusSettings;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PomodoroTimer({ focusSettings }: Props) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const computeRemaining = () => {
      if (
        focusSettings.pomodoroPhase === "idle" ||
        focusSettings.pomodoroEndTime === null
      ) {
        setRemaining(0);
      } else {
        setRemaining(focusSettings.pomodoroEndTime - Date.now());
      }
    };

    computeRemaining();

    const interval = setInterval(computeRemaining, 500);
    return () => clearInterval(interval);
  }, [focusSettings.pomodoroPhase, focusSettings.pomodoroEndTime]);

  const phaseLabel =
    focusSettings.pomodoroPhase === "focus"
      ? "Focus Time"
      : focusSettings.pomodoroPhase === "break"
      ? "Break Time"
      : "Ready";

  const timeDisplay =
    focusSettings.pomodoroPhase === "idle"
      ? "25:00"
      : formatMs(remaining);

  const handleStart = async () => {
    await sendMessage({ type: "POMODORO_START" });
  };

  const handlePause = async () => {
    await sendMessage({ type: "POMODORO_PAUSE" });
  };

  const handleReset = async () => {
    await sendMessage({ type: "POMODORO_RESET" });
  };

  return (
    <div className="pomodoro-container">
      <div className="pomodoro-phase">{phaseLabel}</div>
      <div className="pomodoro-time">{timeDisplay}</div>
      <div className="pomodoro-controls">
        {focusSettings.pomodoroPhase === "idle" ? (
          <button className="pomodoro-btn primary" onClick={handleStart}>
            ▶ Start
          </button>
        ) : (
          <>
            <button className="pomodoro-btn secondary" onClick={handlePause}>
              ⏸ Pause
            </button>
            <button className="pomodoro-btn secondary" onClick={handleReset}>
              ↺ Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}

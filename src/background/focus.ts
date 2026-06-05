import { getStorage, setStorage } from "../lib/storage";

const FOCUS_RULE_ID_BASE = 1000;

function blockedPageUrl(): string {
  return chrome.runtime.getURL("src/blocked/index.html");
}

/**
 * Extract the bare host (no scheme, port, or path) from an app URL.
 * Returns null for URLs that cannot be parsed.
 */
function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * A blocked domain matches a sidebar app when the app's host equals the domain
 * or is a sub-domain of it (e.g. blocklist "x.com" matches app host
 * "mobile.x.com"). Such domains are blocked only in the main frame so the
 * deliberately-added sidebar app keeps loading inside the side panel iframe.
 */
function isSidebarAppDomain(domain: string, appHosts: string[]): boolean {
  return appHosts.some(
    (host) => host === domain || host.endsWith(`.${domain}`)
  );
}

export async function enableFocusMode(): Promise<void> {
  const focusSettings = await getStorage("focusSettings");
  const blocklist = focusSettings.blocklist;
  const apps = await getStorage("apps");

  const appHosts = apps
    .map((app) => hostFromUrl(app.url))
    .filter((host): host is string => host !== null);

  // Remove existing dynamic focus rules
  await clearFocusRules();

  const { MAIN_FRAME, SUB_FRAME } = chrome.declarativeNetRequest.ResourceType;

  const rules: chrome.declarativeNetRequest.Rule[] = blocklist.map(
    (domain, index) => ({
      id: FOCUS_RULE_ID_BASE + index,
      priority: 2,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { url: blockedPageUrl() },
      },
      condition: {
        urlFilter: `||${domain}`,
        // Sites you've deliberately added to the sidebar are only blocked in
        // the main frame, so they still load inside the side panel iframe.
        resourceTypes: isSidebarAppDomain(domain, appHosts)
          ? [MAIN_FRAME]
          : [MAIN_FRAME, SUB_FRAME],
      },
    })
  );

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map((r) => r.id),
    addRules: rules,
  });

  await setStorage("focusSettings", { ...focusSettings, enabled: true });
}

export async function disableFocusMode(): Promise<void> {
  await clearFocusRules();
  const focusSettings = await getStorage("focusSettings");
  await setStorage("focusSettings", {
    ...focusSettings,
    enabled: false,
    pomodoroPhase: "idle",
    pomodoroEndTime: null,
  });
  chrome.alarms.clear("pomodoro-tick");
  chrome.alarms.clear("pomodoro-phase-end");
}

async function clearFocusRules(): Promise<void> {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const focusRuleIds = existingRules
    .filter((r) => r.id >= FOCUS_RULE_ID_BASE)
    .map((r) => r.id);
  if (focusRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: focusRuleIds,
      addRules: [],
    });
  }
}

// Pomodoro constants
const FOCUS_DURATION_MS = 25 * 60 * 1000;
const BREAK_DURATION_MS = 5 * 60 * 1000;

export async function startPomodoro(): Promise<void> {
  const focusSettings = await getStorage("focusSettings");
  const endTime = Date.now() + FOCUS_DURATION_MS;
  await setStorage("focusSettings", {
    ...focusSettings,
    pomodoroPhase: "focus",
    pomodoroEndTime: endTime,
  });
  chrome.alarms.create("pomodoro-phase-end", { when: endTime });
  // Tick every minute so UI can update
  chrome.alarms.create("pomodoro-tick", { periodInMinutes: 1 });
}

export async function pausePomodoro(): Promise<void> {
  const focusSettings = await getStorage("focusSettings");
  await setStorage("focusSettings", {
    ...focusSettings,
    pomodoroPhase: "idle",
    pomodoroEndTime: null,
  });
  chrome.alarms.clear("pomodoro-tick");
  chrome.alarms.clear("pomodoro-phase-end");
}

export async function resetPomodoro(): Promise<void> {
  await pausePomodoro();
}

export async function handlePomodoroPhaseEnd(): Promise<void> {
  const focusSettings = await getStorage("focusSettings");
  if (focusSettings.pomodoroPhase === "focus") {
    // Switch to break
    const endTime = Date.now() + BREAK_DURATION_MS;
    await setStorage("focusSettings", {
      ...focusSettings,
      pomodoroPhase: "break",
      pomodoroEndTime: endTime,
    });
    chrome.alarms.create("pomodoro-phase-end", { when: endTime });
    chrome.notifications.create("pomodoro-break", {
      type: "basic",
      iconUrl: "src/assets/icon.png",
      title: "Pomodoro: 休憩時間です",
      message: "5分間の休憩を取りましょう！",
    });
  } else {
    // Switch back to idle; user must manually start next focus session
    await setStorage("focusSettings", {
      ...focusSettings,
      pomodoroPhase: "idle",
      pomodoroEndTime: null,
    });
    chrome.alarms.clear("pomodoro-tick");
    chrome.notifications.create("pomodoro-done", {
      type: "basic",
      iconUrl: "src/assets/icon.png",
      title: "Pomodoro: 休憩終了",
      message: "次のポモドーロを開始しましょう！",
    });
  }
}

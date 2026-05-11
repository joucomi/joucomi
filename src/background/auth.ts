const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export async function getAuthToken(interactive: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive, scopes: [CALENDAR_SCOPE] }, (token) => {
      if (chrome.runtime.lastError || !token) {
        console.warn("Auth error:", chrome.runtime.lastError?.message);
        resolve(null);
      } else {
        resolve(token);
      }
    });
  });
}

export async function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve);
  });
}

export async function signOut(): Promise<void> {
  const token = await getAuthToken(false);
  if (token) {
    await removeCachedToken(token);
  }
}

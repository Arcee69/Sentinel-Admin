/**
 * Bearer-token storage. "Remember this device" keeps the token in
 * localStorage; otherwise it lives in sessionStorage and ends with the tab.
 */

const TOKEN_KEY = "sentinel.auth";

export interface StoredSession {
  token: string;
  /** ISO timestamp from the login response; null when the API gave none. */
  expiresAt: string | null;
}

function storages(): Storage[] {
  const list: Storage[] = [];
  try {
    list.push(localStorage, sessionStorage);
  } catch {
    /* storage blocked — the session stays in memory only */
  }
  return list;
}

let memory: StoredSession | null = null;

function isExpired(session: StoredSession): boolean {
  return session.expiresAt != null && Date.parse(session.expiresAt) <= Date.now();
}

export function readSession(): StoredSession | null {
  if (memory) return isExpired(memory) ? null : memory;

  for (const store of storages()) {
    try {
      const raw = store.getItem(TOKEN_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed?.token && !isExpired(parsed)) {
        memory = parsed;
        return parsed;
      }
    } catch {
      /* unreadable entry — treat as signed out */
    }
  }
  return null;
}

export function getToken(): string | null {
  return readSession()?.token ?? null;
}

export function saveSession(session: StoredSession, remember: boolean) {
  clearSession();
  memory = session;
  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, JSON.stringify(session));
  } catch {
    /* storage blocked — memory copy still authenticates this tab */
  }
}

export function clearSession() {
  memory = null;
  for (const store of storages()) {
    try {
      store.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
  }
}

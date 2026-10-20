/**
 * Session persistence. localStorage can throw (private mode, blocked site data), so every access is
 * guarded and an in-memory copy keeps the session working for this tab even if storage fails.
 */

export interface Session {
  token: string;
  username: string;
}

const KEY = 'dungeon-crawler.session';

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let current: Session | null = readStored();

export function getSession(): Session | null {
  return current;
}

export function getToken(): string | null {
  return current?.token ?? null;
}

export function setSession(session: Session): void {
  current = session;
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Not persisted across reloads; the in-memory copy still works.
  }
}

export function clearSession(): void {
  current = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

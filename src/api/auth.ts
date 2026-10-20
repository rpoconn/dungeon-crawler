/** Account endpoints. Successful register/login stores the session. */

import { request } from './client';
import { clearSession, setSession, type Session } from './session';

async function authenticate(path: string, username: string, password: string): Promise<Session> {
  const session = await request<Session>('POST', path, { username, password });
  setSession(session);
  return session;
}

export function register(username: string, password: string): Promise<Session> {
  return authenticate('/auth/register', username, password);
}

export function login(username: string, password: string): Promise<Session> {
  return authenticate('/auth/login', username, password);
}

/** Best effort: the server-side token is revoked if reachable; the local one is always dropped. */
export async function logout(): Promise<void> {
  try {
    await request<unknown>('POST', '/auth/logout');
  } catch (err) {
    console.warn('Server logout failed', err);
  } finally {
    clearSession();
  }
}

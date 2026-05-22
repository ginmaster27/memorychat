import { Platform } from 'react-native';
import { AuthPayload, UserProfile } from '../types/user';

const SESSION_KEY = 'vibly.activeSession';

interface WebSessionStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface SessionSnapshot {
  profile: UserProfile;
  payload: AuthPayload;
}

function getSessionStorage(): WebSessionStorage | null {
  const webGlobal = globalThis as typeof globalThis & { sessionStorage?: WebSessionStorage };
  return Platform.OS === 'web' ? webGlobal.sessionStorage || null : null;
}

export function saveSessionSnapshot(snapshot: SessionSnapshot) {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(SESSION_KEY, JSON.stringify(snapshot));
}

export function loadSessionSnapshot(): SessionSnapshot | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  const raw = storage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    clearSessionSnapshot();
    return null;
  }
}

export function clearSessionSnapshot() {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(SESSION_KEY);
}

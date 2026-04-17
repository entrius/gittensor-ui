import { useCallback, useSyncExternalStore } from 'react';
import { type SelfIdentityPrefs } from '../utils/selfIdentityMatch';

const STORAGE_KEY = 'gittensor.selfIdentity.v1';

type Listener = () => void;
const listeners = new Set<Listener>();

const emptyPrefs = (): SelfIdentityPrefs => ({
  githubLogin: '',
  hotkey: '',
});

const readFromStorage = (): SelfIdentityPrefs => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPrefs();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return emptyPrefs();
    const rec = parsed as Record<string, unknown>;
    const githubLogin =
      typeof rec.githubLogin === 'string' ? rec.githubLogin : '';
    const hotkey = typeof rec.hotkey === 'string' ? rec.hotkey : '';
    return { githubLogin, hotkey };
  } catch {
    return emptyPrefs();
  }
};

let snapshot: SelfIdentityPrefs = readFromStorage();

const notify = () => {
  listeners.forEach((l) => l());
};

const prefsEqual = (a: SelfIdentityPrefs, b: SelfIdentityPrefs) =>
  a.githubLogin === b.githubLogin && a.hotkey === b.hotkey;

const setSnapshot = (next: SelfIdentityPrefs) => {
  if (prefsEqual(next, snapshot)) return;
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / quota — in-memory still works for the session
  }
  notify();
};

const handleStorageEvent = (e: StorageEvent) => {
  if (e.key !== STORAGE_KEY) return;
  snapshot = readFromStorage();
  notify();
};

const subscribe = (listener: Listener) => {
  if (listeners.size === 0) {
    window.addEventListener('storage', handleStorageEvent);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
};

const getSnapshot = () => snapshot;

export interface UseSelfIdentity {
  githubLogin: string;
  hotkey: string;
  prefs: SelfIdentityPrefs;
  hasConfigured: boolean;
  setIdentity: (next: SelfIdentityPrefs) => void;
  clear: () => void;
}

export const useSelfIdentity = (): UseSelfIdentity => {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const hasConfigured = !!(
    prefs.githubLogin.trim() || prefs.hotkey.trim()
  );

  const setIdentity = useCallback((next: SelfIdentityPrefs) => {
    setSnapshot({
      githubLogin: next.githubLogin.trim(),
      hotkey: next.hotkey.trim(),
    });
  }, []);

  const clear = useCallback(() => setSnapshot(emptyPrefs()), []);

  return {
    githubLogin: prefs.githubLogin,
    hotkey: prefs.hotkey,
    prefs,
    hasConfigured,
    setIdentity,
    clear,
  };
};

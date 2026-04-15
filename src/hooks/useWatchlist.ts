import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'gittensor.watchlist.v1';

type Listener = () => void;
const listeners = new Set<Listener>();

const readFromStorage = (): string[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
};

// Module-level snapshot — every useWatchlist() instance in the tab reads from
// the same reference, so writes from any caller propagate to all consumers.
let snapshot: string[] = readFromStorage();

const notify = () => {
  listeners.forEach((l) => l());
};

const setSnapshot = (next: string[]) => {
  if (
    next.length === snapshot.length &&
    next.every((id, i) => id === snapshot[i])
  ) {
    return;
  }
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota). In-memory state still works.
  }
  notify();
};

const handleStorageEvent = (e: StorageEvent) => {
  if (e.key !== STORAGE_KEY) return;
  const next = readFromStorage();
  snapshot = next;
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

interface UseWatchlist {
  ids: string[];
  count: number;
  isWatched: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
}

export const useWatchlist = (): UseWatchlist => {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const isWatched = useCallback(
    (id: string) => snapshot.includes(id),
    // Depending on `ids` ensures consumers re-render when the snapshot changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids],
  );

  // Action callbacks read from the module-level `snapshot`, not the rendered
  // `ids`. This is the key to rapid-click correctness: two fast toggles see
  // each other's writes immediately instead of both reading a stale array.
  const add = useCallback((id: string) => {
    if (!id || snapshot.includes(id)) return;
    setSnapshot([...snapshot, id]);
  }, []);

  const remove = useCallback((id: string) => {
    if (!snapshot.includes(id)) return;
    setSnapshot(snapshot.filter((x) => x !== id));
  }, []);

  const toggle = useCallback((id: string) => {
    if (!id) return;
    setSnapshot(
      snapshot.includes(id) ? snapshot.filter((x) => x !== id) : [...snapshot, id],
    );
  }, []);

  const clear = useCallback(() => setSnapshot([]), []);

  return { ids, count: ids.length, isWatched, add, remove, toggle, clear };
};

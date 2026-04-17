import { useCallback, useSyncExternalStore } from 'react';

// Migration: v1 stored string[] (miner IDs only), v2 stores categorized watchlist
const STORAGE_KEY_V1 = 'gittensor.watchlist.v1';
const STORAGE_KEY_V2 = 'gittensor.watchlist.v2';

export type WatchlistCategory = 'miners' | 'repos' | 'bounties' | 'prs';

type WatchlistData = {
  [K in WatchlistCategory]: string[];
};

type Listener = () => void;
const listeners = new Set<Listener>();

const migrateFromV1 = (): WatchlistData => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V1);
    if (!raw) return { miners: [], repos: [], bounties: [], prs: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Migrate legacy miner IDs to new structure
      const miners = parsed.filter((x): x is string => typeof x === 'string');
      // Clear v1 key after successful migration
      window.localStorage.removeItem(STORAGE_KEY_V1);
      return { miners, repos: [], bounties: [], prs: [] };
    }
  } catch {
    // Invalid v1 data, start fresh
  }
  return { miners: [], repos: [], bounties: [], prs: [] };
};

const readFromStorage = (): WatchlistData => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) {
      // Check for v1 data to migrate
      return migrateFromV1();
    }
    const parsed = JSON.parse(raw);
    // Validate structure
    if (
      typeof parsed === 'object' &&
      Array.isArray(parsed.miners) &&
      Array.isArray(parsed.repos) &&
      Array.isArray(parsed.bounties) &&
      Array.isArray(parsed.prs)
    ) {
      return {
        miners: parsed.miners.filter((x): x is string => typeof x === 'string'),
        repos: parsed.repos.filter((x): x is string => typeof x === 'string'),
        bounties: parsed.bounties.filter((x): x is string => typeof x === 'string'),
        prs: parsed.prs.filter((x): x is string => typeof x === 'string'),
      };
    }
  } catch {
    // Invalid data, start fresh
  }
  return { miners: [], repos: [], bounties: [], prs: [] };
};

// Module-level snapshot — every useWatchlist() instance in the tab reads from
// the same reference, so writes from any caller propagate to all consumers.
let snapshot: WatchlistData = readFromStorage();

const notify = () => {
  listeners.forEach((l) => l());
};

const setSnapshot = (next: WatchlistData) => {
  // Check if anything changed
  const keys: WatchlistCategory[] = ['miners', 'repos', 'bounties', 'prs'];
  const changed = keys.some(
    (k) =>
      next[k].length !== snapshot[k].length ||
      !next[k].every((id, i) => id === snapshot[k][i]),
  );
  if (!changed) return;

  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota). In-memory state still works.
  }
  notify();
};

const handleStorageEvent = (e: StorageEvent) => {
  if (e.key !== STORAGE_KEY_V2) return;
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

/**
 * Hook for managing watchlist with category support.
 *
 * @param category - The entity category to manage. Defaults to 'miners' for backward compatibility.
 *
 * @example
 * // Legacy usage (backward compatible)
 * const watchlist = useWatchlist();
 *
 * @example
 * // Category-specific usage
 * const repoWatchlist = useWatchlist('repos');
 * const bountyWatchlist = useWatchlist('bounties');
 */
export const useWatchlist = (category: WatchlistCategory = 'miners'): UseWatchlist => {
  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const ids = data[category];

  const isWatched = useCallback(
    (id: string) => snapshot[category].includes(id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, category],
  );

  const add = useCallback(
    (id: string) => {
      if (!id || snapshot[category].includes(id)) return;
      setSnapshot({
        ...snapshot,
        [category]: [...snapshot[category], id],
      });
    },
    [category],
  );

  const remove = useCallback(
    (id: string) => {
      if (!snapshot[category].includes(id)) return;
      setSnapshot({
        ...snapshot,
        [category]: snapshot[category].filter((x) => x !== id),
      });
    },
    [category],
  );

  const toggle = useCallback(
    (id: string) => {
      if (!id) return;
      setSnapshot({
        ...snapshot,
        [category]: snapshot[category].includes(id)
          ? snapshot[category].filter((x) => x !== id)
          : [...snapshot[category], id],
      });
    },
    [category],
  );

  const clear = useCallback(
    () =>
      setSnapshot({
        ...snapshot,
        [category]: [],
      }),
    [category],
  );

  return { ids, count: ids.length, isWatched, add, remove, toggle, clear };
};

/**
 * Hook to get total watchlist count across all categories.
 * Useful for sidebar badge.
 */
export const useWatchlistTotalCount = (): number => {
  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return data.miners.length + data.repos.length + data.bounties.length + data.prs.length;
};

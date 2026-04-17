import { useCallback, useSyncExternalStore, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Storage keys & types                                               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY_V1 = 'gittensor.watchlist.v1';
const STORAGE_KEY_V2 = 'gittensor.watchlist.v2';

export type WatchlistCategory = 'miners' | 'repos' | 'bounties' | 'prs';

interface WatchlistShapeV2 {
  miners: string[];
  repos: string[];
  bounties: string[];
  prs: string[];
}

type Listener = () => void;
const listeners = new Set<Listener>();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const emptyShape = (): WatchlistShapeV2 => ({
  miners: [],
  repos: [],
  bounties: [],
  prs: [],
});

/** Read the v2 object from localStorage (returns fresh empty shape on any error). */
const readV2FromStorage = (): WatchlistShapeV2 => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) return emptyShape();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return emptyShape();
    const shape = emptyShape();
    for (const key of Object.keys(shape)) {
      const k = key as WatchlistCategory;
      if (Array.isArray(parsed[k])) {
        shape[k] = parsed[k].filter(
          (x: unknown): x is string => typeof x === 'string',
        );
      }
    }
    return shape;
  } catch {
    return emptyShape();
  }
};

/** One-time migration: if v2 doesn't exist but v1 does, move v1 miner IDs into v2. */
const migrateIfNeeded = (): void => {
  try {
    if (window.localStorage.getItem(STORAGE_KEY_V2)) return; // already migrated
    const v1Raw = window.localStorage.getItem(STORAGE_KEY_V1);
    if (!v1Raw) return;
    const v1Parsed = JSON.parse(v1Raw);
    const minerIds: string[] = Array.isArray(v1Parsed)
      ? v1Parsed.filter((x: unknown): x is string => typeof x === 'string')
      : [];
    const v2: WatchlistShapeV2 = { ...emptyShape(), miners: minerIds };
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(v2));
  } catch {
    // ignore migration errors — worst case user starts with an empty watchlist
  }
};

// Run migration once at module load
migrateIfNeeded();

/* ------------------------------------------------------------------ */
/*  External-store plumbing (shared across all useWatchlist instances) */
/* ------------------------------------------------------------------ */

let snapshot: WatchlistShapeV2 = readV2FromStorage();

const notify = () => {
  listeners.forEach((l) => l());
};

const setSnapshot = (next: WatchlistShapeV2) => {
  // Shallow-compare each category to avoid unnecessary writes / re-renders
  const unchanged =
    snapshot.miners.length === next.miners.length &&
    snapshot.repos.length === next.repos.length &&
    snapshot.bounties.length === next.bounties.length &&
    snapshot.prs.length === next.prs.length &&
    snapshot.miners.every((v, i) => v === next.miners[i]) &&
    snapshot.repos.every((v, i) => v === next.repos[i]) &&
    snapshot.bounties.every((v, i) => v === next.bounties[i]) &&
    snapshot.prs.every((v, i) => v === next.prs[i]);
  if (unchanged) return;
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(next));
  } catch {
    /* storage unavailable — in-memory state still works */
  }
  notify();
};

const handleStorageEvent = (e: StorageEvent) => {
  if (e.key !== STORAGE_KEY_V2) return;
  snapshot = readV2FromStorage();
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

/* ------------------------------------------------------------------ */
/*  Public hook                                                        */
/* ------------------------------------------------------------------ */

interface UseWatchlist {
  /** All miner IDs (backward-compatible with the old flat array). */
  ids: string[];
  /** Total count across all categories. */
  count: number;
  /** Per-category item lists. */
  items: WatchlistShapeV2;
  /** Check if an item key is watched in a given category. */
  isWatched: (category: WatchlistCategory, itemKey: string) => boolean;
  /** Backward-compatible miner-specific check. */
  isMinerWatched: (githubId: string) => boolean;
  /** Add an item to a category. */
  add: (category: WatchlistCategory, itemKey: string) => void;
  /** Remove an item from a category. */
  remove: (category: WatchlistCategory, itemKey: string) => void;
  /** Toggle an item in a category. */
  toggle: (category: WatchlistCategory, itemKey: string) => void;
  /** Clear a specific category (or all when omitted). */
  clear: (category?: WatchlistCategory) => void;
}

export const useWatchlist = (): UseWatchlist => {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const ids = useMemo(() => items.miners, [items.miners]); // backward compat

  const count = useMemo(
    () =>
      items.miners.length +
      items.repos.length +
      items.bounties.length +
      items.prs.length,
    [items],
  );

  const isWatched = useCallback(
    (category: WatchlistCategory, itemKey: string) =>
      snapshot[category].includes(itemKey),
    // re-bind when any list changes so consumers re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  const isMinerWatched = useCallback(
    (githubId: string) => snapshot.miners.includes(githubId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.miners],
  );

  const add = useCallback(
    (category: WatchlistCategory, itemKey: string) => {
      if (!itemKey || snapshot[category].includes(itemKey)) return;
      setSnapshot({
        ...snapshot,
        [category]: [...snapshot[category], itemKey],
      });
    },
    [],
  );

  const remove = useCallback(
    (category: WatchlistCategory, itemKey: string) => {
      if (!snapshot[category].includes(itemKey)) return;
      setSnapshot({
        ...snapshot,
        [category]: snapshot[category].filter((x) => x !== itemKey),
      });
    },
    [],
  );

  const toggle = useCallback(
    (category: WatchlistCategory, itemKey: string) => {
      if (!itemKey) return;
      setSnapshot({
        ...snapshot,
        [category]: snapshot[category].includes(itemKey)
          ? snapshot[category].filter((x) => x !== itemKey)
          : [...snapshot[category], itemKey],
      });
    },
    [],
  );

  const clear = useCallback((category?: WatchlistCategory) => {
    if (category) {
      setSnapshot({ ...snapshot, [category]: [] });
    } else {
      setSnapshot(emptyShape());
    }
  }, []);

  return { ids, count, items, isWatched, isMinerWatched, add, remove, toggle, clear };
};

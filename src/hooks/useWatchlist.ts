import { useCallback, useSyncExternalStore } from 'react';
import { compareByWatchlist } from '../utils/watchlistSort';

// TODO(2026-Q3): drop V1_KEY read path once the rollback window closes.
const V1_KEY = 'gittensor.watchlist.v1';
const V2_KEY = 'gittensor.watchlist.v2';

export type WatchlistCategory =
  | 'miners'
  | 'repos'
  | 'bounties'
  | 'prs'
  | 'issues';

const CATEGORIES: readonly WatchlistCategory[] = [
  'miners',
  'repos',
  'bounties',
  'prs',
  'issues',
] as const;

type WatchlistState = Record<WatchlistCategory, string[]>;

const EMPTY_STATE: WatchlistState = {
  miners: [],
  repos: [],
  bounties: [],
  prs: [],
  issues: [],
};

type Listener = () => void;
const listeners = new Set<Listener>();

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((x): x is string => typeof x === 'string')
    : [];

const normalizeIds = (ids: string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
};

// Read v2 if present, otherwise migrate v1 (legacy miner-only string[]) into
// the new shape. The v1 key is left intact so a downgrade can still recover.
const readFromStorage = (): WatchlistState => {
  try {
    const v2Raw = window.localStorage.getItem(V2_KEY);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      if (parsed && typeof parsed === 'object') {
        return {
          miners: normalizeIds(
            toStringArray((parsed as Record<string, unknown>).miners),
          ),
          repos: normalizeIds(
            toStringArray((parsed as Record<string, unknown>).repos),
          ),
          bounties: normalizeIds(
            toStringArray((parsed as Record<string, unknown>).bounties),
          ),
          prs: normalizeIds(
            toStringArray((parsed as Record<string, unknown>).prs),
          ),
          issues: normalizeIds(
            toStringArray((parsed as Record<string, unknown>).issues),
          ),
        };
      }
      return EMPTY_STATE;
    }
    const v1Raw = window.localStorage.getItem(V1_KEY);
    if (v1Raw) {
      return {
        ...EMPTY_STATE,
        miners: normalizeIds(toStringArray(JSON.parse(v1Raw))),
      };
    }
    return EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
};

// Module-level snapshot — every useWatchlist() instance in the tab reads from
// the same reference, so writes from any caller propagate to all consumers.
let snapshot: WatchlistState = readFromStorage();

// Stable per-category id arrays so React's identity check skips re-renders
// for tabs whose category did not change between writes.
let categoryCache: WatchlistState = snapshot;

const notify = () => {
  listeners.forEach((l) => l());
};

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// Apply a new snapshot to the in-memory store. When `persist` is true the
// value is also written back to localStorage; when false (cross-tab echo)
// we skip the write because another tab has already persisted it.
const applySnapshot = (next: WatchlistState, persist: boolean) => {
  const nextCache: WatchlistState = { ...categoryCache };
  let changed = false;
  for (const cat of CATEGORIES) {
    if (!arraysEqual(next[cat], categoryCache[cat])) {
      nextCache[cat] = next[cat];
      changed = true;
    }
  }
  if (!changed) return;
  snapshot = next;
  categoryCache = nextCache;
  if (persist) {
    try {
      window.localStorage.setItem(V2_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode, quota). In-memory state still works.
    }
  }
  notify();
};

const setSnapshot = (next: WatchlistState) => applySnapshot(next, true);

const handleStorageEvent = (e: StorageEvent) => {
  if (e.key !== V2_KEY && e.key !== V1_KEY) return;
  applySnapshot(readFromStorage(), false);
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

const totalCountOf = (state: WatchlistState) =>
  state.miners.length +
  state.repos.length +
  state.bounties.length +
  state.prs.length +
  state.issues.length;

interface UseWatchlist {
  ids: string[];
  count: number;
  isWatched: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
}

export const useWatchlist = (
  category: WatchlistCategory = 'miners',
): UseWatchlist => {
  const getter = useCallback(
    (): string[] => categoryCache[category],
    [category],
  );
  const ids = useSyncExternalStore(subscribe, getter, getter);

  const isWatched = useCallback(
    (id: string) => snapshot[category].includes(id),
    // Depending on `ids` ensures consumers re-render when the snapshot changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, category],
  );

  // Action callbacks read from the module-level `snapshot`, not the rendered
  // `ids`. This is the key to rapid-click correctness: two fast toggles see
  // each other's writes immediately instead of both reading a stale array.
  const add = useCallback(
    (id: string) => {
      const normalizedId = id.trim();
      if (!normalizedId || snapshot[category].includes(normalizedId)) return;
      setSnapshot({
        ...snapshot,
        [category]: normalizeIds([...snapshot[category], normalizedId]),
      });
    },
    [category],
  );

  const remove = useCallback(
    (id: string) => {
      const normalizedId = id.trim();
      if (!snapshot[category].includes(normalizedId)) return;
      setSnapshot({
        ...snapshot,
        [category]: snapshot[category].filter((x) => x !== normalizedId),
      });
    },
    [category],
  );

  const toggle = useCallback(
    (id: string) => {
      const normalizedId = id.trim();
      if (!normalizedId) return;
      const list = snapshot[category];
      setSnapshot({
        ...snapshot,
        [category]: list.includes(normalizedId)
          ? list.filter((x) => x !== normalizedId)
          : normalizeIds([...list, normalizedId]),
      });
    },
    [category],
  );

  const clear = useCallback(
    () => setSnapshot({ ...snapshot, [category]: [] }),
    [category],
  );

  return {
    ids,
    count: ids.length,
    isWatched,
    add,
    remove,
    toggle,
    clear,
  };
};

// Subscribes to changes in any category. Use this when a consumer cares
// about the aggregate (e.g. the sidebar badge) and would otherwise miss
// updates that happen outside its current category.
const getTotalCountSnapshot = () => totalCountOf(snapshot);

export const useWatchlistTotalCount = (): number =>
  useSyncExternalStore(subscribe, getTotalCountSnapshot, getTotalCountSnapshot);

// Stable per-category count map. Recomputed only when the snapshot changes,
// so consumers (e.g. tab badges) hold a single subscription and see the
// same reference across renders when nothing changed.
type CountsMap = Record<WatchlistCategory, number>;
let countsCache: CountsMap = {
  miners: snapshot.miners.length,
  repos: snapshot.repos.length,
  bounties: snapshot.bounties.length,
  prs: snapshot.prs.length,
  issues: snapshot.issues.length,
};
let countsCacheSource: WatchlistState = snapshot;

const getCountsSnapshot = (): CountsMap => {
  if (countsCacheSource !== snapshot) {
    countsCache = {
      miners: snapshot.miners.length,
      repos: snapshot.repos.length,
      bounties: snapshot.bounties.length,
      prs: snapshot.prs.length,
      issues: snapshot.issues.length,
    };
    countsCacheSource = snapshot;
  }
  return countsCache;
};

export const useWatchlistCounts = (): CountsMap =>
  useSyncExternalStore(subscribe, getCountsSnapshot, getCountsSnapshot);

// PRs are identified by a composite "owner/repo#number" key. Callers
// should always use this helper to avoid drift in key format.
export const serializePRKey = (repo: string, number: number): string =>
  `${repo}#${number}`;

export const comparePRsByWatchlist = <
  T extends { repository: string; pullRequestNumber: number },
>(
  a: T,
  b: T,
  isWatched: (key: string) => boolean,
): number =>
  compareByWatchlist(
    a,
    b,
    (pr) => serializePRKey(pr.repository, pr.pullRequestNumber),
    isWatched,
  );

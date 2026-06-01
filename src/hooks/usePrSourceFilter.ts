import { useCallback, useSyncExternalStore } from 'react';
import type { WatchedPRSource } from './useWatchedPRs';

const KEY = 'gittensor.watchlist.prs-source-filter.v1';
const ALL_SOURCES: readonly WatchedPRSource[] = [
  'starred',
  'miner',
  'repo',
] as const;
const ALL_SOURCES_SET: ReadonlySet<WatchedPRSource> = new Set(ALL_SOURCES);

const isSource = (v: unknown): v is WatchedPRSource =>
  v === 'starred' || v === 'miner' || v === 'repo';

const parseSourceFilter = (raw: unknown): Set<WatchedPRSource> => {
  if (typeof raw !== 'string') return new Set(ALL_SOURCES);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Set(ALL_SOURCES);
  }
  if (!Array.isArray(parsed)) return new Set(ALL_SOURCES);
  const next = new Set<WatchedPRSource>();
  for (const v of parsed) if (isSource(v)) next.add(v);
  // An empty selection hides every PR with no obvious way to recover from the
  // UI. Treat a stale/corrupt empty value as "all on" so reloading restores
  // visibility instead of leaving the watchlist permanently blank.
  return next.size > 0 ? next : new Set(ALL_SOURCES);
};

const sameSet = (
  a: ReadonlySet<WatchedPRSource>,
  b: ReadonlySet<WatchedPRSource>,
): boolean => {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
};

const readFromStorage = (): Set<WatchedPRSource> => {
  try {
    return parseSourceFilter(window.localStorage.getItem(KEY));
  } catch {
    return new Set(ALL_SOURCES);
  }
};

let snapshot: Set<WatchedPRSource> = readFromStorage();
const listeners = new Set<() => void>();

const write = (next: Set<WatchedPRSource>) => {
  if (sameSet(next, snapshot)) return;
  snapshot = next;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(ALL_SOURCES.filter((s) => next.has(s))),
    );
  } catch {
    // Storage unavailable (private mode, quota). In-memory state still works.
  }
  listeners.forEach((l) => l());
};

const handleStorageEvent = (e: StorageEvent) => {
  if (e.key !== KEY) return;
  const next = readFromStorage();
  if (sameSet(next, snapshot)) return;
  snapshot = next;
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
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

interface UsePrSourceFilter {
  active: Set<WatchedPRSource>;
  toggle: (source: WatchedPRSource) => void;
  isAllOn: boolean;
}

export const usePrSourceFilter = (): UsePrSourceFilter => {
  const active = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toggle = useCallback((source: WatchedPRSource) => {
    const next = new Set(snapshot);
    if (next.has(source)) {
      // Keep at least one source active — disabling the final one would
      // empty the filter and hide every PR with no recovery in the UI.
      if (next.size === 1) return;
      next.delete(source);
    } else {
      next.add(source);
    }
    write(next);
  }, []);

  return {
    active,
    toggle,
    isAllOn: sameSet(active, ALL_SOURCES_SET),
  };
};

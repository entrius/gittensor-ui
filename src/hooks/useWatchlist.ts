import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'gittensor.watchlist.v1';

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

const writeToStorage = (ids: string[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode, quota). In-memory state still works.
  }
};

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
  const [ids, setIds] = useState<string[]>(() => readFromStorage());

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setIds(readFromStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    writeToStorage(next);
  }, []);

  const isWatched = useCallback((id: string) => ids.includes(id), [ids]);

  const add = useCallback(
    (id: string) => {
      if (!id || ids.includes(id)) return;
      persist([...ids, id]);
    },
    [ids, persist],
  );

  const remove = useCallback(
    (id: string) => {
      if (!ids.includes(id)) return;
      persist(ids.filter((x) => x !== id));
    },
    [ids, persist],
  );

  const toggle = useCallback(
    (id: string) => {
      persist(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    },
    [ids, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { ids, count: ids.length, isWatched, add, remove, toggle, clear };
};

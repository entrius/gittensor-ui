// Local snapshot of yesterday's ranks so we can render day-over-day movement without backend support.
import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'gittensor.rank-snapshot.v1';

interface Snapshot {
  date: string;
  ranks: Record<string, number>;
}

interface StoredShape {
  today: Snapshot | null;
  prev: Snapshot | null;
}

const EMPTY: StoredShape = { today: null, prev: null };

const utcDateKey = (ms: number = Date.now()): string => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const parseSnapshot = (v: unknown): Snapshot | null => {
  if (!isPlainObject(v)) return null;
  const date = v.date;
  const ranks = v.ranks;
  if (typeof date !== 'string' || !isPlainObject(ranks)) return null;
  const cleanRanks: Record<string, number> = {};
  for (const [k, val] of Object.entries(ranks)) {
    if (typeof val === 'number' && Number.isFinite(val)) cleanRanks[k] = val;
  }
  return { date, ranks: cleanRanks };
};

const readStored = (): StoredShape => {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return EMPTY;
    return {
      today: parseSnapshot(parsed.today),
      prev: parseSnapshot(parsed.prev),
    };
  } catch {
    return EMPTY;
  }
};

const writeStored = (state: StoredShape): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota.
  }
};

const toMap = (
  ranks: Record<string, number> | undefined,
): Map<string, number> => {
  const map = new Map<string, number>();
  if (!ranks) return map;
  for (const [k, v] of Object.entries(ranks)) map.set(k, v);
  return map;
};

interface UseRankSnapshot {
  previousRanks: Map<string, number>;
  isHydrated: boolean;
}

// Capture gated on `currentRanks.size > 0` so an empty baseline doesn't erase tomorrow's signal.
export const useRankSnapshot = (
  currentRanks: Map<string, number>,
): UseRankSnapshot => {
  const [previous, setPrevious] = useState<Map<string, number>>(new Map());
  const [isHydrated, setIsHydrated] = useState(false);
  const capturedRef = useRef(false);

  useEffect(() => {
    if (capturedRef.current) return;
    if (currentRanks.size === 0) return;

    const today = utcDateKey();
    const stored = readStored();

    if (stored.today && stored.today.date === today) {
      setPrevious(toMap(stored.prev?.ranks));
    } else {
      // New UTC day — rotate today → prev, capture now.
      const rotatedPrev = stored.today ?? stored.prev ?? null;
      const ranksObj: Record<string, number> = {};
      currentRanks.forEach((rank, id) => {
        ranksObj[id] = rank;
      });
      const nextStored: StoredShape = {
        today: { date: today, ranks: ranksObj },
        prev: rotatedPrev,
      };
      writeStored(nextStored);
      setPrevious(toMap(rotatedPrev?.ranks));
    }

    capturedRef.current = true;
    setIsHydrated(true);
  }, [currentRanks]);

  return useMemo(
    () => ({ previousRanks: previous, isHydrated }),
    [previous, isHydrated],
  );
};

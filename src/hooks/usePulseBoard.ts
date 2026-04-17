import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'gittensor.pulseboard.v1';
const MAX_PINNED = 4;
const SNAPSHOT_THROTTLE_MS = 30 * 60 * 1000; // 30 minutes

export interface MinerSnapshot {
  capturedAt: string;
  totalScore: number;
  rank: number;
  credibility: number;
  totalMergedPrs: number;
  totalSolvedIssues: number;
  usdPerDay: number;
}

interface PulseBoardState {
  pinned: string[];
  snapshots: Record<string, MinerSnapshot>;
}

export interface LiveMinerData {
  githubId: string;
  totalScore: number;
  rank?: number;
  credibility: number;
  totalMergedPrs: number;
  totalSolvedIssues?: number;
  usdPerDay: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

const EMPTY_STATE: PulseBoardState = { pinned: [], snapshots: {} };

const readFromStorage = (): PulseBoardState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.pinned)
    ) {
      return EMPTY_STATE;
    }
    return {
      pinned: parsed.pinned.filter(
        (x: unknown): x is string => typeof x === 'string',
      ),
      snapshots:
        parsed.snapshots && typeof parsed.snapshots === 'object'
          ? parsed.snapshots
          : {},
    };
  } catch {
    return EMPTY_STATE;
  }
};

let snapshot: PulseBoardState = readFromStorage();

const notify = () => listeners.forEach((l) => l());

const persist = (next: PulseBoardState) => {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable
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

export interface UsePulseBoard {
  pinned: string[];
  pinnedCount: number;
  snapshots: Record<string, MinerSnapshot>;
  isPinned: (id: string) => boolean;
  canPin: boolean;
  pin: (id: string) => void;
  unpin: (id: string) => void;
  togglePin: (id: string) => void;
  clearPins: () => void;
  takeSnapshot: (miners: LiveMinerData[]) => void;
  getDelta: (id: string, field: keyof MinerSnapshot) => number | null;
}

export const usePulseBoard = (): UsePulseBoard => {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const isPinned = useCallback(
    (id: string) => snapshot.pinned.includes(id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  const canPin = state.pinned.length < MAX_PINNED;

  const pin = useCallback((id: string) => {
    if (!id || snapshot.pinned.includes(id)) return;
    if (snapshot.pinned.length >= MAX_PINNED) return;
    persist({ ...snapshot, pinned: [...snapshot.pinned, id] });
  }, []);

  const unpin = useCallback((id: string) => {
    if (!snapshot.pinned.includes(id)) return;
    persist({
      ...snapshot,
      pinned: snapshot.pinned.filter((x) => x !== id),
    });
  }, []);

  const togglePin = useCallback((id: string) => {
    if (!id) return;
    if (snapshot.pinned.includes(id)) {
      persist({
        ...snapshot,
        pinned: snapshot.pinned.filter((x) => x !== id),
      });
    } else if (snapshot.pinned.length < MAX_PINNED) {
      persist({ ...snapshot, pinned: [...snapshot.pinned, id] });
    }
  }, []);

  const clearPins = useCallback(() => {
    persist({ ...snapshot, pinned: [], snapshots: {} });
  }, []);

  const takeSnapshot = useCallback((miners: LiveMinerData[]) => {
    const now = new Date().toISOString();
    const existing = snapshot.snapshots;

    // Check if any existing snapshot is recent enough to skip
    const anyRecent = snapshot.pinned.some((id) => {
      const prev = existing[id];
      if (!prev) return false;
      const age = Date.now() - new Date(prev.capturedAt).getTime();
      return age < SNAPSHOT_THROTTLE_MS;
    });

    if (anyRecent) return;

    const nextSnapshots: Record<string, MinerSnapshot> = { ...existing };
    const minerMap = new Map(miners.map((m) => [m.githubId, m]));

    for (const id of snapshot.pinned) {
      const miner = minerMap.get(id);
      if (!miner) continue;
      nextSnapshots[id] = {
        capturedAt: now,
        totalScore: miner.totalScore,
        rank: miner.rank ?? 0,
        credibility: miner.credibility,
        totalMergedPrs: miner.totalMergedPrs,
        totalSolvedIssues: miner.totalSolvedIssues ?? 0,
        usdPerDay: miner.usdPerDay,
      };
    }

    persist({ ...snapshot, snapshots: nextSnapshots });
  }, []);

  const getDelta = useCallback(
    (id: string, field: keyof MinerSnapshot): number | null => {
      const prev = snapshot.snapshots[id];
      if (!prev || field === 'capturedAt') return null;

      const miners = snapshot.pinned;
      if (!miners.includes(id)) return null;

      // We need current data — caller provides it via takeSnapshot
      // getDelta returns the diff between current snapshot and previous
      // Since snapshots are overwritten, we store "previous" as the snapshot
      // and the caller compares live data against it
      return null; // Overridden in component via live data comparison
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  return {
    pinned: state.pinned,
    pinnedCount: state.pinned.length,
    snapshots: state.snapshots,
    isPinned,
    canPin,
    pin,
    unpin,
    togglePin,
    clearPins,
    takeSnapshot,
    getDelta,
  };
};

// Pure utility functions for delta computation (used by components with live data)

export const computeDelta = (live: number, snapshotValue: number): number =>
  live - snapshotValue;

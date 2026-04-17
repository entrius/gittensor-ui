import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'gittensor.recentlyViewed.v1';
const MAX_ITEMS = 12;

export type RecentItemKind = 'miner' | 'repo' | 'pr' | 'issue';

export interface RecentItem {
  kind: RecentItemKind;
  key: string;
  title: string;
  subtitle: string;
  href: string;
  avatarUrl?: string;
  avatarBg?: string;
}

export interface StoredRecentItem extends RecentItem {
  viewedAt: number;
}

const VALID_KINDS: ReadonlySet<RecentItemKind> = new Set<RecentItemKind>([
  'miner',
  'repo',
  'pr',
  'issue',
]);

const identityOf = (i: Pick<RecentItem, 'kind' | 'key'>) =>
  `${i.kind}|${i.key}`;

const isStoredItem = (v: unknown): v is StoredRecentItem => {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.kind === 'string' &&
    VALID_KINDS.has(r.kind as RecentItemKind) &&
    typeof r.key === 'string' &&
    r.key.length > 0 &&
    typeof r.title === 'string' &&
    typeof r.subtitle === 'string' &&
    typeof r.href === 'string' &&
    typeof r.viewedAt === 'number' &&
    (r.avatarUrl === undefined || typeof r.avatarUrl === 'string') &&
    (r.avatarBg === undefined || typeof r.avatarBg === 'string')
  );
};

const readFromStorage = (): StoredRecentItem[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredItem) : [];
  } catch {
    return [];
  }
};

type Listener = () => void;
const listeners = new Set<Listener>();

// Module-level snapshot shared by every hook consumer, matching the pattern
// in useWatchlist so writes from any caller propagate immediately.
let snapshot: StoredRecentItem[] = readFromStorage();

const notify = () => listeners.forEach((l) => l());

const persist = (next: StoredRecentItem[]) => {
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

// Re-read from storage before mutating: detail pages may track without a
// subscriber mounted, so the module snapshot could be stale after a write
// from another tab.
const trackRecent = (item: RecentItem) => {
  if (!item.key) return;
  const id = identityOf(item);
  const current = readFromStorage();
  const next: StoredRecentItem[] = [
    { ...item, viewedAt: Date.now() },
    ...current.filter((existing) => identityOf(existing) !== id),
  ].slice(0, MAX_ITEMS);
  persist(next);
};

interface UseRecentlyViewed {
  items: StoredRecentItem[];
  count: number;
  track: (item: RecentItem) => void;
  clear: () => void;
}

export const useRecentlyViewed = (): UseRecentlyViewed => {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const track = useCallback(trackRecent, []);
  const clear = useCallback(() => persist([]), []);
  return { items, count: items.length, track, clear };
};

// Records a visit whenever the item's identity or displayed fields change.
// Pass `null` while data is still loading; tracking is a no-op until a real
// item is provided, so pages can call this unconditionally at the top level.
export const useTrackRecentlyViewed = (item: RecentItem | null) => {
  const sig = item
    ? `${item.kind}|${item.key}|${item.title}|${item.subtitle}|${item.href}|${item.avatarUrl ?? ''}|${item.avatarBg ?? ''}`
    : '';
  // Deriving a stable reference from `sig` means the effect re-runs only when
  // a visible field actually changes, not on every parent re-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableItem = useMemo(() => item, [sig]);
  useEffect(() => {
    if (stableItem) trackRecent(stableItem);
  }, [stableItem]);
};

import { useEffect, useRef, useState } from 'react';

interface CommitLike {
  pullRequestNumber: number;
  mergedAt: string | null;
  prCreatedAt: string;
  prState?: string;
}

const ANIMATION_DURATION_MS = 2000;
// Bound the seen-IDs set so a long-lived dashboard doesn't leak memory across hours of polling.
const MAX_SEEN_IDS = 5000;

const getCommitId = (c: CommitLike) =>
  `${c.pullRequestNumber}-${c.mergedAt || c.prCreatedAt || c.prState || 'OPEN'}`;

const getCommitTime = (c: CommitLike) => {
  const t = new Date(c.mergedAt || c.prCreatedAt).getTime();
  return Number.isFinite(t) ? t : 0;
};

const trimSet = (set: Set<string>, max: number) => {
  const overflow = set.size - max;
  if (overflow <= 0) return;
  let removed = 0;
  for (const id of set) {
    if (removed >= overflow) break;
    set.delete(id);
    removed++;
  }
};

/**
 * Tracks an append-only commit log fed by a polling/paginating API.
 *
 * - Prepends commits whose timestamp is newer than anything previously seen (head update),
 *   appends everything else (paginated history).
 * - Returns the IDs of the most recent head update so the caller can animate them
 *   for ANIMATION_DURATION_MS.
 * - Skips animation on the very first fill so initial commits don't all pulse at once.
 */
export const useCommitLogStream = <T extends CommitLike>(apiCommits: T[]) => {
  const [logEntries, setLogEntries] = useState<T[]>([]);
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const newestTimestampRef = useRef<number>(0);
  const hasPopulatedRef = useRef<boolean>(false);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (apiCommits.length === 0) return;

    const seen = seenIdsRef.current;
    const novelItems: T[] = [];
    for (const c of apiCommits) {
      const id = getCommitId(c);
      if (!seen.has(id)) {
        novelItems.push(c);
        seen.add(id);
      }
    }
    if (novelItems.length === 0) return;

    trimSet(seen, MAX_SEEN_IDS);

    const incomingMax = novelItems.reduce(
      (max, c) => Math.max(max, getCommitTime(c)),
      0,
    );
    const isHeadUpdate =
      hasPopulatedRef.current && incomingMax > newestTimestampRef.current;
    newestTimestampRef.current = Math.max(
      newestTimestampRef.current,
      incomingMax,
    );

    setLogEntries((prev) =>
      prev.length === 0
        ? [...apiCommits]
        : isHeadUpdate
          ? [...novelItems, ...prev]
          : [...prev, ...novelItems],
    );
    hasPopulatedRef.current = true;

    if (isHeadUpdate) {
      setNewEntryIds(new Set(novelItems.map(getCommitId)));
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      animationTimerRef.current = setTimeout(() => {
        setNewEntryIds(new Set());
        animationTimerRef.current = null;
      }, ANIMATION_DURATION_MS);
    }
  }, [apiCommits]);

  return { logEntries, newEntryIds };
};

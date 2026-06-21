import { useMemo } from 'react';
import { useRecentCommits, type CommitLog } from '../../api';
import { parseNumber } from '../../utils/ExplorerUtils';

export interface MinerActivity {
  dailyMerged: number[];
  dailyOss: number[];
  dailyDiscovery: number[];
  topRepos: { name: string; count: number }[];
  lastActiveAt: string | null;
  reviewHits: number;
}

export type MinerActivityIndex = Map<string, MinerActivity>;

export interface NetworkRepoActivity {
  name: string;
  count: number;
  minerCount: number;
}

export interface NetworkActivity {
  dailyMerged: number[];
  dailyOss: number[];
  dailyDiscovery: number[];
  last7: number;
  prior7: number;
  topRepos: NetworkRepoActivity[];
}

interface Options {
  lookbackDays?: number;
  topReposLimit?: number;
  commitLimit?: number;
}

const MS_PER_DAY = 86_400_000;
const REVIEW_PENALTY_RATE = 0.15;

const startOfUtcDay = (ms: number): number => {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

const emptyMiner = (lookbackDays: number): MinerActivity => ({
  dailyMerged: new Array(lookbackDays).fill(0),
  dailyOss: new Array(lookbackDays).fill(0),
  dailyDiscovery: new Array(lookbackDays).fill(0),
  topRepos: [],
  lastActiveAt: null,
  reviewHits: 0,
});

// Mirrors `isIssueDiscoveryContributionPr` in `utils/ExplorerUtils.ts`.
export const isDiscoveryCommit = (commit: CommitLog): boolean => {
  const im = commit.issueMultiplier;
  if (im !== undefined && im !== null && String(im).trim() !== '') {
    if (parseNumber(im) > 0) return true;
  }
  if (commit.labelMultiplier !== undefined && commit.labelMultiplier !== null) {
    if (parseNumber(commit.labelMultiplier) > 0) return true;
  }
  if (commit.label !== undefined && commit.label !== null) {
    if (String(commit.label).trim() !== '') return true;
  }
  return false;
};

// multiplier = max(0, 1 - 0.15 × N), so N = round((1 - m) / 0.15).
const inferReviewHits = (multiplier: string | undefined): number => {
  if (multiplier === undefined) return 0;
  const m = parseNumber(multiplier);
  if (!Number.isFinite(m) || m >= 1) return 0;
  return Math.max(0, Math.round((1 - m) / REVIEW_PENALTY_RATE));
};

interface BuildResult {
  index: MinerActivityIndex;
  network: NetworkActivity;
}

const buildIndex = (
  commits: CommitLog[],
  lookbackDays: number,
  topReposLimit: number,
): BuildResult => {
  const today = startOfUtcDay(Date.now());
  const windowStart = today - (lookbackDays - 1) * MS_PER_DAY;
  const index = new Map<string, MinerActivity>();
  const networkDaily = new Array(lookbackDays).fill(0);
  const networkOss = new Array(lookbackDays).fill(0);
  const networkDiscovery = new Array(lookbackDays).fill(0);
  const repoTotals = new Map<
    string,
    { count: number; minerIds: Set<string> }
  >();

  for (const commit of commits) {
    const githubId = commit.githubId?.trim();
    if (!githubId) continue;

    let entry = index.get(githubId);
    if (!entry) {
      entry = emptyMiner(lookbackDays);
      index.set(githubId, entry);
    }

    if (commit.mergedAt) {
      const mergedAt = Date.parse(commit.mergedAt);
      if (Number.isFinite(mergedAt) && mergedAt >= windowStart) {
        const day = startOfUtcDay(mergedAt);
        const slot = Math.round((day - windowStart) / MS_PER_DAY);
        if (slot >= 0 && slot < lookbackDays) {
          entry.dailyMerged[slot] += 1;
          networkDaily[slot] += 1;
          if (isDiscoveryCommit(commit)) {
            entry.dailyDiscovery[slot] += 1;
            networkDiscovery[slot] += 1;
          } else {
            entry.dailyOss[slot] += 1;
            networkOss[slot] += 1;
          }
        }
      }
    }

    const activityIso = commit.mergedAt ?? commit.prCreatedAt ?? null;
    if (activityIso) {
      if (
        !entry.lastActiveAt ||
        Date.parse(activityIso) > Date.parse(entry.lastActiveAt)
      ) {
        entry.lastActiveAt = activityIso;
      }
    }

    if (commit.repository) {
      const existing = entry.topRepos.find((r) => r.name === commit.repository);
      if (existing) existing.count += 1;
      else entry.topRepos.push({ name: commit.repository, count: 1 });

      let bucket = repoTotals.get(commit.repository);
      if (!bucket) {
        bucket = { count: 0, minerIds: new Set() };
        repoTotals.set(commit.repository, bucket);
      }
      bucket.count += 1;
      bucket.minerIds.add(githubId);
    }

    entry.reviewHits += inferReviewHits(commit.reviewQualityMultiplier);
  }

  for (const entry of index.values()) {
    entry.topRepos.sort((a, b) => b.count - a.count);
    if (entry.topRepos.length > topReposLimit) {
      entry.topRepos.length = topReposLimit;
    }
  }

  const last7 = networkDaily.slice(-7).reduce((a, b) => a + b, 0);
  const prior7 =
    lookbackDays >= 14
      ? networkDaily.slice(-14, -7).reduce((a, b) => a + b, 0)
      : 0;

  const topRepos: NetworkRepoActivity[] = Array.from(repoTotals.entries())
    .map(([name, bucket]) => ({
      name,
      count: bucket.count,
      minerCount: bucket.minerIds.size,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    index,
    network: {
      dailyMerged: networkDaily,
      dailyOss: networkOss,
      dailyDiscovery: networkDiscovery,
      last7,
      prior7,
      topRepos,
    },
  };
};

const EMPTY_NETWORK: NetworkActivity = {
  dailyMerged: [],
  dailyOss: [],
  dailyDiscovery: [],
  last7: 0,
  prior7: 0,
  topRepos: [],
};

export const useMinerActivityIndex = (
  options: Options = {},
): {
  index: MinerActivityIndex;
  network: NetworkActivity;
  isLoading: boolean;
} => {
  const { lookbackDays = 30, topReposLimit = 3, commitLimit = 5000 } = options;

  const { data, isLoading } = useRecentCommits(commitLimit);

  const built = useMemo<BuildResult>(() => {
    if (!data) return { index: new Map(), network: EMPTY_NETWORK };
    return buildIndex(data, lookbackDays, topReposLimit);
  }, [data, lookbackDays, topReposLimit]);

  return {
    index: built.index,
    network: built.network,
    isLoading,
  };
};

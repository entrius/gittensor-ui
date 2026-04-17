import { useMemo } from 'react';
import { useMinerPRs, type CommitLog } from '../api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RepoTerritory {
  fullName: string;
  weight: number;
  presence: { githubId: string; author: string; prCount: number; totalScore: number }[];
  isContested: boolean;
  isFrontier: boolean;
}

export interface LiveBet {
  githubId: string;
  author: string;
  pullRequestNumber: number;
  pullRequestTitle: string;
  repository: string;
  potentialScore: number;
  predictedUsdPerDay: number | null;
  prCreatedAt: string;
  additions: number;
  deletions: number;
}

export interface MinerFingerprint {
  githubId: string;
  author: string;
  prSize: number;
  tierFocus: number;
  cadence: number;
  diversity: number;
  complexity: number;
}

// ── Territory Map Builder ──────────────────────────────────────────────────

const buildTerritoryMap = (
  miners: { githubId: string; author: string; prs: CommitLog[] }[],
): Map<string, RepoTerritory> => {
  const map = new Map<string, RepoTerritory>();

  for (const miner of miners) {
    for (const pr of miner.prs) {
      const repo = pr.repository;
      if (!repo) continue;

      let entry = map.get(repo);
      if (!entry) {
        entry = {
          fullName: repo,
          weight: parseFloat(pr.repoWeightMultiplier ?? '0'),
          presence: [],
          isContested: false,
          isFrontier: false,
        };
        map.set(repo, entry);
      }

      // Update weight to max seen
      const w = parseFloat(pr.repoWeightMultiplier ?? '0');
      if (w > entry.weight) entry.weight = w;

      // Find or create presence entry
      let pres = entry.presence.find((p) => p.githubId === miner.githubId);
      if (!pres) {
        pres = {
          githubId: miner.githubId,
          author: miner.author,
          prCount: 0,
          totalScore: 0,
        };
        entry.presence.push(pres);
      }
      pres.prCount += 1;
      pres.totalScore += parseFloat(pr.score ?? '0');
    }
  }

  // Mark contested repos
  for (const entry of map.values()) {
    entry.isContested = entry.presence.length >= 2;
  }

  return map;
};

// ── Live Bets Extractor ────────────────────────────────────────────────────

const extractLiveBets = (
  miners: { githubId: string; author: string; prs: CommitLog[] }[],
): LiveBet[] => {
  const bets: LiveBet[] = [];

  for (const miner of miners) {
    for (const pr of miner.prs) {
      if (pr.prState !== 'OPEN') continue;
      bets.push({
        githubId: miner.githubId,
        author: miner.author,
        pullRequestNumber: pr.pullRequestNumber,
        pullRequestTitle: pr.pullRequestTitle,
        repository: pr.repository,
        potentialScore: pr.potentialScore ?? 0,
        predictedUsdPerDay: pr.predictedUsdPerDay ?? null,
        additions: pr.additions,
        deletions: pr.deletions,
        prCreatedAt: pr.prCreatedAt,
      });
    }
  }

  return bets.sort((a, b) => b.potentialScore - a.potentialScore);
};

// ── Strategy Fingerprint Builder ───────────────────────────────────────────

const avg = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

const weekSpan = (prs: CommitLog[]): number => {
  if (prs.length < 2) return 1;
  const dates = prs
    .map((p) => {
      const raw = p.mergedAt ?? p.prCreatedAt;
      if (!raw) return NaN;
      return new Date(raw).getTime();
    })
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);
  if (dates.length < 2) return 1;
  const span = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24 * 7);
  return Math.max(1, span);
};

const buildFingerprint = (
  githubId: string,
  author: string,
  prs: CommitLog[],
): MinerFingerprint => {
  const merged = prs.filter(
    (p) => p.prState === 'MERGED' || !!p.mergedAt,
  );

  if (merged.length === 0) {
    return {
      githubId,
      author,
      prSize: 0,
      tierFocus: 0,
      cadence: 0,
      diversity: 0,
      complexity: 0,
    };
  }

  const uniqueRepos = new Set(merged.map((p) => p.repository)).size;

  return {
    githubId,
    author,
    prSize: avg(merged.map((p) => p.additions + p.deletions)),
    tierFocus: avg(
      merged.map((p) => parseFloat(p.repoWeightMultiplier ?? '0')),
    ),
    cadence: merged.length / weekSpan(merged),
    diversity: uniqueRepos / merged.length,
    complexity: avg(merged.map((p) => Number(p.tokenScore) || 0)),
  };
};

// ── Main Hook ──────────────────────────────────────────────────────────────

interface UseWatchlistIntelResult {
  territoryMap: Map<string, RepoTerritory>;
  liveBets: LiveBet[];
  fingerprints: MinerFingerprint[];
  isLoading: boolean;
}

export const useWatchlistIntel = (
  pinnedIds: string[],
): UseWatchlistIntelResult => {
  // Fetch PRs for each pinned miner individually
  // useMinerPRs is a React Query hook — safe to call in a loop
  // because the hook list is stable (pinnedIds from localStorage)
  const miner0 = useMinerPRs(pinnedIds[0] ?? '', !!pinnedIds[0]);
  const miner1 = useMinerPRs(pinnedIds[1] ?? '', !!pinnedIds[1]);
  const miner2 = useMinerPRs(pinnedIds[2] ?? '', !!pinnedIds[2]);
  const miner3 = useMinerPRs(pinnedIds[3] ?? '', !!pinnedIds[3]);

  const queries = [miner0, miner1, miner2, miner3];
  const isLoading = pinnedIds.some((_, i) => queries[i]?.isLoading);

  const minerData = useMemo(() => {
    return pinnedIds
      .map((id, i) => {
        const prs = queries[i]?.data;
        if (!id || !prs) return null;
        return {
          githubId: id,
          author: prs[0]?.author ?? id,
          prs,
        };
      })
      .filter(Boolean) as {
      githubId: string;
      author: string;
      prs: CommitLog[];
    }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pinnedIds[0],
    pinnedIds[1],
    pinnedIds[2],
    pinnedIds[3],
    miner0.data,
    miner1.data,
    miner2.data,
    miner3.data,
  ]);

  const territoryMap = useMemo(
    () => buildTerritoryMap(minerData),
    [minerData],
  );

  const liveBets = useMemo(() => extractLiveBets(minerData), [minerData]);

  const fingerprints = useMemo(
    () =>
      minerData.map((m) => buildFingerprint(m.githubId, m.author, m.prs)),
    [minerData],
  );

  return { territoryMap, liveBets, fingerprints, isLoading };
};

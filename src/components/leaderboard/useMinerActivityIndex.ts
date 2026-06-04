import { useMemo } from 'react';
import {
  useAllPrs,
  useMinersIssues,
  useReposAndWeights,
  MINER_ISSUES_FULL_HISTORY_SINCE_ISO,
  type CommitLog,
  type MinerIssue,
} from '../../api';
import { parseNumber } from '../../utils/ExplorerUtils';

export interface MinerActivity {
  // Merged PRs/day, from the `/prs` scored feed. Each scored PR is an OSS-track
  // contribution, so `dailyOss` mirrors `dailyMerged`.
  dailyMerged: number[];
  dailyOss: number[];
  // Issue-discovery track: solved issues/day, keyed by the solving PR's merge
  // date. Sourced from the mirror issues feed (the `/prs` feed carries no
  // discovery signal). Only populated when `githubIds` is supplied.
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

// Maps a PR back to a miner. `/prs` rows carry `githubId` directly; the
// identity maps (hotkey→id, login→id) are only a fallback for any row missing
// it, built from the leaderboard rows.
export interface MinerIdentity {
  githubId: string;
  hotkey?: string | null;
  login?: string | null;
}

interface Options {
  lookbackDays?: number;
  topReposLimit?: number;
  // GitHub IDs to source the issue-discovery (solved-issues) series for. One
  // mirror fetch per id, so only pass the miners actually rendered. Omit to
  // skip discovery entirely (e.g. network-only consumers).
  githubIds?: string[];
  // Identity bridge for the OSS/merged series. `/prs` rows carry `githubId`
  // directly, so this is now only a fallback for rows missing it (attributed
  // by hotkey, then author login).
  identities?: MinerIdentity[];
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

// A miner's issue-discovery "solve": an issue THIS miner authored (discovered)
// that a merged PR resolved. The discovery track is credited when the solving
// PR merges, so we key off `solving_pr.merged_at`. Returns that time in ms, or
// null when the issue isn't a solved discovery by this miner.
//
// The gates below mirror the validator's `_classify_issue`
// (gittensor/validator/issue_discovery/scan.py) so the sparkline's daily counts
// sum to the leaderboard CONTRIBUTIONS column (`totalSolvedIssues`) rather than
// the looser author+merged-PR heuristic this used before, which over-counted.
// We match `total_solved_issues` (the broad count the column shows): we do NOT
// apply the token-score "valid" gate and do NOT apply the cross-miner
// one-issue-per-PR dedupe — do not "fix" that by adding them.
//
// Two `_classify_issue` gates can't be applied client-side and are the only
// expected residual drift: branch-eligibility on the solving PR (the feed
// carries `head_sha`/`base_sha` but not `base_ref`/`head_ref` names), and any
// repo-config nuance beyond scored-repo membership.
export const minerSolvedIssueAt = (
  issue: MinerIssue,
  githubId: string,
  // Lower-cased `repo_full_name`s in the active scored set. When provided,
  // issues outside it are excluded (the column only counts scored repos).
  scoredRepos?: Set<string>,
): number | null => {
  // author present AND authored by this miner
  if (!githubId || String(issue.author_github_id ?? '') !== githubId) {
    return null;
  }
  // scored-repo scope
  if (scoredRepos && !scoredRepos.has(issue.repo_full_name.toLowerCase())) {
    return null;
  }
  // not transferred
  if (issue.is_transferred) return null;
  // closed as completed (not NOT_PLANNED, not null)
  if (issue.state !== 'CLOSED') return null;
  if ((issue.state_reason ?? '').toUpperCase() !== 'COMPLETED') return null;
  // solved by a populated, existing solving PR
  if (!issue.solved_by_pr || !issue.solving_pr) return null;
  const sp = issue.solving_pr;
  // solving PR merged and not edited after merge
  if ((sp.state ?? '').toUpperCase() !== 'MERGED') return null;
  if (sp.edited_after_merge) return null;
  const mergedAt = sp.merged_at;
  if (!mergedAt) return null;
  const t = Date.parse(mergedAt);
  if (!Number.isFinite(t)) return null;
  // anti spec-rewrite: issue not edited after the solving PR merged
  if (issue.last_edited_at) {
    const edited = Date.parse(issue.last_edited_at);
    if (Number.isFinite(edited) && edited > t) return null;
  }
  return t;
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

export interface MinerSolvedIssues {
  githubId: string;
  issues: MinerIssue[];
}

// Resolve a PR to a numeric githubId. `/prs` rows usually carry `githubId`; for
// any row missing it, fall back to the hotkey→id map (exact match, casing-safe)
// and finally the author-login→id map. Returns undefined when unattributable.
const resolveCommitGithubId = (
  commit: CommitLog,
  byHotkey: Map<string, string>,
  byLogin: Map<string, string>,
): string | undefined => {
  const direct = commit.githubId?.trim();
  if (direct) return direct;
  const hotkey = commit.hotkey?.trim();
  if (hotkey) {
    const viaHotkey = byHotkey.get(hotkey);
    if (viaHotkey) return viaHotkey;
  }
  const login = commit.author?.trim().toLowerCase();
  if (login) {
    const viaLogin = byLogin.get(login);
    if (viaLogin) return viaLogin;
  }
  return undefined;
};

const buildIndex = (
  commits: CommitLog[],
  lookbackDays: number,
  topReposLimit: number,
  solvedIssues?: MinerSolvedIssues[],
  identities?: MinerIdentity[],
  scoredRepos?: Set<string>,
): BuildResult => {
  const byHotkey = new Map<string, string>();
  const byLogin = new Map<string, string>();
  for (const id of identities ?? []) {
    if (!id.githubId) continue;
    const hotkey = id.hotkey?.trim();
    if (hotkey) byHotkey.set(hotkey, id.githubId);
    const login = id.login?.trim().toLowerCase();
    if (login) byLogin.set(login, id.githubId);
  }

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
    const githubId = resolveCommitGithubId(commit, byHotkey, byLogin);
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
          // Every PR in the `/prs` scored feed is an OSS-track contribution; the
          // feed carries no issue-discovery signal. Discovery is overlaid below
          // from solved issues.
          entry.dailyMerged[slot] += 1;
          entry.dailyOss[slot] += 1;
          networkDaily[slot] += 1;
          networkOss[slot] += 1;
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

  // Overlay the issue-discovery track: one count per solved issue, bucketed by
  // the solving PR's merge day. A miner may have solved issues without any
  // recent PRs, so create entries on demand.
  for (const { githubId, issues } of solvedIssues ?? []) {
    if (!githubId || issues.length === 0) continue;
    let entry = index.get(githubId);
    for (const issue of issues) {
      const solvedAt = minerSolvedIssueAt(issue, githubId, scoredRepos);
      if (solvedAt === null || solvedAt < windowStart) continue;
      const slot = Math.round(
        (startOfUtcDay(solvedAt) - windowStart) / MS_PER_DAY,
      );
      if (slot < 0 || slot >= lookbackDays) continue;
      if (!entry) {
        entry = emptyMiner(lookbackDays);
        index.set(githubId, entry);
      }
      entry.dailyDiscovery[slot] += 1;
    }
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
  const {
    lookbackDays = 30,
    topReposLimit = 3,
    githubIds,
    identities,
  } = options;

  // OSS/merged track: the full `/prs` scored feed (every scored PR, with
  // `githubId`), NOT the global `/dash/commits` recent-N slice. With ~110
  // miners that slice only spanned ~1–2 weeks, so in-window PRs older than the
  // cut were missing and the sparkline under-counted vs the CONTRIBUTIONS
  // column. `/prs` is the same gated set the column's `totalMergedPrs` counts,
  // so per-miner merged-PR buckets now sum to it (within the display window).
  const { data, isLoading } = useAllPrs();

  // Active scored-repo set — discovery is only credited in scored repos, so we
  // scope the solve gate to it to match `totalSolvedIssues`. Lower-cased for
  // case-insensitive `repo_full_name` matching.
  const { data: repos } = useReposAndWeights();

  // One mirror call per miner; `since` must be set or the feed returns
  // OPEN-only rows (we need solved/closed issues). Gated so network-only
  // callers (no githubIds) fire nothing.
  const wantsIssues = (githubIds?.length ?? 0) > 0;
  const issueQueries = useMinersIssues(
    githubIds ?? [],
    wantsIssues,
    MINER_ISSUES_FULL_HISTORY_SINCE_ISO,
  );

  const built = useMemo<BuildResult>(() => {
    const solvedIssues: MinerSolvedIssues[] | undefined = wantsIssues
      ? githubIds!.map((githubId, i) => ({
          githubId,
          issues: issueQueries[i]?.data ?? [],
        }))
      : undefined;
    // Pass the scope only once loaded; an empty set would wrongly exclude every
    // solve while repos are still fetching, so fall back to unscoped until then.
    const scoredRepos =
      repos && repos.length
        ? new Set(repos.map((r) => r.fullName.toLowerCase()))
        : undefined;
    if (!data && !solvedIssues) {
      return { index: new Map(), network: EMPTY_NETWORK };
    }
    return buildIndex(
      data ?? [],
      lookbackDays,
      topReposLimit,
      solvedIssues,
      identities,
      scoredRepos,
    );
  }, [
    data,
    lookbackDays,
    topReposLimit,
    githubIds,
    identities,
    wantsIssues,
    issueQueries,
    repos,
  ]);

  const issuesLoading = wantsIssues && issueQueries.some((q) => q.isLoading);

  return {
    index: built.index,
    network: built.network,
    isLoading: isLoading || issuesLoading,
  };
};

/**
 * "What to do next" — the dashboard's single, prioritised action list.
 *
 * This consolidates what used to be three separate sections (earning levers,
 * insights, and the open-PR-risk prompt) into one severity-ranked set of
 * actionable steps. The derivations are lifted verbatim from those components
 * so the (policy-accurate) maths is unchanged; only the presentation is unified.
 *
 * Pure — no React, no MUI. Each step can carry an `anchor` naming the page
 * section a miner should jump to act on it.
 */
import type {
  CommitLog,
  MinerEvaluation,
  MinerRepositoryEvaluation,
  RepositoryConfig,
} from '../api/models/Dashboard';
import {
  buildDecayProjection,
  resolveDecayParams,
} from '../components/prs/prTimeDecayModel';
import {
  computeOpenPrAllowance,
  getEligibilityThresholds,
} from './minerProgress';

/** Section ids a step can scroll to. Kept in sync with the page anchors. */
export const SECTION_ANCHORS = {
  repositories: 'repositories',
  contributions: 'contributions',
} as const;

export type SectionAnchorId =
  (typeof SECTION_ANCHORS)[keyof typeof SECTION_ANCHORS];

export type NextStepTone = 'critical' | 'warning' | 'tip' | 'good';

export interface NextStep {
  id: string;
  /** Higher surfaces first. */
  severity: number;
  tone: NextStepTone;
  /** Short headline, names the repo where relevant. */
  title: string;
  /** Imperative, plain-language guidance. */
  action: string;
  /** Section the miner should jump to in order to act. */
  anchor?: SectionAnchorId;
}

const toNum = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Score-lever steps: time decay, credibility, review quality, label multiplier
 * and the open-PR spam gate. Lifted from the former `MinerScoreLevers`.
 */
export const buildLeverSteps = (
  minerStats: MinerEvaluation | undefined,
  prs: CommitLog[] | undefined,
  configByRepo: Map<string, RepositoryConfig>,
): NextStep[] => {
  if (!minerStats) return [];
  const mergedPrs = (prs ?? []).filter(
    (p) => p.prState === 'MERGED' && p.mergedAt,
  );
  const out: NextStep[] = [];

  // ── Time decay — score-weighted retention across merged PRs ──────────
  if (mergedPrs.length > 0) {
    let current = 0;
    let potential = 0;
    for (const pr of mergedPrs) {
      const params = resolveDecayParams(
        null,
        configByRepo.get((pr.repository || '').toLowerCase()),
      );
      const proj = buildDecayProjection(
        {
          mergedAt: pr.mergedAt,
          prState: pr.prState,
          timeDecayMultiplier: pr.timeDecayMultiplier,
          earnedScore: pr.score,
        },
        params,
      );
      const mult = proj.chartNowMultiplier;
      if (!proj.inWindow) continue;
      const score = toNum(pr.score);
      if (mult && mult > 0 && score > 0) {
        current += score;
        potential += score / mult;
      }
    }
    if (potential > 0) {
      const retain = current / potential;
      const dragPct = Math.round((1 - retain) * 100);
      const draggy = dragPct >= 8;
      out.push({
        id: 'decay',
        severity: 100 + dragPct,
        tone: draggy ? 'warning' : 'good',
        title: `Time decay · ${Math.round(retain * 100)}% retained`,
        action: draggy
          ? `Aging has shaved ~${dragPct}% off your in-window value — ship a fresh PR to refresh it.`
          : 'Your merged work is still fresh — keep the cadence up.',
        anchor: draggy ? SECTION_ANCHORS.contributions : undefined,
      });
    }
  }

  // ── Credibility (OSS merge-rate) vs the 80% gate ─────────────────────
  const cred = toNum(minerStats.credibility);
  if (cred > 0 || (minerStats.totalMergedPrs ?? 0) > 0) {
    const pct = Math.round(cred * 100);
    const ok = cred >= 0.8;
    out.push({
      id: 'credibility',
      severity: ok ? 20 : 90 + (80 - pct),
      tone: ok ? 'good' : 'warning',
      title: `Credibility · ${pct}%`,
      action: ok
        ? 'Above the 80% bar — merged work counts at full weight.'
        : 'Below the 80% eligibility bar — merge PRs and avoid closing them unmerged.',
      anchor: ok ? undefined : SECTION_ANCHORS.repositories,
    });
  }

  // ── Review quality — score-weighted average penalty ──────────────────
  let revW = 0;
  let revWeight = 0;
  for (const pr of mergedPrs) {
    const m = pr.reviewQualityMultiplier;
    if (m == null) continue;
    const w = toNum(pr.score) || 1;
    revW += toNum(m) * w;
    revWeight += w;
  }
  if (revWeight > 0) {
    const avg = revW / revWeight;
    const costPct = Math.round((1 - avg) * 100);
    const costly = costPct >= 5;
    out.push({
      id: 'review',
      severity: costly ? 60 + costPct : 15,
      tone: costly ? 'warning' : 'good',
      title: `Review quality · ${avg.toFixed(2)}×`,
      action: costly
        ? `Change-requests cost you ~${costPct}% — resolve maintainer feedback in fewer rounds.`
        : 'Clean reviews — little to no penalty.',
      anchor: costly ? SECTION_ANCHORS.contributions : undefined,
    });
  }

  // ── Label multiplier — boost or drag ─────────────────────────────────
  let labW = 0;
  let labWeight = 0;
  for (const pr of mergedPrs) {
    const m = pr.labelMultiplier;
    if (m == null) continue;
    const w = toNum(pr.score) || 1;
    labW += toNum(m) * w;
    labWeight += w;
  }
  if (labWeight > 0) {
    const avg = labW / labWeight;
    const draggy = avg < 0.98;
    out.push({
      id: 'label',
      severity: draggy ? 55 + Math.round((1 - avg) * 100) : 12,
      tone: avg > 1.02 ? 'good' : draggy ? 'warning' : 'tip',
      title: `Label multiplier · ${avg.toFixed(2)}×`,
      action:
        avg > 1.02
          ? 'Your PRs land high-value labels — keep targeting them.'
          : draggy
            ? 'Labels are dragging score — favour feature/bug work over low-weight labels.'
            : 'Neutral labelling.',
      anchor: draggy ? SECTION_ANCHORS.contributions : undefined,
    });
  }

  // ── Open-PR spam — binary repo kill when over allowance ──────────────
  const breaches: string[] = [];
  for (const r of minerStats.repositories ?? []) {
    const open = toNum(r.totalOpenPrs);
    if (open <= 0) continue;
    const allowance = computeOpenPrAllowance(
      toNum(r.totalTokenScore),
      getEligibilityThresholds(
        configByRepo.get(r.repositoryFullName.toLowerCase()),
      ),
    );
    if (open > allowance)
      breaches.push(`${r.repositoryFullName} (${open}/${allowance})`);
  }
  if (breaches.length > 0) {
    out.push({
      id: 'spam',
      severity: 200,
      tone: 'critical',
      title: 'Open-PR limit exceeded',
      action: `Earnings are zeroed in ${breaches.join(', ')} — merge or close PRs to recover.`,
      anchor: SECTION_ANCHORS.repositories,
    });
  }

  return out;
};

/** Per-repo eligibility / score / credibility accessors, mode-aware. */
const eligibleFor = (
  repo: MinerRepositoryEvaluation,
  isIssueMode: boolean,
): boolean => (isIssueMode ? repo.isIssueEligible : repo.isEligible);

const scoreFor = (
  repo: MinerRepositoryEvaluation,
  isIssueMode: boolean,
): number => (isIssueMode ? repo.issueDiscoveryScore : repo.totalScore);

const credibilityFor = (
  repo: MinerRepositoryEvaluation,
  isIssueMode: boolean,
): number => (isIssueMode ? repo.issueCredibility : repo.credibility);

/**
 * Per-repository eligibility steps. Lifted from the former `MinerInsightsCard`
 * `buildInsights`. Eligibility verdicts come from the server-computed
 * `isEligible` / `isIssueEligible` flags — no fixed threshold is printed.
 */
export const buildEligibilitySteps = (
  repositories: MinerRepositoryEvaluation[],
  isIssueMode: boolean,
  weightsByRepo: Map<string, number> = new Map(),
  opts: { idPrefix?: string; trackTag?: string } = {},
): NextStep[] => {
  const { idPrefix = '', trackTag } = opts;
  // Namespace ids and tag titles so the same builder can contribute both the
  // OSS and the Discovery tracks to one combined list without colliding.
  const finish = (steps: NextStep[]): NextStep[] =>
    idPrefix || trackTag
      ? steps.map((s) => ({
          ...s,
          id: `${idPrefix}${s.id}`,
          title: trackTag ? `${trackTag} · ${s.title}` : s.title,
        }))
      : steps;
  const out: NextStep[] = [];

  if (repositories.length === 0) {
    out.push({
      id: 'no-repos',
      severity: 40,
      tone: 'tip',
      title: 'No repository evaluations yet',
      action: isIssueMode
        ? 'Discover and solve issues in tracked repositories to start earning a per-repository standing.'
        : 'Open and merge pull requests in tracked repositories to start earning a per-repository standing.',
    });
    return finish(out);
  }

  const eligibleRepos = repositories.filter((r) => eligibleFor(r, isIssueMode));
  const ineligibleRepos = repositories.filter(
    (r) => !eligibleFor(r, isIssueMode),
  );

  // Ineligible repos with a server-supplied reason — name the repo + reason.
  ineligibleRepos
    .filter((r) => r.failedReason)
    .slice(0, 2)
    .forEach((repo, index) => {
      out.push({
        id: `ineligible-${repo.repositoryFullName}`,
        severity: 95 - index,
        tone: 'warning',
        title: `Ineligible in ${repo.repositoryFullName}`,
        action: `${repo.failedReason} Credibility here is ${(
          credibilityFor(repo, isIssueMode) * 100
        ).toFixed(1)}% — lift it to clear the gate.`,
        anchor: SECTION_ANCHORS.repositories,
      });
    });

  // Ineligible with no reason string — generic prompt, still repo-named.
  const unexplainedIneligible = ineligibleRepos.find((r) => !r.failedReason);
  if (unexplainedIneligible && out.length < 3) {
    out.push({
      id: `ineligible-generic-${unexplainedIneligible.repositoryFullName}`,
      severity: 80,
      tone: 'warning',
      title: `Not yet eligible in ${unexplainedIneligible.repositoryFullName}`,
      action: isIssueMode
        ? "Raise issue credibility and solved-issue volume to clear this repository's eligibility gate."
        : "Raise merge credibility and contribution volume to clear this repository's eligibility gate.",
      anchor: SECTION_ANCHORS.repositories,
    });
  }

  // Strongest eligible repo — an achievement that names where the miner leads.
  if (eligibleRepos.length > 0) {
    const topRepo = eligibleRepos.reduce((best, current) =>
      scoreFor(current, isIssueMode) > scoreFor(best, isIssueMode)
        ? current
        : best,
    );
    out.push({
      id: `top-repo-${topRepo.repositoryFullName}`,
      severity: 55,
      tone: 'good',
      title: `Strongest in ${topRepo.repositoryFullName}`,
      action: `${
        isIssueMode ? 'Issue-discovery' : 'OSS'
      } score here is ${scoreFor(topRepo, isIssueMode).toFixed(2)} at ${(
        credibilityFor(topRepo, isIssueMode) * 100
      ).toFixed(1)}% credibility — keep this consistency to maximise earnings.`,
      anchor: SECTION_ANCHORS.repositories,
    });
  }

  // Eligible-everywhere achievement, or a coverage tip.
  if (eligibleRepos.length === repositories.length) {
    out.push({
      id: 'eligible-all',
      severity: 45,
      tone: 'good',
      title: 'Eligible across every repository',
      action: `You clear the gate in all ${repositories.length} evaluated ${
        repositories.length === 1 ? 'repository' : 'repositories'
      }.`,
    });
  } else if (eligibleRepos.length > 0) {
    out.push({
      id: 'coverage-tip',
      severity: 35,
      tone: 'tip',
      title: 'Expand eligible coverage',
      action: `You are eligible in ${eligibleRepos.length} of ${
        repositories.length
      } repositories. Lifting credibility in the rest unlocks more of the network reward pool.`,
      anchor: SECTION_ANCHORS.repositories,
    });
  }

  // Highest-paying repo — point the miner at the biggest reward pool.
  const topPaying = repositories
    .map((r) => ({
      repo: r,
      pay: weightsByRepo.get(r.repositoryFullName.toLowerCase()) ?? 0,
    }))
    .filter((x) => x.pay > 0)
    .sort((a, b) => b.pay - a.pay)[0];
  if (topPaying) {
    const pct = (topPaying.pay * 100).toFixed(topPaying.pay >= 0.1 ? 1 : 2);
    const eligibleThere = eligibleFor(topPaying.repo, isIssueMode);
    out.push({
      id: `pay-${topPaying.repo.repositoryFullName}`,
      severity: 58,
      tone: eligibleThere ? 'good' : 'tip',
      title: eligibleThere
        ? `Keep shipping to ${topPaying.repo.repositoryFullName}`
        : `${topPaying.repo.repositoryFullName} pays the most`,
      action: eligibleThere
        ? `Your highest-paying repo distributes ${pct}% of the OSS reward pool and you're eligible — concentrate effort here to maximise emissions.`
        : `It distributes ${pct}% of the OSS reward pool — the biggest opportunity. Clear its eligibility gate to start earning from it.`,
      anchor: SECTION_ANCHORS.repositories,
    });
  }

  return finish(out);
};

/** Concat, dedupe by id (first wins), and sort by severity descending. */
export const mergeNextSteps = (...sources: NextStep[][]): NextStep[] => {
  const seen = new Set<string>();
  const merged: NextStep[] = [];
  for (const step of sources.flat()) {
    if (seen.has(step.id)) continue;
    seen.add(step.id);
    merged.push(step);
  }
  return merged.sort((a, b) => b.severity - a.severity);
};

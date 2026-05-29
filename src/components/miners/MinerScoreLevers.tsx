import React, { useMemo } from 'react';
import { alpha, Box, Card, Tooltip, Typography } from '@mui/material';
import {
  HourglassBottomOutlined as DecayIcon,
  LabelOutlined as LabelIcon,
  RateReviewOutlined as ReviewIcon,
  TrendingDownOutlined as DownIcon,
  TrendingFlatOutlined as FlatIcon,
  TrendingUpOutlined as UpIcon,
  VerifiedUserOutlined as CredibilityIcon,
  WarningAmberOutlined as SpamIcon,
} from '@mui/icons-material';
import {
  useMinerPRs,
  useMinerStats,
  useReposAndWeights,
  type RepositoryConfig,
} from '../../api';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import {
  buildDecayProjection,
  resolveDecayParams,
} from '../prs/prTimeDecayModel';
import {
  computeOpenPrAllowance,
  getEligibilityThresholds,
} from '../../utils/minerProgress';

interface MinerScoreLeversProps {
  githubId: string;
}

const toNum = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

type Tone = 'up' | 'down' | 'flat';

interface Lever {
  key: string;
  icon: React.ReactNode;
  label: string;
  /** Headline standing, e.g. "78% retained" or "5.32× cost". */
  value: string;
  tone: Tone;
  hint: string;
  tooltip: string;
  /** Higher = surfaced first (most actionable / biggest drag). */
  severity: number;
}

const TONE_COLOR: Record<Tone, string> = {
  up: STATUS_COLORS.success,
  down: STATUS_COLORS.warningOrange,
  flat: STATUS_COLORS.neutral,
};
const TONE_ICON: Record<Tone, React.ReactNode> = {
  up: <UpIcon sx={{ fontSize: '0.9rem' }} />,
  down: <DownIcon sx={{ fontSize: '0.9rem' }} />,
  flat: <FlatIcon sx={{ fontSize: '0.9rem' }} />,
};

/**
 * "Your earning levers" — the decision-support centrepiece. Explains why the
 * miner's earned score is what it is and what to do about it, lever by lever:
 * time decay (the dominant ongoing lever, computed client-side from merge
 * dates), credibility, review penalties, label multipliers and open-PR spam.
 *
 * Every figure comes from data we can trust: decay is reproduced locally via
 * `prTimeDecayModel`; credibility from the clean per-repo rows; review/label
 * aggregated from the PR list. Sorted biggest-drag-first.
 */
const MinerScoreLevers: React.FC<MinerScoreLeversProps> = ({ githubId }) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: prs } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();

  const configByRepo = useMemo(() => {
    const map = new Map<string, RepositoryConfig>();
    (repos ?? []).forEach((r) => map.set(r.fullName.toLowerCase(), r.config));
    return map;
  }, [repos]);

  const levers = useMemo<Lever[]>(() => {
    if (!minerStats) return [];
    const mergedPrs = (prs ?? []).filter(
      (p) => p.prState === 'MERGED' && p.mergedAt,
    );
    const out: Lever[] = [];

    // ── Time decay — score-weighted retention across merged PRs ──────────
    if (mergedPrs.length > 0) {
      let current = 0;
      let potential = 0;
      let soonestDays = Infinity;
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
        if (proj.daysSinceMerge != null)
          soonestDays = Math.min(soonestDays, proj.daysSinceMerge);
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
        const tone: Tone = dragPct >= 8 ? 'down' : 'flat';
        out.push({
          key: 'decay',
          icon: <DecayIcon sx={{ fontSize: '0.95rem' }} />,
          label: 'Time decay',
          value: `${Math.round(retain * 100)}% retained`,
          tone,
          hint:
            dragPct >= 8
              ? `Aging has shaved ~${dragPct}% off your in-window value — ship a PR to refresh it.`
              : 'Your merged work is still fresh — keep the cadence up.',
          tooltip:
            'Merged PRs lose value with age (≈50% by 10 days, 5% floor by ~30). Computed from each PR’s merge date and its repo’s decay curve.',
          severity: 100 + dragPct,
        });
      }
    }

    // ── Credibility (OSS merge-rate) vs the 80% gate ─────────────────────
    const cred = toNum(minerStats.credibility);
    if (cred > 0 || (minerStats.totalMergedPrs ?? 0) > 0) {
      const pct = Math.round(cred * 100);
      const ok = cred >= 0.8;
      out.push({
        key: 'credibility',
        icon: <CredibilityIcon sx={{ fontSize: '0.95rem' }} />,
        label: 'Credibility',
        value: `${pct}%`,
        tone: ok ? 'up' : 'down',
        hint: ok
          ? 'Above the 80% bar — merged work counts at full credibility.'
          : 'Below the 80% eligibility bar — merge PRs, avoid closing them unmerged.',
        tooltip:
          'Merge rate = merged ÷ (merged + closed). Repos require ≥80% to let you earn.',
        severity: ok ? 20 : 90 + (80 - pct),
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
      out.push({
        key: 'review',
        icon: <ReviewIcon sx={{ fontSize: '0.95rem' }} />,
        label: 'Review quality',
        value: `${avg.toFixed(2)}×`,
        tone: costPct >= 5 ? 'down' : 'flat',
        hint:
          costPct >= 5
            ? `Change-requests cost you ~${costPct}% — resolve maintainer feedback in fewer rounds.`
            : 'Clean reviews — little to no penalty.',
        tooltip:
          'Each maintainer “changes requested” review cuts a PR’s score by ~15% (zero at ~7).',
        severity: costPct >= 5 ? 60 + costPct : 15,
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
      const tone: Tone = avg > 1.02 ? 'up' : avg < 0.98 ? 'down' : 'flat';
      out.push({
        key: 'label',
        icon: <LabelIcon sx={{ fontSize: '0.95rem' }} />,
        label: 'Label multiplier',
        value: `${avg.toFixed(2)}×`,
        tone,
        hint:
          tone === 'up'
            ? 'Your PRs land high-value labels — keep targeting them.'
            : tone === 'down'
              ? 'Labels are dragging score — favour feature/bug work over low-weight labels.'
              : 'Neutral labelling.',
        tooltip:
          'Repos weight PR labels (e.g. feature 1.5×, refactor 0.25×). Maintainer-applied labels set the multiplier.',
        severity: tone === 'down' ? 55 + Math.round((1 - avg) * 100) : 12,
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
        key: 'spam',
        icon: <SpamIcon sx={{ fontSize: '0.95rem' }} />,
        label: 'Open-PR limit',
        value: 'Over limit',
        tone: 'down',
        hint: `Earnings are zeroed in ${breaches.join(', ')} — merge or close PRs to recover.`,
        tooltip:
          'Exceeding a repo’s open-PR allowance (2 + ⌊tokenScore/300⌋) zeroes that repo’s contribution score entirely.',
        severity: 200,
      });
    }

    return out.sort((a, b) => b.severity - a.severity);
  }, [minerStats, prs, configByRepo]);

  if (!minerStats || levers.length === 0) return null;

  return (
    <Card sx={{ p: { xs: 1.75, md: 2.5 } }} elevation={0}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="sectionTitle">Your earning levers</Typography>
        <Typography
          sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.3 }}
        >
          What’s lifting or dragging your earned score — and what to do about
          it.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: { xs: 1, md: 1.25 },
        }}
      >
        {levers.map((lever) => {
          const color = TONE_COLOR[lever.tone];
          return (
            <Box
              key={lever.key}
              sx={{
                display: 'flex',
                gap: 1.25,
                p: 1.25,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'border.light',
                borderLeft: `3px solid ${color}`,
                minWidth: 0,
              }}
            >
              <Box sx={{ color: 'text.secondary', mt: '1px', flexShrink: 0 }}>
                {lever.icon}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Tooltip
                    title={lever.tooltip}
                    arrow
                    placement="top"
                    slotProps={tooltipSlotProps}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'help',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lever.label}
                    </Typography>
                  </Tooltip>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color,
                      flexShrink: 0,
                    }}
                  >
                    {TONE_ICON[lever.tone]}
                    <Typography
                      sx={{ fontSize: '0.8rem', fontWeight: 700, color }}
                    >
                      {lever.value}
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.74rem',
                    color: (t) => alpha(t.palette.text.primary, 0.68),
                    mt: 0.35,
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                  }}
                >
                  {lever.hint}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
};

export default MinerScoreLevers;

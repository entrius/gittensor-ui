import React, { useMemo } from 'react';
import { alpha, Box, Card, Skeleton, Tooltip, Typography } from '@mui/material';
import {
  BoltOutlined as EarningsIcon,
  EmojiEventsOutlined as ScoreIcon,
  InsightsOutlined as ActivityIcon,
  LockOutlined as CollateralIcon,
} from '@mui/icons-material';
import { useAllMiners, useMinerStats } from '../../api';
import {
  LEADERBOARD_TRACK_COLORS,
  STATUS_COLORS,
  tooltipSlotProps,
} from '../../theme';
import {
  aggregateMinerTotals,
  computeNetworkRank,
} from '../../utils/minerProgress';
import {
  computeMinerBenchmark,
  type Percentile,
} from '../../utils/minerBenchmark';
import PercentileBadge from './PercentileBadge';

interface MinerStatBandProps {
  githubId: string;
}

const toNum = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const compact = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `${Math.round(n)}`;
};
const usd = (n: number): string =>
  n >= 1000 ? `$${compact(n)}` : `$${Math.round(n)}`;

const OSS = LEADERBOARD_TRACK_COLORS.oss;
const DISC = LEADERBOARD_TRACK_COLORS.discovery;

/** Tiny label after a colored figure in a split value (e.g. "merged"). */
const TRACK_LABEL_SX = {
  fontSize: '0.6rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  color: 'text.tertiary',
  ml: 0.4,
} as const;

/** Middot between the two track figures of a split value. */
const TRACK_SEP_SX = {
  color: 'text.tertiary',
  mx: 0.75,
  fontWeight: 400,
} as const;

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-block',
      width: 5,
      height: 5,
      borderRadius: '50%',
      backgroundColor: color,
      mr: 0.4,
      verticalAlign: 'middle',
    }}
  />
);

/** A two-track split value — OSS figure (green) and Disc figure (blue). */
const TrackPair: React.FC<{
  ossValue: React.ReactNode;
  ossLabel: string;
  discValue: React.ReactNode;
  discLabel: string;
}> = ({ ossValue, ossLabel, discValue, discLabel }) => (
  <>
    <Box component="span" sx={{ color: OSS, fontWeight: 700 }}>
      {ossValue}
    </Box>
    <Box component="span" sx={TRACK_LABEL_SX}>
      {ossLabel}
    </Box>
    <Box component="span" sx={TRACK_SEP_SX}>
      ·
    </Box>
    <Box component="span" sx={{ color: DISC, fontWeight: 700 }}>
      {discValue}
    </Box>
    <Box component="span" sx={TRACK_LABEL_SX}>
      {discLabel}
    </Box>
  </>
);

/** One muted detail line under a metric's value. */
const Detail: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    sx={{
      fontSize: '0.66rem',
      color: 'text.secondary',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      minWidth: 0,
    }}
  >
    {children}
  </Typography>
);

/* ── One metric inside a combined card ────────────────────────────── */

const Metric: React.FC<{
  icon: React.ReactNode;
  label: string;
  tone?: string;
  tooltip?: string;
  value: React.ReactNode;
  valueColor?: string;
  percentile?: Percentile | null;
  details?: React.ReactNode;
}> = ({
  icon,
  label,
  tone,
  tooltip,
  value,
  valueColor,
  percentile,
  details,
}) => {
  const content = (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        p: { xs: 1.5, md: 2 },
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        cursor: tooltip ? 'help' : 'default',
      }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}
      >
        <Box
          sx={{
            color: tone ?? ((t) => alpha(t.palette.text.primary, 0.4)),
            display: 'inline-flex',
            '& svg': { fontSize: '0.85rem' },
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.tertiary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 0.5,
          rowGap: 0.25,
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: '1.15rem', sm: '1.35rem' },
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: valueColor ?? 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {value}
        </Typography>
        {percentile && (
          <Box sx={{ flexShrink: 0 }}>
            <PercentileBadge percentile={percentile} inline />
          </Box>
        )}
      </Box>

      {details && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.2,
            minWidth: 0,
          }}
        >
          {details}
        </Box>
      )}
    </Box>
  );

  return tooltip ? (
    <Tooltip title={tooltip} arrow placement="top" slotProps={tooltipSlotProps}>
      {content}
    </Tooltip>
  ) : (
    content
  );
};

/** Two metrics sharing one card, divided by a hairline. */
const PairCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Card sx={{ p: 0, overflow: 'hidden' }} elevation={0}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        height: '100%',
        '& > *:first-of-type': {
          borderRight: '1px solid',
          borderColor: 'border.light',
        },
      }}
    >
      {children}
    </Box>
  </Card>
);

/**
 * Headline performance — two combined cards: Earnings + Score, and Activity +
 * Collateral. Each metric carries supporting detail lines (peer percentile,
 * rank, score split, code volume, repos at risk) so the band reads richly
 * without the old six-cell sprawl. Eligibility now lives in the profile hero.
 *
 * The single-miner endpoint serves its SUM'd float columns as broken strings;
 * `aggregateMinerTotals` sources score/earnings floats from the clean
 * leaderboard row and the contribution counts from the per-repo rows (so they
 * match the repositories table).
 */
const MinerStatBand: React.FC<MinerStatBandProps> = ({ githubId }) => {
  const { data: m, isLoading } = useMinerStats(githubId);
  const { data: allMiners } = useAllMiners();

  const rank = useMemo(
    () => computeNetworkRank(allMiners, githubId),
    [allMiners, githubId],
  );

  const benchmark = useMemo(
    () => computeMinerBenchmark(allMiners, githubId),
    [allMiners, githubId],
  );

  if (isLoading || !m) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        {[0, 1].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={104}
            sx={{ borderRadius: 3, bgcolor: 'surface.subtle' }}
          />
        ))}
      </Box>
    );
  }

  const listed = allMiners?.find((x) => x.githubId === githubId);
  const totals = aggregateMinerTotals(m, listed);
  const {
    ossScore,
    discScore,
    combinedScore,
    baseScore,
    collateral,
    additions,
    deletions,
  } = totals;
  const usdPerDay = toNum(m.usdPerDay);
  const lifetimeUsd = toNum(m.lifetimeUsd);
  const totalIssues =
    totals.solvedIssues + totals.closedIssues + totals.openIssues;
  const hasLines = additions + deletions > 0;
  const reposWithOpenPrs = (m.repositories ?? []).filter(
    (r) => toNum(r.totalOpenPrs) > 0,
  ).length;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 1.5,
      }}
    >
      {/* ── Earnings + Score ─────────────────────────────────── */}
      <PairCard>
        <Metric
          icon={<EarningsIcon />}
          label="$/Day"
          tone={usdPerDay > 0 ? STATUS_COLORS.success : undefined}
          tooltip="Network-wide earnings from the metagraph incentive distribution — not split per repo or track."
          value={`~${usd(usdPerDay)}`}
          valueColor={usdPerDay > 0 ? STATUS_COLORS.success : undefined}
          percentile={usdPerDay > 0 ? benchmark.earnings : null}
          details={
            usdPerDay > 0 || lifetimeUsd > 0 ? (
              <>
                <Detail>~{usd(usdPerDay * 30)}/mo</Detail>
                <Detail>~{usd(lifetimeUsd)} earned to date</Detail>
              </>
            ) : (
              <Detail>not earning yet</Detail>
            )
          }
        />
        <Metric
          icon={<ScoreIcon />}
          label="Score"
          tooltip={`Combined OSS + discovery score. Base ${baseScore.toFixed(
            2,
          )}.${rank ? ` Ranked #${rank.rank} of ${rank.total} by score.` : ''}`}
          value={combinedScore.toFixed(2)}
          percentile={combinedScore > 0 ? benchmark.combinedScore : null}
          details={
            <>
              {rank && (
                <Detail>
                  #{rank.rank} of {rank.total.toLocaleString()} miners
                </Detail>
              )}
              <Detail>
                <Dot color={OSS} />
                {ossScore.toFixed(1)} OSS · <Dot color={DISC} />
                {discScore.toFixed(1)} Disc
              </Detail>
            </>
          }
        />
      </PairCard>

      {/* ── Activity + Collateral ────────────────────────────── */}
      <PairCard>
        <Metric
          icon={<ActivityIcon />}
          label="Activity"
          tooltip={
            hasLines
              ? `Merged PRs and solved issues. +${additions.toLocaleString()} / −${deletions.toLocaleString()} lines changed.`
              : 'Merged PRs and solved issues.'
          }
          value={
            <TrackPair
              ossValue={totals.mergedPrs}
              ossLabel="merged"
              discValue={totals.solvedIssues}
              discLabel="solved"
            />
          }
          percentile={totals.mergedPrs > 0 ? benchmark.mergedPrs : null}
          details={
            <>
              <Detail>
                {totals.prs} PRs · {totalIssues} issues
              </Detail>
              {hasLines && (
                <Detail>
                  +{compact(additions)} / −{compact(deletions)} lines
                </Detail>
              )}
            </>
          }
        />
        <Metric
          icon={<CollateralIcon />}
          label="Collateral"
          tone={collateral > 0 ? STATUS_COLORS.warningOrange : undefined}
          tooltip="Score withheld as collateral while your PRs stay open — released as they merge, forfeited if they close unmerged."
          value={collateral.toFixed(2)}
          valueColor={collateral > 0 ? STATUS_COLORS.warningOrange : undefined}
          details={
            collateral > 0 ? (
              <>
                <Detail>
                  held by {totals.openPrs} open PR
                  {totals.openPrs === 1 ? '' : 's'}
                </Detail>
                {reposWithOpenPrs > 0 && (
                  <Detail>
                    across {reposWithOpenPrs} repo
                    {reposWithOpenPrs === 1 ? '' : 's'}
                  </Detail>
                )}
              </>
            ) : (
              <Detail>none withheld</Detail>
            )
          }
        />
      </PairCard>
    </Box>
  );
};

export default MinerStatBand;

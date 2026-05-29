import React, { useMemo } from 'react';
import { alpha, Box, Card, Skeleton, Tooltip, Typography } from '@mui/material';
import {
  BoltOutlined as EarningsIcon,
  EmojiEventsOutlined as ScoreIcon,
  FolderOpenOutlined as RepoIcon,
  InsightsOutlined as ActivityIcon,
  LeaderboardOutlined as RankIcon,
  VerifiedUserOutlined as CredibilityIcon,
} from '@mui/icons-material';
import { useAllMiners, useMinerStats } from '../../api';
import {
  LEADERBOARD_TRACK_COLORS,
  STATUS_COLORS,
  tooltipSlotProps,
} from '../../theme';
import { credibilityColor } from '../../utils/format';
import {
  aggregateMinerTotals,
  computeNetworkRank,
} from '../../utils/minerProgress';

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

/* ── One stat cell ────────────────────────────────────────────────── */

const Cell: React.FC<{
  icon: React.ReactNode;
  label: string;
  tone?: string;
  tooltip?: string;
  value: React.ReactNode;
  valueColor?: string;
  bar?: { value: number; color: string };
  sub: React.ReactNode;
}> = ({ icon, label, tone, tooltip, value, valueColor, bar, sub }) => {
  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
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
  );

  return (
    <Box
      sx={{
        px: 1.75,
        py: 1.5,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        borderRight: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'border.light',
      }}
    >
      {tooltip ? (
        <Tooltip
          title={tooltip}
          arrow
          placement="top"
          slotProps={tooltipSlotProps}
        >
          <Box
            sx={{
              display: 'inline-flex',
              cursor: 'help',
              alignSelf: 'flex-start',
            }}
          >
            {header}
          </Box>
        </Tooltip>
      ) : (
        header
      )}

      <Typography
        sx={{
          fontSize: '1.4rem',
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: valueColor ?? 'text.primary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>

      {bar && (
        <Box
          sx={{
            height: 3,
            borderRadius: 999,
            backgroundColor: 'border.light',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${Math.min(100, Math.max(0, bar.value * 100))}%`,
              height: '100%',
              backgroundColor: bar.color,
              borderRadius: 999,
            }}
          />
        </Box>
      )}

      <Typography
        sx={{
          fontSize: '0.66rem',
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {sub}
      </Typography>
    </Box>
  );
};

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

/**
 * Headline performance strip — the numbers a miner checks first, in one tight
 * divided band: earnings, score, credibility, activity, eligible repos and
 * subnet rank. Equal cells, hairline dividers, one sub-line each.
 *
 * The single-miner endpoint serves its SUM'd float columns as broken strings;
 * `aggregateMinerTotals` sources them from the clean leaderboard row (or sums
 * the per-repo rows). Earnings is the honest network-wide figure.
 */
const MinerStatBand: React.FC<MinerStatBandProps> = ({ githubId }) => {
  const { data: m, isLoading } = useMinerStats(githubId);
  const { data: allMiners } = useAllMiners();

  const rank = useMemo(
    () => computeNetworkRank(allMiners, githubId),
    [allMiners, githubId],
  );

  if (isLoading || !m) {
    return (
      <Skeleton
        variant="rounded"
        height={84}
        sx={{ borderRadius: 3, bgcolor: 'surface.subtle' }}
      />
    );
  }

  const listed = allMiners?.find((x) => x.githubId === githubId);
  const totals = aggregateMinerTotals(m, listed);
  const {
    ossScore,
    discScore,
    combinedScore,
    baseScore,
    additions,
    deletions,
  } = totals;
  const cred = totals.ossCred;
  const issueCred = totals.issueCred;
  const blendedCred = totals.blendedCred;
  const hasCred = cred + issueCred > 0 || combinedScore > 0;

  const usdPerDay = toNum(m.usdPerDay);
  const lifetimeUsd = toNum(m.lifetimeUsd);
  const totalIssues =
    totals.solvedIssues + totals.closedIssues + totals.openIssues;
  const repoCount = (m.repositories ?? []).filter(
    (r) => r.repositoryFullName.trim().length > 0,
  ).length;

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }} elevation={0}>
      {/* Negative margins clip the trailing right/bottom cell borders so only
          interior hairline dividers show — structure from borders, no fills. */}
      <Box sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'grid',
            mr: '-1px',
            mb: '-1px',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              lg: 'repeat(6, 1fr)',
            },
          }}
        >
          <Cell
            icon={<EarningsIcon />}
            label="Earn / day"
            tone={usdPerDay > 0 ? STATUS_COLORS.success : undefined}
            tooltip="Network-wide daily earnings from the metagraph incentive distribution — not split per repo or track."
            value={`~${usd(usdPerDay)}`}
            valueColor={usdPerDay > 0 ? STATUS_COLORS.success : undefined}
            sub={
              usdPerDay > 0
                ? `~${usd(usdPerDay * 30)}/mo · ${usd(lifetimeUsd)} lifetime`
                : 'not earning yet'
            }
          />
          <Cell
            icon={<ScoreIcon />}
            label="Score"
            tooltip={`Combined OSS + discovery score. Base ${baseScore.toFixed(2)}.`}
            value={combinedScore.toFixed(2)}
            sub={
              <>
                <Dot color={OSS} />
                {ossScore.toFixed(1)} · <Dot color={DISC} />
                {discScore.toFixed(1)}
              </>
            }
          />
          <Cell
            icon={<CredibilityIcon />}
            label="Credibility"
            tooltip="Score-weighted blend of OSS merge-rate and issue solve-rate credibility."
            value={hasCred ? `${Math.round(blendedCred * 100)}%` : '—'}
            valueColor={hasCred ? credibilityColor(blendedCred) : undefined}
            bar={
              hasCred
                ? { value: blendedCred, color: credibilityColor(blendedCred) }
                : undefined
            }
            sub={
              <>
                <Dot color={OSS} />
                {Math.round(cred * 100)}% · <Dot color={DISC} />
                {Math.round(issueCred * 100)}%
              </>
            }
          />
          <Cell
            icon={<ActivityIcon />}
            label="Activity"
            tooltip={
              additions + deletions > 0
                ? `Merged PRs / solved issues. +${additions.toLocaleString()} / −${deletions.toLocaleString()} lines.`
                : 'Merged PRs / solved issues.'
            }
            value={
              <>
                <Box component="span" sx={{ color: OSS }}>
                  {totals.mergedPrs}
                </Box>
                <Box
                  component="span"
                  sx={{ color: 'text.tertiary', mx: 0.5, fontWeight: 400 }}
                >
                  /
                </Box>
                <Box component="span" sx={{ color: DISC }}>
                  {totals.solvedIssues}
                </Box>
              </>
            }
            sub={`${totals.prs} PRs · ${totalIssues} issues`}
          />
          <Cell
            icon={<RepoIcon />}
            label="Eligible"
            tooltip="Repositories where earning is unlocked (eligibility gate cleared), of all evaluated."
            value={
              <>
                {m.eligibleRepoCount ?? 0}
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.85rem',
                    color: 'text.tertiary',
                    fontWeight: 500,
                  }}
                >
                  {' / '}
                  {repoCount}
                </Box>
              </>
            }
            sub={
              <>
                <Dot color={OSS} />
                {m.eligibleRepoCount ?? 0} OSS · <Dot color={DISC} />
                {m.issueEligibleRepoCount ?? 0} disc
              </>
            }
          />
          <Cell
            icon={<RankIcon />}
            label="Rank"
            tooltip="Standing among active miners by combined score."
            value={rank ? `#${rank.rank}` : '—'}
            sub={rank ? `of ${rank.total.toLocaleString()} miners` : '—'}
          />
        </Box>
      </Box>
    </Card>
  );
};

export default MinerStatBand;

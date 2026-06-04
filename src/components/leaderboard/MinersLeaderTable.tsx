import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Card,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Close as ClearIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  StarBorder as StarBorderIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import { GhIssueIcon, GhPrIcon } from './GhIcons';
import { RankIcon } from './RankIcon';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import TablePagination from '../common/TablePagination';
import { WatchlistButton } from '../common/WatchlistButton';
import theme, {
  LEADERBOARD_TRACK_COLORS,
  STATUS_COLORS,
  TOOLTIP_TONE_COLORS,
  tooltipSlotProps,
} from '../../theme';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { parseNumber } from '../../utils/ExplorerUtils';
import { formatRelativeTimeAgo as formatLastActive } from '../../utils/format';
import { paginateItems } from '../../utils';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import { useWatchlist } from '../../hooks/useWatchlist';
import type { MinerEvaluation } from '../../api';
import {
  openPrSlotsAllowed,
  resolveRepoThresholds,
  splitEarnings,
} from './scoring';
import {
  LEADERBOARD_VALID_ROWS,
  LEADERBOARD_VIEW_QUERY_PARAM,
  clampRowsForLeaderboardView,
  defaultRowsForLeaderboardView,
  getLeaderboardViewModeFromQuery,
  readStoredLeaderboardViewMode,
  rowsOptionsForLeaderboardView,
  writeStoredLeaderboardViewMode,
  type LeaderboardViewMode,
} from './leaderboardViewMode';
import Sparkline from './Sparkline';
import SparklineDetailModal from './SparklineDetailModal';
import {
  useMinerActivityIndex,
  type MinerActivity,
} from './useMinerActivityIndex';
import {
  deriveMinerStatus,
  StatusBadge,
  type MinerStatus,
} from './MinerStatus';
import { NetworkPulsePill } from './NetworkPulsePill';
import { useRankSnapshot } from './useRankSnapshot';
import {
  cohortOf,
  COHORT_DESCRIPTIONS,
  COHORT_LABELS,
  isAnyEligibleNow,
  isDiscoveryEligibleNow,
  isOssEligibleNow,
  isPenalized,
  type CohortKey,
} from './eligibilityCohort';

interface MinersLeaderTableProps {
  miners: MinerEvaluation[];
  isLoading: boolean;
  selectedRepo: string | null;
  onSelectRepo: (repo: string | null) => void;
  selectedCohort: CohortKey | null;
  onClearCohort: () => void;
}

const SORT_FIELDS = [
  'score',
  'usd',
  'credibility',
  'volume',
  'active',
  'movement',
  'reviewHits',
  'openPrRisk',
  'watch',
] as const;
type SortField = (typeof SORT_FIELDS)[number];

type EligibilityFilter = 'all' | 'eligible' | 'ineligible';

const EMPTY_ACTIVITY: MinerActivity = {
  dailyMerged: [],
  dailyOss: [],
  dailyDiscovery: [],
  topRepos: [],
  lastActiveAt: null,
  reviewHits: 0,
};

// Network defaults from ELIGIBILITY_FIELD_DEFS; leaderboard lacks per-repo data.
const NETWORK_OPEN_PR_THRESHOLDS = resolveRepoThresholds(undefined);

const combinedScore = (m: MinerEvaluation): number =>
  parseNumber(m.totalScore) + parseNumber(m.issueDiscoveryScore);

const round1 = (n: number): number => Math.round(n * 10) / 10;

// Sum of the per-track values as shown in the UI — so the displayed Score
// always equals the visible OSS + Discovery, avoiding "rounded parts don't add up".
const displayedCombinedScore = (m: MinerEvaluation): number =>
  round1(parseNumber(m.totalScore)) +
  round1(parseNumber(m.issueDiscoveryScore));

const totalVolume = (m: MinerEvaluation): number =>
  parseNumber(m.totalMergedPrs) + parseNumber(m.totalSolvedIssues);

interface OpenPrRisk {
  open: number;
  allowed: number;
  ratio: number;
}

const computeOpenPrRisk = (m: MinerEvaluation): OpenPrRisk => {
  const open = Math.max(0, Math.round(parseNumber(m.totalOpenPrs)));
  const tokenScore = Math.max(0, parseNumber(m.totalTokenScore));
  const allowed = openPrSlotsAllowed(NETWORK_OPEN_PR_THRESHOLDS, tokenScore);
  const ratio = allowed > 0 ? open / allowed : open > 0 ? Infinity : 0;
  return { open, allowed, ratio };
};

const fmtUsd = (n: number): string => {
  if (n <= 0) return '—';
  if (n < 1) return '<$1';
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
};

const SparklineButton: React.FC<{
  username: string;
  githubId?: string;
  primaryValues: readonly number[];
  secondaryValues: readonly number[];
  width: number;
  height: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  emphasis?: boolean;
}> = ({
  username,
  githubId,
  primaryValues,
  secondaryValues,
  width,
  height,
  primaryLabel = 'OSS',
  secondaryLabel = 'Discovery',
  emphasis = false,
}) => {
  const [open, setOpen] = useState(false);
  const totalPrimary = primaryValues.reduce((a, b) => a + b, 0);
  const totalSecondary = secondaryValues.reduce((a, b) => a + b, 0);
  const hasAny = totalPrimary > 0 || totalSecondary > 0;
  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label={`Open ${username}'s activity chart`}
        disabled={!hasAny}
        onClick={(e) => {
          e.stopPropagation();
          if (hasAny) setOpen(true);
        }}
        sx={(t) => ({
          background: 'transparent',
          border: 'none',
          padding: 0,
          borderRadius: 0.5,
          cursor: hasAny ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          transition: 'opacity 0.12s',
          '&:hover': hasAny ? { opacity: 0.75 } : undefined,
          '&:focus-visible': hasAny
            ? {
                outline: `2px solid ${t.palette.primary.main}`,
                outlineOffset: 2,
              }
            : undefined,
          '&:disabled': { cursor: 'default' },
        })}
      >
        <Sparkline
          values={primaryValues}
          secondaryValues={secondaryValues}
          width={width}
          height={height}
          primaryLabel={primaryLabel}
          secondaryLabel={secondaryLabel}
          emphasis={emphasis}
        />
      </Box>
      <SparklineDetailModal
        open={open}
        onClose={() => setOpen(false)}
        username={username}
        githubId={githubId}
        primaryValues={primaryValues}
        secondaryValues={secondaryValues}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
      />
    </>
  );
};

// Only re-renders when integer width changes by >1px so resize observers don't churn.
const ResponsiveSparklineButton: React.FC<{
  username: string;
  githubId?: string;
  primaryValues: readonly number[];
  secondaryValues: readonly number[];
  height: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  emphasis?: boolean;
}> = ({
  username,
  githubId,
  primaryValues,
  secondaryValues,
  height,
  primaryLabel,
  secondaryLabel,
  emphasis,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = Math.floor(entry.contentRect.width);
      setWidth((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        minWidth: 0,
        height,
        display: 'flex',
        alignItems: 'center',
        '& > button': { width: '100%' },
      }}
    >
      {width > 0 && (
        <SparklineButton
          username={username}
          githubId={githubId}
          primaryValues={primaryValues}
          secondaryValues={secondaryValues}
          width={width}
          height={height}
          primaryLabel={primaryLabel}
          secondaryLabel={secondaryLabel}
          emphasis={emphasis}
        />
      )}
    </Box>
  );
};

/* ─── Cell components ──────────────────────────────────────────────────── */

const TooltipSplitBar: React.FC<{
  segments: Array<{ label: string; value: number; color: string }>;
}> = ({ segments }) => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return null;
  return (
    <Box sx={{ mt: '6px' }}>
      <Box
        sx={{
          display: 'flex',
          height: 5,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: alpha(theme.palette.common.white, 0.08),
        }}
      >
        {segments.map((s) => {
          const pct = (s.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <Box
              key={s.label}
              sx={{ width: `${pct}%`, backgroundColor: s.color }}
            />
          );
        })}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: '3px',
          fontSize: '0.62rem',
          color: alpha(theme.palette.common.white, 0.5),
        }}
      >
        {segments.map((s) => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <Box
              key={s.label}
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: s.color,
                }}
              />
              {s.label} {pct}%
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const RowTooltipContent: React.FC<{
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: string;
  tone?: 'default' | 'positive' | 'caution' | 'negative';
}> = ({ title, body, action, tone = 'default' }) => {
  const titleColor =
    tone === 'positive'
      ? TOOLTIP_TONE_COLORS.positive
      : tone === 'caution'
        ? TOOLTIP_TONE_COLORS.caution
        : tone === 'negative'
          ? TOOLTIP_TONE_COLORS.negative
          : 'inherit';
  return (
    <Box sx={{ lineHeight: 1.45, maxWidth: 280 }}>
      <Box sx={{ fontWeight: 700, fontSize: '0.78rem', color: titleColor }}>
        {title}
      </Box>
      {body && (
        <Box sx={{ fontSize: '0.7rem', opacity: 0.82, mt: '2px' }}>{body}</Box>
      )}
      {action && (
        <Box
          sx={{
            fontSize: '0.68rem',
            fontWeight: 700,
            mt: '4px',
            color: TOOLTIP_TONE_COLORS.positive,
          }}
        >
          → {action}
        </Box>
      )}
    </Box>
  );
};

const MovementGlyph: React.FC<{
  globalRank: number;
  previousRank: number | undefined;
  isHydrated: boolean;
}> = ({ globalRank, previousRank, isHydrated }) => {
  if (!isHydrated) {
    return (
      <Typography
        aria-hidden
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.6rem',
          color: alpha(theme.palette.common.white, 0.18),
          lineHeight: 1,
        }}
      >
        ·
      </Typography>
    );
  }
  if (previousRank === undefined) {
    return (
      <Tooltip
        title={
          <RowTooltipContent
            title="New to the leaderboard"
            body="Movement arrows appear once you've been ranked for at least one full UTC day. Check back tomorrow."
          />
        }
        arrow
        placement="right"
        slotProps={tooltipSlotProps}
      >
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.6rem',
            color: alpha(theme.palette.common.white, 0.3),
            lineHeight: 1,
            cursor: 'help',
          }}
        >
          new
        </Typography>
      </Tooltip>
    );
  }
  const delta = previousRank - globalRank;
  if (delta === 0) {
    return (
      <Tooltip
        title={
          <RowTooltipContent
            title={`Holding at #${globalRank}`}
            body="No rank change since yesterday's UTC snapshot."
          />
        }
        arrow
        placement="right"
        slotProps={tooltipSlotProps}
      >
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            color: alpha(theme.palette.common.white, 0.3),
            lineHeight: 1,
            cursor: 'help',
          }}
        >
          ·
        </Typography>
      </Tooltip>
    );
  }
  const up = delta > 0;
  const abs = Math.abs(delta);
  return (
    <Tooltip
      title={
        <RowTooltipContent
          title={`${up ? '↑' : '↓'} ${abs} rank${abs === 1 ? '' : 's'} since yesterday`}
          body={
            <>
              <Box
                component="span"
                sx={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                #{previousRank} → #{globalRank}
              </Box>{' '}
              ({up ? 'climbed' : 'slipped'} by {abs}) since the last UTC
              snapshot.
            </>
          }
          tone={up ? 'positive' : 'negative'}
        />
      }
      arrow
      placement="right"
      slotProps={tooltipSlotProps}
    >
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.66rem',
          fontWeight: 700,
          color: up ? STATUS_COLORS.success : STATUS_COLORS.closed,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          cursor: 'help',
        }}
      >
        {up ? '↑' : '↓'}
        {abs}
      </Typography>
    </Tooltip>
  );
};

const RankCell: React.FC<{
  globalRank: number;
  previousRank: number | undefined;
  isHydrated: boolean;
}> = ({ globalRank, previousRank, isHydrated }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
      }}
    >
      <RankIcon rank={globalRank} />
      <MovementGlyph
        globalRank={globalRank}
        previousRank={previousRank}
        isHydrated={isHydrated}
      />
    </Box>
  );
};

const IdentityCell: React.FC<{
  miner: MinerEvaluation;
  status: MinerStatus;
}> = ({ miner, status }) => {
  const username = miner.githubUsername ?? `uid-${miner.uid}`;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Avatar
        src={getRepositoryOwnerAvatarSrc(username)}
        alt={username}
        sx={(t) => ({
          width: 26,
          height: 26,
          border: `1px solid ${t.palette.border.medium}`,
          flexShrink: 0,
        })}
      />
      <Box
        sx={{
          minWidth: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.4,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.85rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
        >
          {username}
        </Typography>
        {status.kind !== 'none' && (
          <Box sx={{ display: 'flex' }}>
            <StatusBadge status={status} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

const trackTooltip = (args: {
  trackLabel: string;
  trackBadge: string;
  count: number;
  countSuffix: string;
  score: number;
  eligible: boolean;
  eligibleRepos: number;
}) => {
  const eligibilityLine = args.eligible
    ? `Eligible in ${args.eligibleRepos} repo${args.eligibleRepos === 1 ? '' : 's'} — earning on this track.`
    : args.score > 0
      ? 'Scoring on this track but below the eligibility threshold in every repo — no payout yet.'
      : 'No activity on this track yet.';
  return (
    <RowTooltipContent
      title={`${args.trackLabel} track`}
      body={
        <>
          <Box
            component="span"
            sx={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {args.count.toLocaleString()}
          </Box>{' '}
          {args.countSuffix} · score{' '}
          <Box
            component="span"
            sx={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {args.score.toFixed(2)}
          </Box>
          <Box sx={{ mt: '4px' }}>{eligibilityLine}</Box>
        </>
      }
      tone={args.eligible ? 'positive' : args.score > 0 ? 'caution' : 'default'}
    />
  );
};

const EligibilityPill: React.FC<{
  trackColor: string;
  eligible: boolean;
  trackBadge: string;
  eligibleRepos: number;
}> = ({ trackColor, eligible, trackBadge, eligibleRepos }) => {
  if (!eligible) return null;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        px: '8px',
        py: '4px',
        borderRadius: 0.75,
        backgroundColor: alpha(trackColor, 0.16),
        border: `1px solid ${alpha(trackColor, 0.55)}`,
        lineHeight: 1,
        width: 'fit-content',
      }}
    >
      <Box
        component="span"
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          fontFamily: '"JetBrains Mono", monospace',
          color: trackColor,
          lineHeight: 1,
        }}
      >
        {trackBadge}
      </Box>
      <Box
        component="span"
        aria-hidden
        sx={{
          width: '1px',
          height: '9px',
          backgroundColor: alpha(trackColor, 0.45),
          flexShrink: 0,
        }}
      />
      <Box
        component="span"
        aria-label={`Eligible in ${eligibleRepos} repo${eligibleRepos === 1 ? '' : 's'}`}
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          fontFamily: '"JetBrains Mono", monospace',
          color: trackColor,
          lineHeight: 1,
          opacity: 0.85,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {eligibleRepos}
      </Box>
    </Box>
  );
};

const ContributionStatsRow: React.FC<{
  track: TrackInfo;
}> = ({ track }) => {
  const { Icon, count, score } = track;
  const iconColor =
    count > 0
      ? LEADERBOARD_TRACK_COLORS.dual
      : alpha(LEADERBOARD_TRACK_COLORS.dual, 0.35);
  return (
    <>
      <Tooltip
        title={trackTooltip(track)}
        arrow
        placement="top"
        slotProps={tooltipSlotProps}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'help',
          }}
        >
          <Icon size={13} color={iconColor} />
        </Box>
      </Tooltip>
      <Typography
        sx={{
          fontSize: '0.82rem',
          fontWeight: 600,
          fontFamily: '"JetBrains Mono", monospace',
          color: alpha(theme.palette.common.white, count > 0 ? 0.38 : 0.18),
          lineHeight: 1.2,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {count > 0 ? count.toLocaleString() : '—'}
      </Typography>
      <Box
        component="span"
        aria-hidden
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.7rem',
          color: alpha(theme.palette.common.white, 0.38),
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: '-0.01em',
          justifySelf: 'center',
          // visibility:hidden preserves grid column width across OSS/DISC rows.
          visibility: score > 0 ? 'visible' : 'hidden',
        }}
      >
        →
      </Box>
      <Typography
        sx={{
          fontSize: '0.82rem',
          fontWeight: 700,
          fontFamily: '"JetBrains Mono", monospace',
          color: alpha(theme.palette.common.white, score > 0 ? 0.38 : 0.18),
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {score > 0 ? score.toFixed(1) : '—'}
      </Typography>
    </>
  );
};

const trackStatsGridSx = {
  display: 'grid',
  gridTemplateColumns: 'auto auto 1fr auto',
  alignItems: 'center',
  columnGap: '6px',
  rowGap: '6px',
  minWidth: 0,
} as const;

interface TrackInfo {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  trackColor: string;
  count: number;
  score: number;
  eligible: boolean;
  eligibleRepos: number;
  countSuffix: string;
  trackLabel: string;
  trackBadge: string;
}

const tracksFor = (miner: MinerEvaluation): [TrackInfo, TrackInfo] => [
  {
    Icon: GhPrIcon,
    trackColor: STATUS_COLORS.merged,
    count: parseNumber(miner.totalMergedPrs),
    score: parseNumber(miner.totalScore),
    eligible: isOssEligibleNow(miner),
    eligibleRepos: miner.eligibleRepoCount ?? 0,
    countSuffix: 'merged',
    trackLabel: 'OSS',
    trackBadge: 'OSS',
  },
  {
    Icon: GhIssueIcon,
    trackColor: STATUS_COLORS.info,
    count: parseNumber(miner.totalSolvedIssues),
    score: parseNumber(miner.issueDiscoveryScore),
    eligible: isDiscoveryEligibleNow(miner),
    eligibleRepos: miner.issueEligibleRepoCount ?? 0,
    countSuffix: 'solved',
    trackLabel: 'Discovery',
    trackBadge: 'DISC',
  },
];

const EligibilityCell: React.FC<{ miner: MinerEvaluation }> = ({ miner }) => {
  const eligibleTracks = tracksFor(miner).filter((t) => t.eligible);
  if (eligibleTracks.length === 0) {
    return (
      <Tooltip
        title={
          <RowTooltipContent
            title="No eligible tracks"
            body="This miner hasn't crossed the eligibility threshold on either OSS or Discovery, so no payout is flowing."
            tone="caution"
          />
        }
        arrow
        placement="top"
        slotProps={tooltipSlotProps}
      >
        <Box
          component="span"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.75rem',
            color: alpha(theme.palette.common.white, 0.28),
            cursor: 'help',
          }}
        >
          —
        </Box>
      </Tooltip>
    );
  }
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: '6px',
        minWidth: 0,
        alignItems: 'center',
      }}
    >
      {eligibleTracks.map((t) => (
        <Tooltip
          key={t.trackLabel}
          title={trackTooltip(t)}
          arrow
          placement="top"
          slotProps={tooltipSlotProps}
        >
          <Box sx={{ display: 'inline-flex' }}>
            <EligibilityPill
              trackColor={t.trackColor}
              eligible={t.eligible}
              trackBadge={t.trackBadge}
              eligibleRepos={t.eligibleRepos}
            />
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
};

const ContributionStatsCell: React.FC<{ miner: MinerEvaluation }> = ({
  miner,
}) => {
  const tracks = tracksFor(miner);
  return (
    <Box sx={trackStatsGridSx}>
      {tracks.map((t) => (
        <ContributionStatsRow key={t.trackLabel} track={t} />
      ))}
    </Box>
  );
};

const RepoChip: React.FC<{
  name: string;
  count: number;
  active: boolean;
  onClick: (repo: string) => void;
}> = ({ name, count, active, onClick }) => {
  const slash = name.lastIndexOf('/');
  const short = slash >= 0 ? name.slice(slash + 1) : name;
  return (
    <Tooltip
      title={
        <RowTooltipContent
          title={name}
          body={
            <>
              <Box
                component="span"
                sx={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {count.toLocaleString()}
              </Box>{' '}
              merged PR{count === 1 ? '' : 's'} from this miner in the last 30d.
            </>
          }
          action={
            active
              ? 'Click to clear the repo filter'
              : 'Click to filter the table to this repo'
          }
        />
      }
      arrow
      placement="top"
      slotProps={tooltipSlotProps}
    >
      <Box
        component="button"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(name);
        }}
        sx={(t) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
          px: 0,
          py: 0,
          border: 'none',
          borderRadius: '2px',
          backgroundColor: 'transparent',
          color: active
            ? t.palette.primary.main
            : alpha(t.palette.text.primary, 0.7),
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.72rem',
          fontWeight: active ? 700 : 500,
          lineHeight: 1.3,
          cursor: 'pointer',
          minWidth: 0,
          textAlign: 'left',
          transition: 'color 0.12s',
          '&:hover': {
            color: active ? t.palette.primary.main : t.palette.text.primary,
            '& .repo-chip-name': {
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            },
          },
          '&:focus-visible': {
            outline: `2px solid ${t.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
      >
        <Box
          component="span"
          className="repo-chip-name"
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'left',
          }}
        >
          {short}
        </Box>
        <Box
          component="span"
          sx={{
            fontSize: '0.65rem',
            color: alpha(theme.palette.common.white, 0.4),
            fontWeight: 500,
            flexShrink: 0,
            textAlign: 'right',
          }}
        >
          {count}
        </Box>
      </Box>
    </Tooltip>
  );
};

const TopReposCell: React.FC<{
  repos: { name: string; count: number }[];
  selectedRepo: string | null;
  onSelectRepo: (repo: string) => void;
}> = ({ repos, selectedRepo, onSelectRepo }) => {
  if (repos.length === 0) {
    return (
      <Typography
        sx={{
          fontSize: '0.7rem',
          color: alpha(theme.palette.common.white, 0.3),
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        —
      </Typography>
    );
  }
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: 0,
      }}
    >
      {repos.map((r) => (
        <RepoChip
          key={r.name}
          name={r.name}
          count={r.count}
          active={selectedRepo === r.name}
          onClick={onSelectRepo}
        />
      ))}
    </Box>
  );
};

/* ─── Mobile card view ────────────────────────────────────────────────── */

const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  valueSize?: string;
  valueWeight?: number;
  suffix?: React.ReactNode;
  secondaryValue?: React.ReactNode;
  icon?: React.ReactNode;
  tooltip?: React.ReactNode;
}> = ({
  label,
  value,
  valueColor,
  valueSize,
  valueWeight,
  suffix,
  secondaryValue,
  icon,
  tooltip,
}) => {
  const inner = (
    <Box
      sx={(t) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        px: 1.25,
        py: 1,
        backgroundColor: alpha(t.palette.text.primary, 0.025),
        border: `1px solid ${t.palette.border.subtle}`,
        borderRadius: 1.25,
        minWidth: 0,
        cursor: tooltip ? 'help' : 'default',
        transition: 'background-color 0.12s, border-color 0.12s',
        '&:hover': tooltip
          ? {
              backgroundColor: alpha(t.palette.text.primary, 0.045),
              borderColor: t.palette.border.light,
            }
          : undefined,
      })}
    >
      <Typography
        sx={{
          fontSize: '0.55rem',
          color: alpha(theme.palette.common.white, 0.5),
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          fontWeight: 700,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '5px',
          minWidth: 0,
        }}
      >
        {icon && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
              alignSelf: 'center',
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: valueSize ?? '1.05rem',
            fontWeight: valueWeight ?? 700,
            color: valueColor ?? 'text.primary',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {value}
        </Typography>
        {suffix && (
          <Box
            component="span"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.68rem',
              color: alpha(theme.palette.common.white, 0.4),
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {suffix}
          </Box>
        )}
        {secondaryValue !== undefined && secondaryValue !== null && (
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '4px',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.78rem',
              color: alpha(theme.palette.common.white, 0.55),
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
              ml: '2px',
            }}
          >
            <Box
              component="span"
              aria-hidden
              sx={{
                fontSize: '0.7rem',
                color: alpha(theme.palette.common.white, 0.3),
                fontWeight: 500,
              }}
            >
              →
            </Box>
            {secondaryValue}
          </Box>
        )}
      </Box>
    </Box>
  );
  if (!tooltip) return inner;
  return (
    <Tooltip title={tooltip} arrow placement="top" slotProps={tooltipSlotProps}>
      {inner}
    </Tooltip>
  );
};

const MobileMinerCard: React.FC<{
  row: RankedMiner;
  isHydrated: boolean;
  selectedRepo: string | null;
  onSelectRepo: (repo: string) => void;
}> = ({ row, isHydrated, selectedRepo, onSelectRepo }) => {
  const navigate = useNavigate();
  const username = row.miner.githubUsername ?? `uid-${row.miner.uid}`;
  const usd = parseNumber(row.miner.usdPerDay);
  const { open, allowed, ratio } = row.openPrRisk;
  const failed = (row.miner.failedReason ?? '').toLowerCase();
  const flaggedByValidator = failed.includes('open pr');
  const openPrColor =
    flaggedByValidator || ratio >= 1 || open > allowed
      ? STATUS_COLORS.closed
      : ratio >= 0.5
        ? STATUS_COLORS.warningOrange
        : open === 0
          ? alpha(theme.palette.common.white, 0.55)
          : STATUS_COLORS.success;
  const hits = row.activity.reviewHits;
  const mergedTotal = parseNumber(row.miner.totalMergedPrs);
  const ossScore = parseNumber(row.miner.totalScore);
  const solvedTotal = parseNumber(row.miner.totalSolvedIssues);
  const discoveryScore = parseNumber(row.miner.issueDiscoveryScore);
  const reviewsValue =
    hits === 0 ? (mergedTotal > 0 ? '·' : '—') : String(hits);
  const reviewsColor =
    hits === 0
      ? alpha(theme.palette.common.white, mergedTotal > 0 ? 0.32 : 0.25)
      : hits >= 5
        ? STATUS_COLORS.closed
        : STATUS_COLORS.warningOrange;
  const lastActiveLabel = formatLastActive(row.activity.lastActiveAt);
  const lastActiveColor = row.activity.lastActiveAt
    ? alpha(theme.palette.common.white, 0.75)
    : alpha(theme.palette.common.white, 0.3);
  const topRepos = row.activity.topRepos.slice(0, 2);
  const isEligibleAny = isAnyEligibleNow(row.miner);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/miners/details?githubId=${row.miner.githubId}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/miners/details?githubId=${row.miner.githubId}`);
        }
      }}
      sx={(t) => ({
        cursor: 'pointer',
        position: 'relative',
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pl: { xs: 1.75, sm: 2 },
        pr: { xs: 1.5, sm: 1.75 },
        py: 1.5,
        backgroundColor: t.palette.surface.transparent,
        border: `1px solid ${t.palette.border.light}`,
        borderRadius: 2,
        filter: isEligibleAny ? 'none' : 'brightness(0.88) saturate(0.92)',
        transition:
          'background-color 0.15s, border-color 0.15s, transform 0.15s, filter 0.15s',
        '&:hover': {
          backgroundColor: t.palette.surface.light,
          borderColor: t.palette.border.medium,
          filter: isEligibleAny ? 'none' : 'brightness(0.98) saturate(0.98)',
        },
        '&:focus-visible': {
          outline: `2px solid ${t.palette.primary.main}`,
          outlineOffset: -2,
        },
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <RankCell
          globalRank={row.rank}
          previousRank={row.previousRank}
          isHydrated={isHydrated}
        />
        <Avatar
          src={getRepositoryOwnerAvatarSrc(username)}
          alt={username}
          sx={(t) => ({
            width: 32,
            height: 32,
            border: `1px solid ${t.palette.border.medium}`,
            flexShrink: 0,
          })}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.95rem',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              letterSpacing: '-0.005em',
              minWidth: 0,
            }}
          >
            {username}
          </Typography>
          {(row.status.kind !== 'none' || isAnyEligibleNow(row.miner)) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                flexWrap: 'wrap',
                rowGap: 0.5,
                minWidth: 0,
              }}
            >
              {row.status.kind !== 'none' && (
                <Box sx={{ display: 'inline-flex', flexShrink: 0 }}>
                  <StatusBadge status={row.status} />
                </Box>
              )}
              {isAnyEligibleNow(row.miner) && (
                <Box sx={{ display: 'inline-flex', flexShrink: 0 }}>
                  <EligibilityCell miner={row.miner} />
                </Box>
              )}
            </Box>
          )}
        </Box>
        <Box
          sx={{ flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <WatchlistButton
            category="miners"
            itemKey={row.miner.githubId}
            size="small"
          />
        </Box>
      </Box>

      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          mt: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.6,
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.55rem',
              color: alpha(theme.palette.common.white, 0.5),
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            30-day activity
          </Typography>
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
              color: lastActiveColor,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {lastActiveLabel}
          </Typography>
        </Box>
        <Box
          sx={(t) => ({
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
            py: 0.75,
            px: 1,
            borderRadius: 1.25,
            backgroundColor: alpha(t.palette.text.primary, 0.025),
            border: `1px solid ${t.palette.border.subtle}`,
            minWidth: 0,
            overflow: 'hidden',
            height: 56,
          })}
        >
          <ResponsiveSparklineButton
            username={username}
            githubId={row.miner.githubId}
            primaryValues={row.activity.dailyOss}
            secondaryValues={row.activity.dailyDiscovery}
            height={42}
            primaryLabel="OSS"
            secondaryLabel="Discovery"
            emphasis
          />
        </Box>
      </Box>

      <Box
        sx={{
          mt: 1.5,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' },
          gap: 1,
          minWidth: 0,
        }}
      >
        <StatTile
          label="Score"
          value={
            row.combined > 0
              ? displayedCombinedScore(row.miner).toFixed(1)
              : '—'
          }
          valueColor={
            row.combined > 0
              ? 'text.primary'
              : alpha(theme.palette.common.white, 0.3)
          }
          tooltip={
            <RowTooltipContent
              title={`Combined score · ${row.combined.toFixed(2)}`}
              body={
                <>
                  OSS{' '}
                  <Box
                    component="span"
                    sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {parseNumber(row.miner.totalScore).toFixed(2)}
                  </Box>{' '}
                  · Discovery{' '}
                  <Box
                    component="span"
                    sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {parseNumber(row.miner.issueDiscoveryScore).toFixed(2)}
                  </Box>
                  <Box sx={{ mt: '4px' }}>
                    Ranked across the whole network by this combined value.
                  </Box>
                </>
              }
            />
          }
        />
        <StatTile
          label="$/Day"
          value={
            usd > 0 ? (
              fmtUsd(usd)
            ) : (
              <Box
                component="span"
                sx={{
                  fontSize: '0.72rem',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  letterSpacing: 0,
                }}
              >
                no payout
              </Box>
            )
          }
          valueColor={
            usd > 0
              ? STATUS_COLORS.success
              : alpha(theme.palette.common.white, 0.32)
          }
          tooltip={
            usd > 0 ? undefined : (
              <RowTooltipContent
                title="Not earning yet"
                body="Below the eligibility threshold on both tracks — emissions only flow once a miner qualifies in at least one repo."
              />
            )
          }
        />
        <StatTile
          label="Open PRs"
          value={open}
          suffix={`/${allowed}`}
          valueColor={openPrColor}
          tooltip={
            <RowTooltipContent
              title={
                flaggedByValidator
                  ? 'Validator-flagged: over the open-PR cap'
                  : `${open} open PR${open === 1 ? '' : 's'} across the network`
              }
              body={
                <>
                  Network default allowance for this token score is{' '}
                  <Box
                    component="span"
                    sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {allowed}
                  </Box>{' '}
                  open PR{allowed === 1 ? '' : 's'}. Per-repo limits may differ
                  — the details page has the exact cap per repo.
                </>
              }
              tone={
                flaggedByValidator || ratio >= 1
                  ? 'negative'
                  : ratio >= 0.5
                    ? 'caution'
                    : 'default'
              }
            />
          }
        />
        <StatTile
          label="Merged PRs"
          value={mergedTotal > 0 ? mergedTotal.toLocaleString() : '—'}
          valueSize="0.82rem"
          valueWeight={600}
          valueColor={alpha(
            theme.palette.common.white,
            mergedTotal > 0 ? 0.38 : 0.18,
          )}
          icon={
            <GhPrIcon
              size={13}
              color={
                mergedTotal > 0
                  ? LEADERBOARD_TRACK_COLORS.dual
                  : alpha(LEADERBOARD_TRACK_COLORS.dual, 0.35)
              }
            />
          }
          secondaryValue={ossScore > 0 ? ossScore.toFixed(1) : undefined}
        />
        <StatTile
          label="Issues Solved"
          value={solvedTotal > 0 ? solvedTotal.toLocaleString() : '—'}
          valueSize="0.82rem"
          valueWeight={600}
          valueColor={alpha(
            theme.palette.common.white,
            solvedTotal > 0 ? 0.38 : 0.18,
          )}
          icon={
            <GhIssueIcon
              size={13}
              color={
                solvedTotal > 0
                  ? LEADERBOARD_TRACK_COLORS.dual
                  : alpha(LEADERBOARD_TRACK_COLORS.dual, 0.35)
              }
            />
          }
          secondaryValue={
            discoveryScore > 0 ? discoveryScore.toFixed(1) : undefined
          }
        />
        <StatTile
          label="Reviews"
          value={reviewsValue}
          valueColor={reviewsColor}
          tooltip={
            <RowTooltipContent
              title={
                hits === 0
                  ? mergedTotal > 0
                    ? 'No maintainer review hits'
                    : 'No review activity yet'
                  : `${hits} maintainer review hit${hits === 1 ? '' : 's'}`
              }
              body={
                hits === 0
                  ? mergedTotal > 0
                    ? 'Clean record — no maintainer pushback on merged PRs in the last 30 days.'
                    : 'Reviews are counted on merged PRs; this miner has none in the lookback window yet.'
                  : "Times a maintainer requested changes on this miner's PRs in the last 30 days. High counts can signal quality issues."
              }
              tone={hits >= 5 ? 'negative' : hits > 0 ? 'caution' : 'default'}
            />
          }
        />
      </Box>

      <Box
        onClick={(e) => e.stopPropagation()}
        sx={(t) => ({
          mt: 1,
          px: 1.25,
          py: 0.85,
          borderRadius: 1.25,
          backgroundColor: alpha(t.palette.text.primary, 0.02),
          border: `1px solid ${t.palette.border.subtle}`,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 1.5,
          alignItems: 'center',
          '& > * + *': {
            borderLeft: `1px solid ${t.palette.border.light}`,
            pl: 1.5,
          },
        })}
      >
        {[0, 1].map((slot) => {
          const repo = topRepos[slot];
          return (
            <Box
              key={repo?.name ?? `empty-${slot}`}
              sx={{
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {repo ? (
                <RepoChip
                  name={repo.name}
                  count={repo.count}
                  active={selectedRepo === repo.name}
                  onClick={onSelectRepo}
                />
              ) : (
                <Typography
                  aria-hidden
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.72rem',
                    color: alpha(theme.palette.common.white, 0.22),
                    lineHeight: 1.3,
                  }}
                >
                  —
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/* ─── Toolbar ─────────────────────────────────────────────────────────── */

interface ToolbarProps {
  total: number;
  filteredCount: number;
  search: string;
  onSearch: (s: string) => void;
  filter: EligibilityFilter;
  onFilter: (f: EligibilityFilter) => void;
  counts: Record<EligibilityFilter, number>;
  trackedOnly: boolean;
  onTrackedOnly: (next: boolean) => void;
  watchedCount: number;
  selectedRepo: string | null;
  onClearRepo: () => void;
  selectedCohort: CohortKey | null;
  onClearCohort: () => void;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onSortFieldChange: (field: SortField) => void;
  onSortDirToggle: () => void;
  viewMode: LeaderboardViewMode;
  onViewModeChange: (mode: LeaderboardViewMode) => void;
  rowsPerPage: number;
  rowsPerPageOptions: readonly number[];
  onRowsPerPageChange: (rows: number) => void;
}

const SORT_FIELD_LABELS: Record<SortField, string> = {
  score: 'Score',
  usd: '$/Day',
  credibility: 'Credibility',
  volume: 'Volume (PRs + issues)',
  active: 'Last active',
  movement: 'Rank movement',
  reviewHits: 'Maintainer reviews',
  openPrRisk: 'Open-PR risk',
  watch: 'Tracked first',
};

const ELIGIBILITY_SEGMENTS: ReadonlyArray<{
  key: EligibilityFilter;
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'eligible', label: 'Eligible' },
  { key: 'ineligible', label: 'Ineligible' },
] as const;

const EligibilitySegmentedControl: React.FC<{
  filter: EligibilityFilter;
  onFilter: (next: EligibilityFilter) => void;
}> = ({ filter, onFilter }) => (
  <Box
    role="group"
    aria-label="Filter miners by eligibility"
    sx={(t) => ({
      display: 'inline-flex',
      width: { xs: '100%', md: 'auto' },
      padding: '3px',
      borderRadius: 2,
      backgroundColor: t.palette.surface.subtle,
      border: `1px solid ${t.palette.border.light}`,
      gap: '2px',
    })}
  >
    {ELIGIBILITY_SEGMENTS.map(({ key, label }) => {
      const active = filter === key;
      return (
        <Box
          key={key}
          component="button"
          type="button"
          aria-pressed={active}
          onClick={() => onFilter(key)}
          sx={(t) => ({
            flex: { xs: 1, md: 'none' },
            minWidth: { md: 92 },
            position: 'relative',
            px: { xs: 1.25, md: 2 },
            py: '7px',
            border: 'none',
            borderRadius: 1.5,
            backgroundColor: active
              ? alpha(t.palette.text.primary, 0.08)
              : 'transparent',
            color: active
              ? t.palette.text.primary
              : alpha(t.palette.text.primary, 0.6),
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '0.78rem',
            fontWeight: active ? 700 : 600,
            letterSpacing: '0.2px',
            lineHeight: 1.2,
            transition: 'background-color 0.15s, color 0.15s, box-shadow 0.15s',
            boxShadow: active
              ? `inset 0 0 0 1px ${alpha(t.palette.text.primary, 0.1)}`
              : 'none',
            '&:hover': {
              backgroundColor: active
                ? alpha(t.palette.text.primary, 0.1)
                : alpha(t.palette.text.primary, 0.04),
              color: t.palette.text.primary,
            },
            '&:focus-visible': {
              outline: `2px solid ${t.palette.primary.main}`,
              outlineOffset: 2,
            },
          })}
        >
          {label}
        </Box>
      );
    })}
  </Box>
);

const ViewModeToggle: React.FC<{
  viewMode: LeaderboardViewMode;
  onChange: (mode: LeaderboardViewMode) => void;
}> = ({ viewMode, onChange }) => {
  const options: {
    value: LeaderboardViewMode;
    label: string;
    Icon: typeof ViewListIcon;
  }[] = [
    { value: 'list', label: 'Table view', Icon: ViewListIcon },
    { value: 'cards', label: 'Card view', Icon: ViewModuleIcon },
  ];
  return (
    <Box
      sx={(t) => ({
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 2,
        border: '1px solid',
        borderColor: t.palette.border.light,
        overflow: 'hidden',
        flexShrink: 0,
      })}
      role="group"
      aria-label="Toggle leaderboard view mode"
    >
      {options.map(({ value, label, Icon }) => {
        const isActive = viewMode === value;
        return (
          <Tooltip key={value} title={label} placement="top" arrow>
            <IconButton
              onClick={() => onChange(value)}
              size="small"
              aria-label={label}
              aria-pressed={isActive}
              sx={(t) => ({
                borderRadius: 0,
                padding: '6px 10px',
                color: isActive
                  ? t.palette.text.primary
                  : t.palette.text.tertiary,
                backgroundColor: isActive
                  ? t.palette.surface.light
                  : 'transparent',
                '&:hover': {
                  backgroundColor: t.palette.surface.light,
                  color: t.palette.text.primary,
                },
                '&:focus-visible': {
                  outline: `2px solid ${t.palette.primary.main}`,
                  outlineOffset: -2,
                },
              })}
            >
              <Icon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
};

const Toolbar: React.FC<ToolbarProps> = ({
  total,
  filteredCount,
  search,
  onSearch,
  filter,
  onFilter,
  counts,
  trackedOnly,
  onTrackedOnly,
  watchedCount,
  selectedRepo,
  onClearRepo,
  selectedCohort,
  onClearCohort,
  sortField,
  sortDir,
  onSortFieldChange,
  onSortDirToggle,
  viewMode,
  onViewModeChange,
  rowsPerPage,
  rowsPerPageOptions,
  onRowsPerPageChange,
}) => {
  const primarySummary =
    filteredCount === total
      ? `${total.toLocaleString()} miners`
      : `${filteredCount.toLocaleString()} of ${total.toLocaleString()}`;
  const breakdownSummary =
    total > 0
      ? `${counts.eligible.toLocaleString()} eligible · ${counts.ineligible.toLocaleString()} ineligible`
      : null;
  return (
    <Box
      sx={{
        p: { xs: 1.75, sm: 2.5 },
        borderBottom: '1px solid',
        borderColor: 'border.light',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
          rowGap: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            minWidth: 0,
            flexWrap: 'wrap',
            rowGap: 0.75,
          }}
        >
          <Tooltip
            title={
              <RowTooltipContent
                title="Network leaderboard"
                body="Ranked by combined OSS + Discovery score across the whole network."
              />
            }
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Typography
              variant="sectionTitle"
              sx={{ cursor: 'help', whiteSpace: 'nowrap' }}
            >
              Network leaderboard
            </Typography>
          </Tooltip>
          <NetworkPulsePill />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: alpha(theme.palette.common.white, 0.7),
              fontFamily: '"JetBrains Mono", monospace',
              whiteSpace: 'nowrap',
              lineHeight: 1.1,
            }}
          >
            {primarySummary}
          </Typography>
          {breakdownSummary && (
            <Typography
              sx={{
                fontSize: '0.62rem',
                color: alpha(theme.palette.common.white, 0.4),
                fontFamily: '"JetBrains Mono", monospace',
                whiteSpace: 'nowrap',
                lineHeight: 1.1,
                textAlign: 'right',
              }}
            >
              {breakdownSummary}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <EligibilitySegmentedControl filter={filter} onFilter={onFilter} />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 1,
        }}
      >
        <Box sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
          <EligibilitySegmentedControl filter={filter} onFilter={onFilter} />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1,
            width: { xs: '100%', md: 'auto' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flex: { xs: 'none', sm: 1, md: 'none' },
              width: { xs: '100%', sm: 'auto', md: 'auto' },
              minWidth: 0,
            }}
          >
            <FormControl
              size="small"
              sx={{
                width: { xs: '100%', md: 200 },
                flex: { xs: 1, md: 'none' },
              }}
            >
              <Select
                value={sortField}
                onChange={(event) =>
                  onSortFieldChange(event.target.value as SortField)
                }
                displayEmpty
                startAdornment={
                  <SortIcon
                    sx={{
                      fontSize: '0.95rem',
                      mr: 0.75,
                      color: alpha(theme.palette.common.white, 0.4),
                    }}
                  />
                }
                renderValue={(value) => (
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'text.primary',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {SORT_FIELD_LABELS[value as SortField]}
                  </Box>
                )}
                sx={{
                  fontSize: '0.8rem',
                  backgroundColor: 'surface.subtle',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'border.light',
                  },
                  '& .MuiSelect-select': {
                    py: '6.5px',
                    pl: '10px',
                    display: 'flex',
                    alignItems: 'center',
                  },
                }}
                // Opaque surface.elevated so the table doesn't bleed through.
                MenuProps={{
                  slotProps: {
                    paper: {
                      sx: (t) => ({
                        backgroundColor: t.palette.surface.elevated,
                        backgroundImage: 'none',
                        border: `1px solid ${t.palette.border.light}`,
                        boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.55)}`,
                      }),
                    },
                  },
                }}
              >
                {SORT_FIELDS.map((field) => (
                  <MenuItem
                    key={field}
                    value={field}
                    sx={(t) => ({
                      fontSize: '0.8rem',
                      '&.Mui-selected': {
                        backgroundColor: alpha(t.palette.primary.main, 0.18),
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: alpha(t.palette.primary.main, 0.26),
                      },
                    })}
                  >
                    {SORT_FIELD_LABELS[field]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip
              title={
                sortDir === 'desc'
                  ? 'Descending — click for ascending'
                  : 'Ascending — click for descending'
              }
              arrow
              placement="top"
              slotProps={tooltipSlotProps}
            >
              <IconButton
                size="small"
                onClick={onSortDirToggle}
                aria-label={`Toggle sort direction (currently ${sortDir})`}
                sx={(t) => ({
                  border: `1px solid ${t.palette.border.light}`,
                  borderRadius: 1.5,
                  width: 32,
                  height: 32,
                  backgroundColor: 'surface.subtle',
                  color: alpha(t.palette.text.primary, 0.7),
                  '&:hover': { backgroundColor: t.palette.surface.light },
                  '&:focus-visible': {
                    outline: `2px solid ${t.palette.primary.main}`,
                    outlineOffset: 2,
                    backgroundColor: t.palette.surface.light,
                  },
                })}
              >
                {sortDir === 'desc' ? (
                  <ArrowDownwardIcon sx={{ fontSize: '0.95rem' }} />
                ) : (
                  <ArrowUpwardIcon sx={{ fontSize: '0.95rem' }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'inline-flex' }}>
            <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
          </Box>

          <FormControl
            size="small"
            sx={{
              display: { xs: 'flex', md: 'inline-flex' },
              width: { xs: '100%', sm: 110, md: 96 },
              flexShrink: 0,
            }}
          >
            <Select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              displayEmpty
              renderValue={(value) => (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    gap: '5px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'text.primary',
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.6rem',
                      color: alpha(theme.palette.common.white, 0.5),
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      fontWeight: 700,
                    }}
                  >
                    Rows
                  </Box>
                  {String(value)}
                </Box>
              )}
              sx={{
                fontSize: '0.8rem',
                backgroundColor: 'surface.subtle',
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'border.light',
                },
                '& .MuiSelect-select': {
                  py: '6.5px',
                  pl: '12px',
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: (t) => ({
                      backgroundColor: t.palette.surface.elevated,
                      backgroundImage: 'none',
                      border: `1px solid ${t.palette.border.light}`,
                      boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.55)}`,
                    }),
                  },
                },
              }}
            >
              {rowsPerPageOptions.map((value) => (
                <MenuItem
                  key={value}
                  value={value}
                  sx={(t) => ({
                    fontSize: '0.8rem',
                    '&.Mui-selected': {
                      backgroundColor: alpha(t.palette.primary.main, 0.18),
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: alpha(t.palette.primary.main, 0.26),
                    },
                  })}
                >
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {(watchedCount > 0 ||
          trackedOnly ||
          selectedRepo ||
          selectedCohort) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              minWidth: 0,
            }}
          >
            {(watchedCount > 0 || trackedOnly) && (
              <Tooltip
                title={
                  <RowTooltipContent
                    title={
                      trackedOnly ? 'Showing tracked only' : 'Filter to tracked'
                    }
                    body={
                      watchedCount === 0
                        ? "You don't track any miners yet. Star a miner's row to add them to your watchlist."
                        : `Limit the leaderboard to the ${watchedCount.toLocaleString()} miner${watchedCount === 1 ? '' : 's'} you've starred. Stacks with the eligibility filter and any active repo filter.`
                    }
                    action={
                      trackedOnly
                        ? 'Click to clear and see every miner again'
                        : watchedCount > 0
                          ? 'Click to limit the table to your tracked miners'
                          : undefined
                    }
                  />
                }
                arrow
                placement="top"
                slotProps={tooltipSlotProps}
              >
                <Chip
                  icon={
                    <StarBorderIcon
                      sx={{
                        fontSize: '0.95rem !important',
                        ml: '4px !important',
                      }}
                    />
                  }
                  label={`Tracked · ${watchedCount.toLocaleString()}`}
                  onClick={() => onTrackedOnly(!trackedOnly)}
                  size="small"
                  disabled={!trackedOnly && watchedCount === 0}
                  sx={(t) => ({
                    height: 28,
                    cursor:
                      watchedCount === 0 && !trackedOnly
                        ? 'default'
                        : 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: 1.5,
                    color: trackedOnly
                      ? t.palette.warning.main
                      : alpha(t.palette.text.primary, 0.55),
                    backgroundColor: trackedOnly
                      ? alpha(t.palette.warning.main, 0.16)
                      : t.palette.surface.subtle,
                    border: `1px solid ${
                      trackedOnly
                        ? t.palette.warning.main
                        : t.palette.border.light
                    }`,
                    '& .MuiChip-icon': {
                      color: trackedOnly
                        ? t.palette.warning.main
                        : alpha(t.palette.text.primary, 0.45),
                    },
                    '&:hover': {
                      backgroundColor: trackedOnly
                        ? alpha(t.palette.warning.main, 0.22)
                        : t.palette.surface.light,
                    },
                    '&.Mui-disabled': {
                      opacity: 0.45,
                    },
                  })}
                />
              </Tooltip>
            )}
            {selectedRepo && (
              <Chip
                icon={<ClearIcon sx={{ fontSize: '0.85rem !important' }} />}
                label={`repo: ${selectedRepo}`}
                onClick={onClearRepo}
                size="small"
                sx={(t) => ({
                  height: 28,
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  color: t.palette.primary.main,
                  backgroundColor: alpha(t.palette.primary.main, 0.16),
                  border: `1px solid ${t.palette.primary.main}`,
                  '& .MuiChip-icon': { color: t.palette.primary.main },
                })}
              />
            )}
            {selectedCohort && (
              <Tooltip
                title={
                  <RowTooltipContent
                    title={`Cohort filter · ${COHORT_LABELS[selectedCohort]}`}
                    body={COHORT_DESCRIPTIONS[selectedCohort]}
                    action="Click to clear the cohort filter"
                  />
                }
                arrow
                placement="top"
                slotProps={tooltipSlotProps}
              >
                <Chip
                  icon={<ClearIcon sx={{ fontSize: '0.85rem !important' }} />}
                  label={`cohort: ${COHORT_LABELS[selectedCohort]}`}
                  onClick={onClearCohort}
                  size="small"
                  sx={(t) => ({
                    height: 28,
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    borderRadius: 1.5,
                    color: t.palette.info.main,
                    backgroundColor: alpha(t.palette.info.main, 0.16),
                    border: `1px solid ${t.palette.info.main}`,
                    '& .MuiChip-icon': { color: t.palette.info.main },
                  })}
                />
              </Tooltip>
            )}
          </Box>
        )}

        <TextField
          size="small"
          placeholder="Search miner, UID, hotkey…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{
                    fontSize: '1rem',
                    color: alpha(theme.palette.common.white, 0.4),
                  }}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <ClearSearchAdornment
                visible={Boolean(search)}
                onClear={() => onSearch('')}
              />
            ),
          }}
          sx={{
            width: { xs: '100%', md: 260 },
            ml: { xs: 0, md: 'auto' },
            '& .MuiOutlinedInput-root': {
              fontSize: '0.8rem',
              backgroundColor: 'surface.subtle',
              borderRadius: 2,
              '& fieldset': { borderColor: 'border.light' },
            },
          }}
        />
      </Box>
    </Box>
  );
};

/* ─── Main table component ─────────────────────────────────────────────── */

interface RankedMiner {
  miner: MinerEvaluation;
  rank: number;
  position: number;
  combined: number;
  activity: MinerActivity;
  status: MinerStatus;
  openPrRisk: OpenPrRisk;
  previousRank: number | undefined;
}

type LeaderboardUrlFilters = {
  search: string;
  eligible: EligibilityFilter;
  trackedOnly: boolean;
};

const eligibleFilterConfig = {
  paramKey: 'eligible',
  parse: (raw: string | null): EligibilityFilter =>
    raw === 'true'
      ? 'eligible'
      : raw === 'false'
        ? 'ineligible'
        : raw === 'all'
          ? 'all'
          : 'all',
  serialize: (value: EligibilityFilter): string | null => {
    if (value === 'all') return null;
    return value === 'eligible' ? 'true' : 'false';
  },
};

const searchFilterConfig = {
  paramKey: 'search',
  parse: (raw: string | null): string => raw ?? '',
  serialize: (value: string): string | null => value.trim() || null,
};

const trackedOnlyFilterConfig = {
  paramKey: 'tracked',
  parse: (raw: string | null): boolean => raw === '1',
  serialize: (value: boolean): string | null => (value ? '1' : null),
};

const MinersLeaderTable: React.FC<MinersLeaderTableProps> = ({
  miners,
  isLoading,
  selectedRepo,
  onSelectRepo,
  selectedCohort,
  onClearCohort,
}) => {
  const navigate = useNavigate();
  const { isWatched, count: watchedCount } = useWatchlist('miners');
  const { index: activityIndex, isLoading: isLoadingActivity } =
    useMinerActivityIndex({ lookbackDays: 30, topReposLimit: 2 });

  const [searchParams, setSearchParams] = useSearchParams();
  const initialViewMode = useMemo<LeaderboardViewMode>(() => {
    return getLeaderboardViewModeFromQuery(
      searchParams.get(LEADERBOARD_VIEW_QUERY_PARAM),
      readStoredLeaderboardViewMode(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [viewMode, setViewMode] =
    useState<LeaderboardViewMode>(initialViewMode);
  const effectiveViewMode: LeaderboardViewMode = viewMode;

  const filtersConfig = useMemo(
    () => ({
      search: searchFilterConfig,
      eligible: eligibleFilterConfig,
      trackedOnly: trackedOnlyFilterConfig,
    }),
    [],
  );
  const {
    sortField,
    sortOrder: sortDir,
    setSort,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filters,
    setFilter,
  } = useDataTableParams<SortField, LeaderboardUrlFilters>({
    sortKeys: SORT_FIELDS,
    defaultSortKey: 'score',
    defaultSortOrder: 'desc',
    defaultRowsPerPage: defaultRowsForLeaderboardView(initialViewMode),
    rowsPerPageOptions: LEADERBOARD_VALID_ROWS,
    filters: filtersConfig,
  });
  const search = filters.search;
  const filter = filters.eligible;
  const trackedOnly = filters.trackedOnly;
  const setSearch = (value: string) => setFilter('search', value);
  const setEligibility = (value: EligibilityFilter) =>
    setFilter('eligible', value);
  const setTrackedOnly = (value: boolean) => setFilter('trackedOnly', value);

  const handleViewModeChange = useCallback(
    (next: LeaderboardViewMode) => {
      setViewMode(next);
      writeStoredLeaderboardViewMode(next);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === 'list') params.delete(LEADERBOARD_VIEW_QUERY_PARAM);
          else params.set(LEADERBOARD_VIEW_QUERY_PARAM, next);
          return params;
        },
        { replace: true },
      );
      // List [10,25,50] and cards [12,24,48] don't overlap — clamp on switch.
      setRowsPerPage(clampRowsForLeaderboardView(rowsPerPage, next));
    },
    [setSearchParams, setRowsPerPage, rowsPerPage],
  );

  // Parent owns ?repo; reset page ourselves but preserve initial deep-links.
  const lastSelectedRepoRef = useRef<string | null>(selectedRepo);
  useEffect(() => {
    if (lastSelectedRepoRef.current === selectedRepo) return;
    lastSelectedRepoRef.current = selectedRepo;
    setPage(0);
  }, [selectedRepo, setPage]);

  const lastSelectedCohortRef = useRef<CohortKey | null>(selectedCohort);
  useEffect(() => {
    if (lastSelectedCohortRef.current === selectedCohort) return;
    lastSelectedCohortRef.current = selectedCohort;
    setPage(0);
  }, [selectedCohort, setPage]);

  const rankedBase = useMemo(() => {
    return [...miners]
      .map((m) => ({
        miner: m,
        combined: combinedScore(m),
        activity: activityIndex.get(m.githubId) ?? EMPTY_ACTIVITY,
        openPrRisk: computeOpenPrRisk(m),
      }))
      .sort((a, b) => {
        const aPen = isPenalized(a.miner);
        const bPen = isPenalized(b.miner);
        if (aPen !== bPen) return aPen ? 1 : -1;
        return b.combined - a.combined;
      })
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [miners, activityIndex]);

  const currentRanks = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rankedBase) map.set(row.miner.githubId, row.rank);
    return map;
  }, [rankedBase]);
  const { previousRanks, isHydrated: isRankSnapshotHydrated } =
    useRankSnapshot(currentRanks);

  const ranked = useMemo<RankedMiner[]>(() => {
    return rankedBase.map((row) => {
      const previousRank = previousRanks.get(row.miner.githubId);
      return {
        ...row,
        position: 0,
        previousRank,
        status: deriveMinerStatus(row.miner, row.activity, {
          previousRank,
          currentRank: row.rank,
        }),
      };
    });
  }, [rankedBase, previousRanks]);

  // Scope excludes the eligibility tab so the toolbar counts stay stable.
  const scope = useMemo(() => {
    const q = search.trim().toLowerCase();
    const repoLc = selectedRepo?.toLowerCase() ?? null;
    return ranked.filter(({ miner, activity }) => {
      if (selectedCohort && cohortOf(miner) !== selectedCohort) return false;
      if (trackedOnly && !isWatched(miner.githubId)) return false;
      if (repoLc) {
        const hit = activity.topRepos.some(
          (r) => r.name.toLowerCase() === repoLc,
        );
        if (!hit) return false;
      }
      if (!q) return true;
      const username = (miner.githubUsername ?? '').toLowerCase();
      const uid = String(miner.uid);
      const hotkey = (miner.hotkey ?? '').toLowerCase();
      return username.includes(q) || uid.includes(q) || hotkey.includes(q);
    });
  }, [ranked, trackedOnly, isWatched, search, selectedRepo, selectedCohort]);

  const counts = useMemo(
    () => ({
      all: scope.length,
      eligible: scope.filter((r) => isAnyEligibleNow(r.miner)).length,
      ineligible: scope.filter((r) => !isAnyEligibleNow(r.miner)).length,
    }),
    [scope],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return scope;
    return scope.filter(({ miner }) => {
      const eligible = isAnyEligibleNow(miner);
      return filter === 'eligible' ? eligible : !eligible;
    });
  }, [scope, filter]);

  const sorted = useMemo(() => {
    const next = [...filtered];
    next.sort((a, b) => {
      // Penalized miners sink to the bottom regardless of sort field/direction.
      const aPen = isPenalized(a.miner);
      const bPen = isPenalized(b.miner);
      if (aPen !== bPen) return aPen ? 1 : -1;

      let cmp = 0;
      switch (sortField) {
        case 'score':
          cmp = a.combined - b.combined;
          break;
        case 'usd':
          cmp = parseNumber(a.miner.usdPerDay) - parseNumber(b.miner.usdPerDay);
          break;
        case 'credibility':
          cmp =
            parseNumber(a.miner.credibility) - parseNumber(b.miner.credibility);
          break;
        case 'volume':
          cmp = totalVolume(a.miner) - totalVolume(b.miner);
          break;
        case 'active': {
          const at = a.activity.lastActiveAt
            ? Date.parse(a.activity.lastActiveAt)
            : 0;
          const bt = b.activity.lastActiveAt
            ? Date.parse(b.activity.lastActiveAt)
            : 0;
          cmp = at - bt;
          break;
        }
        case 'reviewHits':
          cmp = a.activity.reviewHits - b.activity.reviewHits;
          break;
        case 'openPrRisk': {
          const ar = a.openPrRisk.ratio;
          const br = b.openPrRisk.ratio;
          if (ar === br) cmp = a.openPrRisk.open - b.openPrRisk.open;
          else cmp = ar - br;
          break;
        }
        case 'movement': {
          // Miners without a baseline sink to the bottom via -Infinity.
          const aDelta =
            a.previousRank !== undefined ? a.previousRank - a.rank : -Infinity;
          const bDelta =
            b.previousRank !== undefined ? b.previousRank - b.rank : -Infinity;
          cmp = aDelta - bDelta;
          break;
        }
        case 'watch': {
          const aw = isWatched(a.miner.githubId) ? 1 : 0;
          const bw = isWatched(b.miner.githubId) ? 1 : 0;
          cmp = aw - bw;
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return next;
  }, [filtered, sortField, sortDir, isWatched]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paged = useMemo(() => {
    const slice = paginateItems(sorted, page, rowsPerPage);
    return slice.map((row, index) => ({
      ...row,
      position: page * rowsPerPage + index + 1,
    }));
  }, [sorted, page, rowsPerPage]);

  const handleRepoChipClick = (repo: string) => {
    onSelectRepo(selectedRepo === repo ? null : repo);
  };

  const tierSm = { xs: 'table-cell' } as const;
  const tierMd = { xs: 'table-cell' } as const;
  const tierLg = { xs: 'table-cell' } as const;

  // Force flex-end + collapsed icon so right-aligned header text stays flush.
  const rightSortLabelSx = {
    '& .MuiTableSortLabel-root': {
      width: '100%',
      justifyContent: 'flex-end',
    },
    '& .MuiTableSortLabel-icon': {
      width: 0,
      marginLeft: '2px',
      marginRight: 0,
      overflow: 'visible',
    },
  } as const;

  const columns: DataTableColumn<RankedMiner, SortField>[] = [
    {
      key: 'rank',
      header: '#',
      width: 48,
      sortKey: 'movement',
      renderCell: (row) => (
        <RankCell
          globalRank={row.rank}
          previousRank={row.previousRank}
          isHydrated={isRankSnapshotHydrated}
        />
      ),
    },
    {
      key: 'miner',
      header: 'Miner',
      width: 184,
      renderCell: (row) => (
        <IdentityCell miner={row.miner} status={row.status} />
      ),
    },
    {
      key: 'trend',
      header: 'Trend',
      width: 172,
      headerSx: { display: tierMd, textAlign: 'center' },
      cellSx: { display: tierMd },
      renderCell: (row) => (
        <Box
          sx={(t) => ({
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: '6px',
            py: '4px',
            borderRadius: 1,
            backgroundColor: alpha(t.palette.text.primary, 0.025),
            border: `1px solid ${t.palette.border.subtle}`,
          })}
        >
          <SparklineButton
            username={row.miner.githubUsername ?? `uid-${row.miner.uid}`}
            githubId={row.miner.githubId}
            primaryValues={row.activity.dailyOss}
            secondaryValues={row.activity.dailyDiscovery}
            width={156}
            height={32}
            primaryLabel="OSS"
            secondaryLabel="Discovery"
            emphasis
          />
        </Box>
      ),
    },
    {
      key: 'eligibility',
      header: 'Eligibility',
      width: 120,
      headerSx: { display: tierSm },
      cellSx: { display: tierSm },
      renderCell: (row) => <EligibilityCell miner={row.miner} />,
    },
    {
      key: 'contributions',
      header: 'Contributions',
      width: 130,
      headerSx: { display: tierSm },
      cellSx: { display: tierSm },
      renderCell: (row) => <ContributionStatsCell miner={row.miner} />,
    },
    {
      key: 'score',
      header: 'Score',
      width: 72,
      align: 'right',
      sortKey: 'score',
      headerSx: {
        ...rightSortLabelSx,
        textAlign: 'right',
        pr: '12px',
      },
      cellSx: { pr: '12px' },
      renderCell: (row) => {
        const oss = parseNumber(row.miner.totalScore);
        const disc = parseNumber(row.miner.issueDiscoveryScore);
        const structural = parseNumber(row.miner.totalStructuralScore);
        const leaf = parseNumber(row.miner.totalLeafScore);
        const structuralCount = parseNumber(row.miner.totalStructuralCount);
        const leafCount = parseNumber(row.miner.totalLeafCount);
        const tokenScore = parseNumber(row.miner.totalTokenScore);
        return (
          <Tooltip
            title={
              row.combined > 0 ? (
                <RowTooltipContent
                  title={`Combined score ${row.combined.toFixed(2)}`}
                  body={
                    <>
                      OSS{' '}
                      <Box
                        component="span"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                        }}
                      >
                        {oss.toFixed(2)}
                      </Box>{' '}
                      + Discovery{' '}
                      <Box
                        component="span"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                        }}
                      >
                        {disc.toFixed(2)}
                      </Box>
                      <TooltipSplitBar
                        segments={[
                          {
                            label: 'OSS',
                            value: oss,
                            color: STATUS_COLORS.merged,
                          },
                          {
                            label: 'Discovery',
                            value: disc,
                            color: STATUS_COLORS.info,
                          },
                        ]}
                      />
                      {tokenScore > 0 && (structural > 0 || leaf > 0) && (
                        <Box sx={{ mt: '8px' }}>
                          <Box sx={{ fontSize: '0.66rem', opacity: 0.75 }}>
                            Token score {tokenScore.toFixed(0)} — code AST
                            breakdown:
                          </Box>
                          <TooltipSplitBar
                            segments={[
                              {
                                label: `Structural · ${structuralCount.toLocaleString()}`,
                                value: structural,
                                color: STATUS_COLORS.success,
                              },
                              {
                                label: `Leaf · ${leafCount.toLocaleString()}`,
                                value: leaf,
                                color: STATUS_COLORS.warning,
                              },
                            ]}
                          />
                        </Box>
                      )}
                      <Box sx={{ mt: '6px' }}>
                        Drives the global ranking — sum of the miner&apos;s OSS
                        contribution score and Issue-Discovery score.
                      </Box>
                    </>
                  }
                />
              ) : (
                <RowTooltipContent
                  title="No score yet"
                  body="This miner has no scored PRs or solved issues on record."
                />
              )
            }
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                width: '100%',
                cursor: 'help',
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color:
                    row.combined > 0
                      ? 'text.primary'
                      : alpha(theme.palette.common.white, 0.3),
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {row.combined > 0
                  ? displayedCombinedScore(row.miner).toFixed(1)
                  : '—'}
              </Typography>
            </Box>
          </Tooltip>
        );
      },
    },
    {
      key: 'usd',
      header: '$/Day',
      width: 76,
      align: 'right',
      sortKey: 'usd',
      headerSx: rightSortLabelSx,
      renderCell: (row) => {
        const usd = parseNumber(row.miner.usdPerDay);
        const alphaPerDay = parseNumber(row.miner.alphaPerDay);
        const ossScore = parseNumber(row.miner.totalScore);
        const discScore = parseNumber(row.miner.issueDiscoveryScore);
        const split = splitEarnings(
          usd,
          ossScore,
          discScore,
          !!row.miner.isEligible,
          !!row.miner.isIssueEligible,
        );
        return (
          <Tooltip
            title={
              usd > 0 ? (
                <RowTooltipContent
                  title={`${fmtUsd(usd)} per day`}
                  body={
                    <>
                      Predicted USD payout — this miner&apos;s share of the
                      subnet alpha emission
                      {alphaPerDay > 0
                        ? ` (≈${alphaPerDay.toFixed(2)} α/day)`
                        : ''}{' '}
                      × TAO × α74 spot prices.
                      {(split.oss > 0 || split.discovery > 0) && (
                        <TooltipSplitBar
                          segments={[
                            {
                              label: `OSS · ${fmtUsd(split.oss)}`,
                              value: split.oss,
                              color: STATUS_COLORS.merged,
                            },
                            {
                              label: `Discovery · ${fmtUsd(split.discovery)}`,
                              value: split.discovery,
                              color: STATUS_COLORS.info,
                            },
                          ]}
                        />
                      )}
                    </>
                  }
                  tone="positive"
                />
              ) : (
                <RowTooltipContent
                  title="No earnings yet"
                  body="Not eligible in any repo on either track — emissions only flow once a miner crosses an eligibility threshold somewhere."
                />
              )
            }
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.85rem',
                fontWeight: usd > 0 ? 700 : 500,
                color:
                  usd > 0
                    ? STATUS_COLORS.success
                    : alpha(theme.palette.common.white, 0.3),
                cursor: 'help',
              }}
            >
              {fmtUsd(usd)}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      key: 'reviewHits',
      header: (
        <Tooltip
          title={
            <RowTooltipContent
              title="Maintainer pushback"
              body={
                <>
                  Total &quot;changes requested&quot; reviews across this
                  miner&apos;s recent PRs. Each hit docks 15% of that PR&apos;s
                  earned score (validator&apos;s REVIEW_PENALTY_RATE). Lower is
                  better.
                </>
              }
            />
          }
          arrow
          placement="top"
          slotProps={tooltipSlotProps}
        >
          <Box
            component="span"
            sx={{ display: 'inline-block', cursor: 'help' }}
          >
            Reviews
          </Box>
        </Tooltip>
      ),
      headerSx: { display: tierLg, whiteSpace: 'nowrap', ...rightSortLabelSx },
      cellSx: { display: tierLg },
      width: 68,
      align: 'right',
      sortKey: 'reviewHits',
      renderCell: (row) => {
        const hits = row.activity.reviewHits;
        const merged = parseNumber(row.miner.totalMergedPrs);
        const penaltyPct = Math.min(100, hits * 15);
        let tooltipNode: React.ReactNode;
        if (hits === 0 && merged === 0) {
          tooltipNode = (
            <RowTooltipContent
              title="No reviews yet"
              body="No merged PRs in the recent window — nothing to be reviewed."
            />
          );
        } else if (hits === 0) {
          tooltipNode = (
            <RowTooltipContent
              title="Clean ship rate"
              body="Zero maintainer 'changes requested' reviews on recent PRs — work is landing cleanly."
              tone="positive"
            />
          );
        } else {
          tooltipNode = (
            <RowTooltipContent
              title={`${hits} 'changes requested' review${hits === 1 ? '' : 's'}`}
              body={
                <>
                  Maintainers asked for changes on this miner&apos;s recent PRs.
                  Each hit docks 15% off that PR&apos;s earned score, so the
                  cumulative drag is up to ≈
                  <Box
                    component="span"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 700,
                    }}
                  >
                    {penaltyPct}%
                  </Box>{' '}
                  of an affected PR&apos;s payout.
                </>
              }
              tone={hits >= 5 ? 'negative' : 'caution'}
            />
          );
        }
        return (
          <Tooltip
            title={tooltipNode}
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: hits > 0 ? '0.82rem' : '0.7rem',
                fontWeight: hits > 0 ? 700 : 500,
                color:
                  hits === 0
                    ? alpha(theme.palette.common.white, merged > 0 ? 0.28 : 0.2)
                    : hits >= 5
                      ? STATUS_COLORS.closed
                      : STATUS_COLORS.warningOrange,
                cursor: 'help',
                lineHeight: 1,
              }}
            >
              {hits === 0 ? (merged > 0 ? '·' : '—') : hits}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      key: 'openPrRisk',
      header: (
        <Tooltip
          title={
            <RowTooltipContent
              title="Open-PR slot usage"
              body={
                <>
                  Open PRs the miner has across all repos / total slots allowed
                  at their current token-score. Slot math mirrors the
                  validator&apos;s <em>calculate_open_pr_threshold</em>: base{' '}
                  {NETWORK_OPEN_PR_THRESHOLDS.openPrSlotBase} + ⌊token_score
                  &#47; {NETWORK_OPEN_PR_THRESHOLDS.openPrSlotTokenScore}⌋,
                  capped at {NETWORK_OPEN_PR_THRESHOLDS.maxOpenPrSlots}.
                  Exceeding the per-repo limit zeroes that repo&apos;s PR score,
                  so values close to or over the line are a risk signal.
                </>
              }
            />
          }
          arrow
          placement="top"
          slotProps={tooltipSlotProps}
        >
          <Box
            component="span"
            sx={{ display: 'inline-block', cursor: 'help' }}
          >
            Open PRs
          </Box>
        </Tooltip>
      ),
      width: 88,
      align: 'right',
      sortKey: 'openPrRisk',
      headerSx: { display: tierLg, whiteSpace: 'nowrap', ...rightSortLabelSx },
      cellSx: { display: tierLg },
      renderCell: (row) => {
        const { open, allowed, ratio } = row.openPrRisk;
        const failed = row.miner.failedReason ?? '';
        const flaggedByValidator =
          typeof failed === 'string' &&
          failed.toLowerCase().includes('open pr');
        // Validator flag forces red since aggregate math can hide per-repo penalty.
        let tone: 'positive' | 'caution' | 'negative' | 'default';
        if (flaggedByValidator || ratio >= 1 || open > allowed)
          tone = 'negative';
        else if (ratio >= 0.5) tone = 'caution';
        else if (open === 0) tone = 'default';
        else tone = 'positive';
        const color =
          tone === 'negative'
            ? STATUS_COLORS.closed
            : tone === 'caution'
              ? STATUS_COLORS.warningOrange
              : tone === 'positive'
                ? STATUS_COLORS.success
                : alpha(theme.palette.common.white, 0.3);
        const tooltipNode = (() => {
          if (open === 0) {
            return (
              <RowTooltipContent
                title="No open PRs"
                body={
                  <>
                    Nothing in flight — collateral isn&apos;t locked up and the
                    open-PR penalty can&apos;t trigger.
                  </>
                }
              />
            );
          }
          if (flaggedByValidator) {
            return (
              <RowTooltipContent
                title="In penalty: too many open PRs"
                body={
                  <>
                    The validator flagged this miner with{' '}
                    <Box
                      component="span"
                      sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {failed}
                    </Box>
                    . PR score zeroed in at least one repo until the count drops
                    back under the dynamic threshold.
                  </>
                }
                tone="negative"
              />
            );
          }
          return (
            <RowTooltipContent
              title={
                <>
                  <Box
                    component="span"
                    sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {open}
                  </Box>{' '}
                  open / ≈
                  <Box
                    component="span"
                    sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {allowed}
                  </Box>{' '}
                  allowed
                </>
              }
              body={
                <>
                  Approximate — the validator&apos;s open-PR limit is per-repo,
                  but the leaderboard aggregates across all repos so this reads
                  as a network-wide triage signal.{' '}
                  {tone === 'negative'
                    ? 'At or over the aggregate cap — verify per-repo on the miner details page.'
                    : tone === 'caution'
                      ? 'Closing in on the cap — every extra open PR raises the slash risk.'
                      : 'Plenty of headroom under the cap.'}
                </>
              }
              tone={tone === 'default' ? undefined : tone}
            />
          );
        })();
        return (
          <Tooltip
            title={tooltipNode}
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.82rem',
                fontWeight: open > 0 ? 700 : 500,
                color:
                  open > 0 ? color : alpha(theme.palette.common.white, 0.3),
                lineHeight: 1,
                cursor: 'help',
                whiteSpace: 'nowrap',
              }}
            >
              {open}
              <Box
                component="span"
                sx={{
                  fontSize: '0.66rem',
                  color: alpha(theme.palette.common.white, 0.45),
                  fontWeight: 500,
                  ml: '2px',
                }}
              >
                /{allowed}
              </Box>
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      key: 'topRepos',
      header: 'Top Repos',
      width: 140,
      headerSx: { display: tierLg },
      cellSx: { display: tierLg },
      renderCell: (row) => (
        <TopReposCell
          repos={row.activity.topRepos}
          selectedRepo={selectedRepo}
          onSelectRepo={handleRepoChipClick}
        />
      ),
    },
    {
      key: 'active',
      header: 'Active',
      headerSx: { display: tierMd, whiteSpace: 'nowrap', ...rightSortLabelSx },
      cellSx: { display: tierMd },
      width: 68,
      align: 'right',
      sortKey: 'active',
      renderCell: (row) => {
        const iso = row.activity.lastActiveAt;
        const absolute = iso
          ? new Date(iso).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : null;
        return (
          <Tooltip
            title={
              absolute ? (
                <RowTooltipContent
                  title={`Last active ${formatLastActive(iso)}`}
                  body={
                    <>
                      <Box
                        component="span"
                        sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        {absolute}
                      </Box>
                      <Box sx={{ mt: '4px' }}>
                        Timestamp of the miner&apos;s most recent merged PR or
                        solved issue.
                      </Box>
                    </>
                  }
                />
              ) : (
                <RowTooltipContent
                  title="Never active"
                  body="No merged PRs or solved issues on record for this miner."
                />
              )
            }
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.74rem',
                whiteSpace: 'nowrap',
                color: iso
                  ? alpha(theme.palette.common.white, 0.65)
                  : alpha(theme.palette.common.white, 0.3),
                cursor: 'help',
              }}
            >
              {formatLastActive(iso)}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      key: 'watch',
      header: <StarBorderIcon sx={{ fontSize: '1rem' }} />,
      width: 40,
      headerSx: { display: tierSm },
      cellSx: { display: tierSm },
      sortKey: 'watch',
      renderCell: (row) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <WatchlistButton
            category="miners"
            itemKey={row.miner.githubId}
            size="small"
          />
        </Box>
      ),
    },
  ];

  const showInitialLoading =
    (isLoading && miners.length === 0) ||
    (isLoadingActivity && activityIndex.size === 0 && miners.length === 0);

  const toolbar = (
    <Toolbar
      total={miners.length}
      filteredCount={scope.length}
      search={search}
      onSearch={setSearch}
      filter={filter}
      onFilter={setEligibility}
      counts={counts}
      trackedOnly={trackedOnly}
      onTrackedOnly={setTrackedOnly}
      watchedCount={watchedCount}
      selectedRepo={selectedRepo}
      onClearRepo={() => onSelectRepo(null)}
      selectedCohort={selectedCohort}
      onClearCohort={onClearCohort}
      sortField={sortField}
      sortDir={sortDir}
      onSortFieldChange={setSort}
      onSortDirToggle={() => setSort(sortField)}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      rowsPerPage={rowsPerPage}
      rowsPerPageOptions={rowsOptionsForLeaderboardView(effectiveViewMode)}
      onRowsPerPageChange={setRowsPerPage}
    />
  );

  const emptyState = (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography
        sx={{
          fontSize: '0.85rem',
          color: alpha(theme.palette.common.white, 0.5),
        }}
      >
        {miners.length === 0
          ? 'No miners registered yet.'
          : 'No miners match these filters.'}
      </Typography>
    </Box>
  );

  const paginationControls =
    totalPages > 1 ? (
      <TablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    ) : undefined;

  if (effectiveViewMode === 'cards') {
    return (
      <Card
        sx={{
          p: 0,
          overflow: 'hidden',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'background.default',
        }}
      >
        {toolbar}
        {showInitialLoading ? (
          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            Loading miners…
          </Box>
        ) : paged.length === 0 ? (
          emptyState
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                // minmax(0,1fr) prevents nowrap content from expanding columns past viewport.
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              gap: { xs: 1.25, sm: 1.5 },
              p: { xs: 1.25, sm: 1.5 },
            }}
          >
            {paged.map((row) => (
              <MobileMinerCard
                key={row.miner.githubId}
                row={row}
                isHydrated={isRankSnapshotHydrated}
                selectedRepo={selectedRepo}
                onSelectRepo={handleRepoChipClick}
              />
            ))}
          </Box>
        )}
        {paginationControls}
      </Card>
    );
  }

  return (
    <Card
      sx={{
        p: 0,
        overflow: 'hidden',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
      }}
    >
      <DataTable<RankedMiner, SortField>
        columns={columns}
        rows={paged}
        getRowKey={(row) => row.miner.githubId}
        onRowClick={(row) =>
          navigate(`/miners/details?githubId=${row.miner.githubId}`)
        }
        getRowSx={(row) => {
          const ineligible = !isAnyEligibleNow(row.miner);
          return {
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderBottom: '1px solid',
            borderColor: 'surface.light',
            ...(ineligible && {
              filter: 'brightness(0.88) saturate(0.92)',
              '& td': { color: alpha(theme.palette.common.white, 0.82) },
            }),
            '&:hover': {
              backgroundColor: 'border.subtle',
              filter: ineligible
                ? 'brightness(0.98) saturate(0.98)'
                : undefined,
            },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: -2,
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
            },
          };
        }}
        isLoading={showInitialLoading}
        header={toolbar}
        emptyState={emptyState}
        // Omitting `sort` flips DataTable to non-sortable headers.
        pagination={paginationControls}
      />
    </Card>
  );
};

export default MinersLeaderTable;

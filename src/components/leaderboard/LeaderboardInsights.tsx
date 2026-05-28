import React, { useMemo } from 'react';
import {
  Avatar,
  Box,
  Card,
  Skeleton,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  ShowChart as ChartIcon,
  Workspaces as CompositionIcon,
  Whatshot as HotRepoIcon,
} from '@mui/icons-material';
import {
  RANK_COLORS,
  STATUS_COLORS,
  TOOLTIP_TONE_COLORS,
  tooltipSlotProps,
} from '../../theme';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { parseNumber } from '../../utils/ExplorerUtils';
import { LinkBox } from '../common/linkBehavior';
import { usePrices } from '../../hooks/usePrices';
import type { MinerEvaluation } from '../../api';
import {
  useMinerActivityIndex,
  type NetworkRepoActivity,
} from './useMinerActivityIndex';
import {
  COHORT_COLORS,
  COHORT_DESCRIPTIONS,
  COHORT_KEYS,
  COHORT_LABELS,
  cohortOf,
  isAnyEligibleNow,
  type CohortKey,
} from './eligibilityCohort';

interface LeaderboardInsightsProps {
  miners: MinerEvaluation[] | undefined;
  isLoading: boolean;
  selectedRepo?: string | null;
  onSelectRepo?: (repo: string) => void;
  selectedCohort?: CohortKey | null;
  onSelectCohort?: (cohort: CohortKey) => void;
}

// Mirrors validator constants.py (OSS_EMISSION_SHARE=0.90, ISSUES_TREASURY_SHARE=0.10).
const CONTRIB_EMISSION_SHARE = 0.9;
const TREASURY_EMISSION_SHARE = 0.1;

const fmtUsd = (n: number): string => {
  if (n < 1) return '<$1';
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
};

const combinedScore = (m: MinerEvaluation): number =>
  parseNumber(m.totalScore) + parseNumber(m.issueDiscoveryScore);

type Composition = Record<CohortKey, number>;

const EARNING_COHORTS: ReadonlySet<CohortKey> = new Set([
  'dual',
  'ossOnly',
  'discoveryOnly',
]);

interface NetworkSummary {
  total: number;
  dailyPool: number;
  earnerCount: number;
  composition: Composition;
}

interface EarnerLite {
  githubId: string;
  username: string;
  usdPerDay: number;
}

interface PodiumRow {
  githubId: string;
  username: string;
  combinedScore: number;
  usdPerDay: number;
}

const deriveSummary = (miners: MinerEvaluation[]): NetworkSummary => {
  const composition: Composition = COHORT_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Composition,
  );
  let dailyPool = 0;
  let earnerCount = 0;
  for (const m of miners) {
    const cohort = cohortOf(m);
    composition[cohort] += 1;
    if (EARNING_COHORTS.has(cohort)) {
      const usd = parseNumber(m.usdPerDay);
      if (usd > 0) {
        dailyPool += usd;
        earnerCount += 1;
      }
    }
  }
  return { total: miners.length, dailyPool, earnerCount, composition };
};

const deriveTopEarners = (miners: MinerEvaluation[], n: number): EarnerLite[] =>
  [...miners]
    .filter((m) => parseNumber(m.usdPerDay) > 0 && isAnyEligibleNow(m))
    .sort((a, b) => parseNumber(b.usdPerDay) - parseNumber(a.usdPerDay))
    .slice(0, n)
    .map((m) => ({
      githubId: m.githubId,
      username: m.githubUsername ?? `uid-${m.uid}`,
      usdPerDay: parseNumber(m.usdPerDay),
    }));

const derivePodium = (miners: MinerEvaluation[]): PodiumRow[] =>
  [...miners]
    .filter((m) => combinedScore(m) > 0)
    .sort((a, b) => combinedScore(b) - combinedScore(a))
    .slice(0, 3)
    .map((m) => ({
      githubId: m.githubId,
      username: m.githubUsername ?? `uid-${m.uid}`,
      combinedScore: combinedScore(m),
      usdPerDay: parseNumber(m.usdPerDay),
    }));

const ZoneTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({
  icon,
  label,
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
    <Box sx={{ color: alpha('#fff', 0.4), display: 'flex' }}>{icon}</Box>
    <Typography variant="statLabel">{label}</Typography>
  </Box>
);

type ZonePosition = 1 | 2 | 3 | 4;

const Zone: React.FC<{
  children: React.ReactNode;
  position: ZonePosition;
  sx?: object;
}> = ({ children, position, sx }) => {
  const isRightEdge = {
    xs: true,
    sm: position === 2 || position === 4,
    lg: position === 4,
  };
  const isBottomEdge = {
    xs: position === 4,
    sm: position === 3 || position === 4,
    lg: true,
  };
  return (
    <Box
      sx={(t) => ({
        px: { xs: 2.25, sm: 3 },
        py: { xs: 2, sm: 2.25 },
        borderRight: {
          xs: 'none',
          sm: isRightEdge.sm ? 'none' : `1px solid ${t.palette.border.light}`,
          lg: isRightEdge.lg ? 'none' : `1px solid ${t.palette.border.light}`,
        },
        borderBottom: {
          xs: isBottomEdge.xs ? 'none' : `1px solid ${t.palette.border.light}`,
          sm: isBottomEdge.sm ? 'none' : `1px solid ${t.palette.border.light}`,
          lg: 'none',
        },
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        ...sx,
      })}
    >
      {children}
    </Box>
  );
};

const fmtPrice = (n: number): string => {
  if (n <= 0) return '—';
  if (n >= 100) return `$${n.toFixed(2)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
};

const TokenTickerRow: React.FC<{
  symbol: string;
  symbolColor: string;
  tip: string;
  price: number;
  loading: boolean;
}> = ({ symbol, symbolColor, tip, price, loading }) => (
  <Tooltip title={tip} arrow placement="top" slotProps={tooltipSlotProps}>
    <Box
      sx={{
        display: 'inline-grid',
        gridTemplateColumns: '32px auto',
        alignItems: 'baseline',
        columnGap: '6px',
        cursor: 'help',
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: 'inherit',
          fontSize: '0.62rem',
          fontWeight: 700,
          color: symbolColor,
          letterSpacing: '0.3px',
          textAlign: 'left',
        }}
      >
        {symbol}
      </Typography>
      <Typography
        component="span"
        sx={{
          fontFamily: 'inherit',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: loading ? alpha('#fff', 0.35) : 'text.primary',
          letterSpacing: '-0.01em',
          lineHeight: 1.05,
        }}
      >
        {loading ? '—' : fmtPrice(price)}
      </Typography>
    </Box>
  </Tooltip>
);

const TokenTicker: React.FC<{
  taoPrice: number;
  alphaPrice: number;
  hasPrices: boolean;
}> = ({ taoPrice, alphaPrice, hasPrices }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '4px',
      pt: '4px',
    }}
  >
    <TokenTickerRow
      symbol="TAO"
      symbolColor="#5eead4"
      tip="TAO spot price — drives the USD value of every miner emission."
      price={taoPrice}
      loading={!hasPrices}
    />
    <TokenTickerRow
      symbol="α74"
      symbolColor={STATUS_COLORS.warning}
      tip="Subnet 74 alpha token spot price — the gittensor reward token."
      price={alphaPrice}
      loading={!hasPrices}
    />
  </Box>
);

const EmissionSplitBar: React.FC<{ pool: number }> = ({ pool }) => {
  const contribShare = CONTRIB_EMISSION_SHARE;
  const treasuryShare = TREASURY_EMISSION_SHARE;
  const contribUsd = pool * contribShare;
  const treasuryUsd = pool * treasuryShare;
  const contribColor = STATUS_COLORS.merged;
  const treasuryColor = STATUS_COLORS.info;
  const tooltipBody = (
    <Box sx={{ lineHeight: 1.45, maxWidth: 260 }}>
      <Box sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
        Emission allocation
      </Box>
      <Box sx={{ fontSize: '0.7rem', opacity: 0.82, mt: '4px' }}>
        Of the {fmtUsd(pool)} daily pool, {Math.round(contribShare * 100)}% is
        distributed to miners via OSS + Discovery scoring, and{' '}
        {Math.round(treasuryShare * 100)}% flows to the issues treasury (UID
        111). Allocation is fixed by the validator and applies network-wide.
      </Box>
    </Box>
  );
  return (
    <Tooltip
      title={tooltipBody}
      arrow
      placement="top"
      slotProps={tooltipSlotProps}
    >
      <Box sx={{ mt: 0.85, cursor: 'help' }}>
        <Box
          sx={{
            display: 'flex',
            height: 10,
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${contribShare * 100}%`,
              backgroundColor: contribColor,
            }}
          />
          <Box
            sx={{
              width: `${treasuryShare * 100}%`,
              backgroundColor: treasuryColor,
            }}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            mt: '6px',
            fontSize: '0.66rem',
            fontFamily: '"JetBrains Mono", monospace',
            lineHeight: 1.1,
          }}
        >
          <Box
            sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Box
              component="span"
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: contribColor,
              }}
            />
            <Box
              component="span"
              sx={{ color: alpha('#fff', 0.55), fontWeight: 500 }}
            >
              Miners
            </Box>
            <Box
              component="span"
              sx={{ color: 'text.primary', fontWeight: 700 }}
            >
              {fmtUsd(contribUsd)}
            </Box>
            <Box
              component="span"
              sx={{ color: alpha('#fff', 0.4), fontSize: '0.6rem' }}
            >
              {Math.round(contribShare * 100)}%
            </Box>
          </Box>
          <Box
            sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Box
              component="span"
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: treasuryColor,
              }}
            />
            <Box
              component="span"
              sx={{ color: alpha('#fff', 0.55), fontWeight: 500 }}
            >
              Treasury
            </Box>
            <Box
              component="span"
              sx={{ color: 'text.primary', fontWeight: 700 }}
            >
              {fmtUsd(treasuryUsd)}
            </Box>
            <Box
              component="span"
              sx={{ color: alpha('#fff', 0.4), fontSize: '0.6rem' }}
            >
              {Math.round(treasuryShare * 100)}%
            </Box>
          </Box>
        </Box>
      </Box>
    </Tooltip>
  );
};

const DailyPoolZone: React.FC<{
  pool: number;
  earners: EarnerLite[];
}> = ({ pool, earners }) => {
  const { taoPrice, alphaPrice, hasPrices } = usePrices();
  return (
    <Zone position={1}>
      <ZoneTitle
        icon={<ChartIcon sx={{ fontSize: '0.9rem' }} />}
        label="Daily emissions"
      />
      <Box
        sx={(t) => ({
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          rowGap: 1,
          columnGap: 1.5,
          pb: 0.75,
          borderBottom: `1px dashed ${t.palette.border.light}`,
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography
            sx={{
              fontSize: { xs: '1.85rem', md: '2.2rem' },
              fontWeight: 700,
              lineHeight: 1,
              fontFamily: '"JetBrains Mono", monospace',
              color: pool > 0 ? STATUS_COLORS.success : 'text.primary',
              letterSpacing: '-0.02em',
            }}
          >
            {fmtUsd(pool)}
          </Typography>
          <Typography
            sx={{ fontSize: '0.88rem', color: alpha('#fff', 0.45), ml: 0.25 }}
          >
            /day
          </Typography>
        </Box>
        <TokenTicker
          taoPrice={taoPrice}
          alphaPrice={alphaPrice}
          hasPrices={hasPrices}
        />
      </Box>
      {pool > 0 && <EmissionSplitBar pool={pool} />}
      {earners.length > 0 && (
        <Box sx={{ mt: 'auto', pt: 2 }}>
          <Typography
            sx={{
              fontSize: '0.62rem',
              color: alpha('#fff', 0.4),
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              mb: 0.75,
            }}
          >
            Top earners
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
              pl: '6px',
            }}
          >
            {earners.map((e, idx) => {
              const rank = idx + 1;
              const ringColor =
                rank === 1
                  ? RANK_COLORS.first
                  : rank === 2
                    ? RANK_COLORS.second
                    : rank === 3
                      ? RANK_COLORS.third
                      : null;
              return (
                <Tooltip
                  key={e.githubId}
                  title={`#${rank} · ${e.username} · ${fmtUsd(e.usdPerDay)}/day`}
                  placement="top"
                  arrow
                  slotProps={tooltipSlotProps}
                >
                  <LinkBox
                    href={`/miners/details?githubId=${e.githubId}`}
                    aria-label={`${e.username}, ranked ${rank}, ${fmtUsd(e.usdPerDay)} per day`}
                    sx={{
                      display: 'inline-flex',
                      ml: '-6px',
                      borderRadius: '50%',
                      transition: 'transform 0.15s, z-index 0s',
                      position: 'relative',
                      zIndex: earners.length - idx,
                      '&:hover': {
                        transform: 'translateY(-2px) scale(1.08)',
                        zIndex: earners.length + 1,
                      },
                    }}
                  >
                    <Avatar
                      src={getRepositoryOwnerAvatarSrc(e.username)}
                      alt={e.username}
                      sx={(t) => ({
                        width: 28,
                        height: 28,
                        fontSize: '0.68rem',
                        border: `2px solid ${
                          ringColor ?? t.palette.background.paper
                        }`,
                        boxShadow: ringColor
                          ? `0 0 0 1px ${alpha(ringColor, 0.4)}`
                          : `0 0 0 1px ${t.palette.border.medium}`,
                      })}
                    />
                  </LinkBox>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      )}
    </Zone>
  );
};

interface Segment {
  key: CohortKey;
  label: string;
  color: string;
  count: number;
}

const CompositionZone: React.FC<{
  summary: NetworkSummary;
  position: ZonePosition;
  selectedCohort: CohortKey | null;
  onSelectCohort?: (cohort: CohortKey) => void;
}> = ({ summary, position, selectedCohort, onSelectCohort }) => {
  const segments: Segment[] = [
    {
      key: 'dual',
      label: COHORT_LABELS.dual,
      color: COHORT_COLORS.dual,
      count: summary.composition.dual,
    },
    {
      key: 'ossOnly',
      label: COHORT_LABELS.ossOnly,
      color: COHORT_COLORS.ossOnly,
      count: summary.composition.ossOnly,
    },
    {
      key: 'discoveryOnly',
      label: COHORT_LABELS.discoveryOnly,
      color: COHORT_COLORS.discoveryOnly,
      count: summary.composition.discoveryOnly,
    },
    {
      key: 'activeOnly',
      label: COHORT_LABELS.activeOnly,
      color: COHORT_COLORS.activeOnly,
      count: summary.composition.activeOnly,
    },
    {
      key: 'inactive',
      label: COHORT_LABELS.inactive,
      color: COHORT_COLORS.inactive,
      count: summary.composition.inactive,
    },
  ];
  const total = summary.total || 1;
  const isInteractive = !!onSelectCohort;

  const segmentTooltip = (s: Segment) => {
    const isActive = selectedCohort === s.key;
    const isClickable = isInteractive && s.count > 0;
    return (
      <Box sx={{ lineHeight: 1.45, maxWidth: 260 }}>
        <Box sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
          {s.label} · {s.count.toLocaleString()} miner
          {s.count === 1 ? '' : 's'}
        </Box>
        <Box sx={{ fontSize: '0.7rem', opacity: 0.82, mt: '2px' }}>
          {COHORT_DESCRIPTIONS[s.key]}
        </Box>
        {isClickable && (
          <Box
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              mt: '4px',
              color: isActive
                ? TOOLTIP_TONE_COLORS.negative
                : TOOLTIP_TONE_COLORS.positive,
            }}
          >
            →{' '}
            {isActive
              ? 'Click to clear the cohort filter'
              : 'Click to filter the table to this cohort'}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Zone position={position}>
      <ZoneTitle
        icon={<CompositionIcon sx={{ fontSize: '0.9rem' }} />}
        label="Eligibility mix"
      />
      <Box
        sx={{
          display: 'flex',
          height: 9,
          borderRadius: 999,
          overflow: 'hidden',
          mb: 1.25,
        }}
      >
        {segments.map((s) => {
          if (s.count === 0) return null;
          const widthPct = (s.count / total) * 100;
          const isActive = selectedCohort === s.key;
          const dimmed = selectedCohort !== null && !isActive;
          const handle =
            isInteractive && s.count > 0
              ? () => onSelectCohort!(s.key)
              : undefined;
          return (
            <Tooltip
              key={s.key}
              title={segmentTooltip(s)}
              arrow
              placement="top"
              slotProps={tooltipSlotProps}
            >
              <Box
                component={handle ? 'button' : 'div'}
                type={handle ? 'button' : undefined}
                onClick={handle}
                aria-pressed={handle ? isActive : undefined}
                aria-label={
                  handle
                    ? isActive
                      ? `Clear ${s.label} cohort filter`
                      : `Filter to ${s.label} cohort`
                    : undefined
                }
                sx={{
                  width: `${widthPct}%`,
                  backgroundColor: s.color,
                  border: 'none',
                  padding: 0,
                  cursor: handle ? 'pointer' : 'help',
                  opacity: dimmed ? 0.35 : 1,
                  boxShadow: isActive
                    ? `inset 0 0 0 2px ${alpha('#fff', 0.85)}`
                    : 'none',
                  transition: 'opacity 0.15s, box-shadow 0.15s',
                  '&:hover': handle
                    ? {
                        opacity: 1,
                        boxShadow: isActive
                          ? `inset 0 0 0 2px ${alpha('#fff', 0.95)}`
                          : `inset 0 0 0 1px ${alpha('#fff', 0.55)}`,
                      }
                    : { opacity: dimmed ? 0.45 : 0.85 },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          mt: 'auto',
          flexGrow: 1,
          justifyContent: 'flex-end',
        }}
      >
        {segments.map((s) => {
          const isActive = selectedCohort === s.key;
          const dimmed = selectedCohort !== null && !isActive;
          const handle =
            isInteractive && s.count > 0
              ? () => onSelectCohort!(s.key)
              : undefined;
          return (
            <Tooltip
              key={s.key}
              title={segmentTooltip(s)}
              arrow
              placement="left"
              slotProps={tooltipSlotProps}
            >
              <Box
                component={handle ? 'button' : 'div'}
                type={handle ? 'button' : undefined}
                onClick={handle}
                aria-pressed={handle ? isActive : undefined}
                sx={(t) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  minWidth: 0,
                  width: '100%',
                  textAlign: 'left',
                  background: isActive ? alpha(s.color, 0.16) : 'transparent',
                  border: `1px solid ${
                    isActive ? alpha(s.color, 0.55) : 'transparent'
                  }`,
                  borderRadius: 1,
                  px: '6px',
                  py: '3px',
                  ml: '-6px',
                  cursor: handle ? 'pointer' : 'default',
                  font: 'inherit',
                  color: 'inherit',
                  opacity: dimmed ? 0.55 : 1,
                  transition:
                    'background-color 0.15s, border-color 0.15s, opacity 0.15s',
                  '&:hover': handle
                    ? {
                        backgroundColor: isActive
                          ? alpha(s.color, 0.22)
                          : alpha(t.palette.text.primary, 0.04),
                      }
                    : undefined,
                })}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: s.color,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: isActive ? 'text.primary' : alpha('#fff', 0.6),
                    fontWeight: isActive ? 600 : 400,
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: s.count === 0 ? alpha('#fff', 0.3) : 'text.primary',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {s.count}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Zone>
  );
};

const PODIUM_COLOR = [
  RANK_COLORS.first,
  RANK_COLORS.second,
  RANK_COLORS.third,
] as const;
const PODIUM_MEDAL = ['🥇', '🥈', '🥉'] as const;

const PodiumZone: React.FC<{
  rows: PodiumRow[];
  position: ZonePosition;
}> = ({ rows, position }) => (
  <Zone position={position}>
    <ZoneTitle
      icon={<TrophyIcon sx={{ fontSize: '0.9rem' }} />}
      label="Top scorers"
    />
    {rows.length === 0 ? (
      <Typography sx={{ fontSize: '0.78rem', color: alpha('#fff', 0.45) }}>
        No scored miners yet
      </Typography>
    ) : (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          flexGrow: 1,
          justifyContent: 'space-between',
        }}
      >
        {rows.map((row, idx) => {
          const color = PODIUM_COLOR[idx];
          const medal = PODIUM_MEDAL[idx];
          return (
            <LinkBox
              key={row.githubId}
              href={`/miners/details?githubId=${row.githubId}`}
              sx={(t) => ({
                display: 'grid',
                gridTemplateColumns: '3px auto 28px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 1.1,
                px: 0,
                py: 0.55,
                color: 'inherit',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'translateX(2px)' },
                '&:hover .podium-name': { color: t.palette.text.primary },
                '&:hover .podium-rail': {
                  boxShadow: `0 0 0 1px ${alpha(color, 0.4)}`,
                },
              })}
            >
              <Box
                className="podium-rail"
                aria-hidden
                sx={{
                  width: 3,
                  height: 28,
                  borderRadius: 999,
                  backgroundColor: color,
                  transition: 'box-shadow 0.15s',
                }}
              />
              <Typography
                aria-hidden
                sx={{
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  textAlign: 'center',
                  minWidth: 22,
                }}
              >
                {medal}
              </Typography>
              <Avatar
                src={getRepositoryOwnerAvatarSrc(row.username)}
                alt={row.username}
                sx={(t) => ({
                  width: 28,
                  height: 28,
                  border: `1px solid ${t.palette.border.medium}`,
                })}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  className="podium-name"
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: alpha('#fff', 0.9),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {row.username}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    color:
                      row.usdPerDay > 0
                        ? alpha('#fff', 0.55)
                        : alpha('#fff', 0.35),
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {row.usdPerDay > 0
                    ? `${fmtUsd(row.usdPerDay)}/day`
                    : 'no $ yet'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {row.combinedScore.toFixed(0)}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.55rem',
                    color: alpha('#fff', 0.4),
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    mt: '2px',
                  }}
                >
                  score
                </Typography>
              </Box>
            </LinkBox>
          );
        })}
      </Box>
    )}
  </Zone>
);

const RepoTooltipContent: React.FC<{
  name: string;
  count: number;
  minerCount: number;
  lookbackLabel: string;
  action: 'filter' | 'clear' | null;
}> = ({ name, count, minerCount, lookbackLabel, action }) => {
  const prsPerMiner = minerCount > 0 ? count / minerCount : 0;
  const densityLabel =
    minerCount > 0
      ? ` · ≈${prsPerMiner.toFixed(prsPerMiner >= 10 ? 0 : 1)}/miner`
      : '';
  return (
    <Box sx={{ lineHeight: 1.45 }}>
      <Box sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{name}</Box>
      <Box sx={{ fontSize: '0.72rem', opacity: 0.85 }}>
        {count.toLocaleString()} merged PR{count === 1 ? '' : 's'} by{' '}
        {minerCount.toLocaleString()} miner{minerCount === 1 ? '' : 's'}
        {densityLabel}
      </Box>
      <Box sx={{ fontSize: '0.7rem', opacity: 0.6, mt: '2px' }}>
        Over the {lookbackLabel}
      </Box>
      {action && (
        <Box
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            mt: '4px',
            color:
              action === 'clear'
                ? TOOLTIP_TONE_COLORS.negative
                : TOOLTIP_TONE_COLORS.positive,
          }}
        >
          {action === 'clear'
            ? '→ Click to clear the table filter'
            : '→ Click to filter the table to this repo'}
        </Box>
      )}
    </Box>
  );
};

const HotRepoZone: React.FC<{
  repos: NetworkRepoActivity[];
  selectedRepo: string | null;
  onSelectRepo?: (repo: string) => void;
  position: ZonePosition;
}> = ({ repos, selectedRepo, onSelectRepo, position }) => {
  const lookbackLabel = 'last 30d';
  if (repos.length === 0) {
    return (
      <Zone position={position}>
        <ZoneTitle
          icon={<HotRepoIcon sx={{ fontSize: '0.9rem' }} />}
          label={`Hottest repos · ${lookbackLabel}`}
        />
        <Typography sx={{ fontSize: '0.78rem', color: alpha('#fff', 0.45) }}>
          No merged PRs yet in this window
        </Typography>
      </Zone>
    );
  }
  const [hero, ...runnersUp] = repos;
  const heroSlash = hero.name.lastIndexOf('/');
  const heroOwner = heroSlash >= 0 ? hero.name.slice(0, heroSlash) : '';
  const heroShort = heroSlash >= 0 ? hero.name.slice(heroSlash + 1) : hero.name;
  const heroCount = hero.count;
  const isHeroSelected = selectedRepo === hero.name;
  const heroTooltip = (
    <RepoTooltipContent
      name={hero.name}
      count={hero.count}
      minerCount={hero.minerCount}
      lookbackLabel={lookbackLabel}
      action={onSelectRepo ? (isHeroSelected ? 'clear' : 'filter') : null}
    />
  );
  const handleHeroClick = onSelectRepo
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onSelectRepo(hero.name);
      }
    : undefined;
  return (
    <Zone position={position}>
      <ZoneTitle
        icon={<HotRepoIcon sx={{ fontSize: '0.9rem' }} />}
        label={`Hottest repos · ${lookbackLabel}`}
      />
      <Tooltip
        title={heroTooltip}
        arrow
        placement="right"
        slotProps={tooltipSlotProps}
      >
        <Box
          component={handleHeroClick ? 'button' : 'div'}
          type={handleHeroClick ? 'button' : undefined}
          onClick={handleHeroClick}
          sx={(t) => ({
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr) auto',
            alignItems: 'center',
            columnGap: 1,
            width: '100%',
            border: 'none',
            borderRadius: 1,
            backgroundColor: isHeroSelected
              ? alpha(t.palette.primary.main, 0.12)
              : 'transparent',
            color: 'inherit',
            textAlign: 'left',
            cursor: handleHeroClick ? 'pointer' : 'default',
            font: 'inherit',
            px: 0.75,
            py: 0.4,
            mb: 0.5,
            transition: 'background-color 0.15s, transform 0.15s',
            '&:hover': handleHeroClick
              ? {
                  backgroundColor: alpha(
                    isHeroSelected ? t.palette.primary.main : '#fff',
                    isHeroSelected ? 0.18 : 0.04,
                  ),
                  transform: 'translateX(2px)',
                }
              : undefined,
            '&:hover .hot-repo-short': {
              color: isHeroSelected
                ? t.palette.primary.main
                : t.palette.text.primary,
            },
          })}
        >
          <Avatar
            src={getRepositoryOwnerAvatarSrc(heroOwner || hero.name)}
            alt={heroOwner || hero.name}
            sx={(t) => ({
              width: 28,
              height: 28,
              border: `1px solid ${t.palette.border.medium}`,
              backgroundColor: t.palette.background.paper,
            })}
          />
          <Typography
            className="hot-repo-short"
            sx={{
              fontSize: '0.95rem',
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              color: isHeroSelected ? 'primary.main' : 'text.primary',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              transition: 'color 0.15s',
            }}
          >
            {heroShort}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <Typography
              sx={(t) => ({
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: isHeroSelected
                  ? t.palette.primary.main
                  : STATUS_COLORS.merged,
                letterSpacing: '-0.03em',
                lineHeight: 1,
              })}
            >
              {heroCount.toLocaleString()}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.6rem',
                color: alpha('#fff', 0.45),
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              PR{heroCount === 1 ? '' : 's'}
            </Typography>
          </Box>
        </Box>
      </Tooltip>
      {runnersUp.length > 0 && (
        <Box sx={{ mt: 'auto', pt: 1.75 }}>
          <Typography
            sx={{
              fontSize: '0.62rem',
              color: alpha('#fff', 0.4),
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              mb: 0.75,
            }}
          >
            Runners-up
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {runnersUp.slice(0, 3).map((r) => {
              const slash = r.name.lastIndexOf('/');
              const short = slash >= 0 ? r.name.slice(slash + 1) : r.name;
              const owner = slash >= 0 ? r.name.slice(0, slash) : r.name;
              const isSelected = selectedRepo === r.name;
              const handle = onSelectRepo
                ? (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectRepo(r.name);
                  }
                : undefined;
              return (
                <Tooltip
                  key={r.name}
                  title={
                    <RepoTooltipContent
                      name={r.name}
                      count={r.count}
                      minerCount={r.minerCount}
                      lookbackLabel={lookbackLabel}
                      action={
                        onSelectRepo ? (isSelected ? 'clear' : 'filter') : null
                      }
                    />
                  }
                  arrow
                  placement="right"
                  slotProps={tooltipSlotProps}
                >
                  <Box
                    component={onSelectRepo ? 'button' : 'div'}
                    type={onSelectRepo ? 'button' : undefined}
                    onClick={handle}
                    sx={(t) => ({
                      display: 'grid',
                      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                      alignItems: 'center',
                      gap: 1,
                      px: 0.75,
                      py: 0.4,
                      border: 'none',
                      borderRadius: 1,
                      backgroundColor: isSelected
                        ? alpha(t.palette.primary.main, 0.12)
                        : 'transparent',
                      color: 'inherit',
                      cursor: onSelectRepo ? 'pointer' : 'default',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background-color 0.15s',
                      '&:hover': onSelectRepo
                        ? { backgroundColor: alpha('#fff', 0.04) }
                        : undefined,
                    })}
                  >
                    <Avatar
                      src={getRepositoryOwnerAvatarSrc(owner)}
                      alt={owner}
                      sx={(t) => ({
                        width: 18,
                        height: 18,
                        border: `1px solid ${t.palette.border.light}`,
                        backgroundColor: t.palette.background.paper,
                      })}
                    />
                    <Typography
                      sx={{
                        fontSize: '0.74rem',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: isSelected
                          ? 'primary.main'
                          : alpha('#fff', 0.78),
                        fontWeight: isSelected ? 700 : 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {short}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 700,
                        color: isSelected
                          ? 'primary.main'
                          : alpha('#fff', 0.55),
                      }}
                    >
                      {r.count}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      )}
    </Zone>
  );
};

const LeaderboardInsights: React.FC<LeaderboardInsightsProps> = ({
  miners,
  isLoading,
  selectedRepo = null,
  onSelectRepo,
  selectedCohort = null,
  onSelectCohort,
}) => {
  const list = useMemo(() => miners ?? [], [miners]);
  // React Query dedupes the underlying /dash/commits fetch with the table.
  const { network } = useMinerActivityIndex({ lookbackDays: 30 });

  const summary = useMemo(() => deriveSummary(list), [list]);
  const earners = useMemo(() => deriveTopEarners(list, 8), [list]);
  const podium = useMemo(() => derivePodium(list), [list]);

  if (isLoading && list.length === 0) {
    return (
      <Card sx={{ p: 2.5 }}>
        <Skeleton variant="text" width="30%" />
        <Skeleton
          variant="rectangular"
          height={160}
          sx={{ mt: 1, borderRadius: 1 }}
        />
      </Card>
    );
  }

  return (
    <Card
      sx={(t) => ({
        p: 0,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: t.palette.background.paper,
        backgroundImage: `
          radial-gradient(ellipse 120% 70% at 50% -10%, ${alpha(
            t.palette.text.primary,
            0.07,
          )} 0%, ${alpha(t.palette.text.primary, 0)} 55%),
          linear-gradient(180deg, ${alpha('#000', 0)} 60%, ${alpha(
            '#000',
            0.3,
          )} 100%)
        `,
        borderColor: t.palette.border.medium,
        boxShadow: [
          `inset 0 1px 0 ${alpha(t.palette.text.primary, 0.09)}`,
          `inset 0 -1px 0 ${alpha('#000', 0.4)}`,
          `0 1px 0 ${alpha(t.palette.text.primary, 0.02)}`,
          `0 12px 36px -8px ${alpha('#000', 0.6)}`,
          `0 4px 12px -4px ${alpha('#000', 0.4)}`,
        ].join(', '),
      })}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: '1.05fr 1.05fr 1fr 1fr',
          },
        }}
      >
        <DailyPoolZone pool={summary.dailyPool} earners={earners} />
        <CompositionZone
          summary={summary}
          position={2}
          selectedCohort={selectedCohort}
          onSelectCohort={onSelectCohort}
        />
        <PodiumZone rows={podium} position={3} />
        <HotRepoZone
          repos={network.topRepos}
          selectedRepo={selectedRepo}
          onSelectRepo={onSelectRepo}
          position={4}
        />
      </Box>
    </Card>
  );
};

export default LeaderboardInsights;

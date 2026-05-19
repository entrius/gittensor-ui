import React from 'react';
import { Box, Card, Typography, Avatar, Tooltip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import { useMinerGithubData, useMinerPRs } from '../../api';
import { CHART_COLORS, RANK_COLORS, STATUS_COLORS } from '../../theme';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
import { formatUsdPerDay } from '../../utils/format';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import { WatchlistButton } from '../common';
import { type MinerStats, type LeaderboardVariant, FONTS } from './types';

interface MinerCardProps {
  miner: MinerStats;
  href: string;
  linkState?: Record<string, unknown>;
  variant?: LeaderboardVariant;
  showDualEligibilityBadges?: boolean;
}

const INACTIVE_OPACITY = 0.42;

const CHART_SEGMENT_COLORS = [
  CHART_COLORS.merged,
  CHART_COLORS.open,
  CHART_COLORS.closed,
];
const CHART_INACTIVE_RATIOS = [2 / 3, 1, 1 / 2];

const TABULAR_NUMS = '"tnum" 1, "ss01" 1';

interface Segment {
  label: string;
  value: number;
}

const getPrSegments = (miner: MinerStats): Segment[] => [
  { label: 'Merged', value: miner.totalMergedPrs ?? 0 },
  { label: 'Open', value: miner.totalOpenPrs ?? 0 },
  { label: 'Closed', value: miner.totalClosedPrs ?? 0 },
];

const getIssueSegments = (miner: MinerStats): Segment[] => [
  { label: 'Solved', value: miner.totalSolvedIssues ?? 0 },
  { label: 'Open', value: miner.totalOpenIssues ?? 0 },
  { label: 'Closed', value: miner.totalClosedIssues ?? 0 },
];

const getSegments = (
  miner: MinerStats,
  variant: LeaderboardVariant,
): Segment[] =>
  variant === 'discoveries' ? getIssueSegments(miner) : getPrSegments(miner);

const formatRank = (rank: number | undefined): string =>
  rank ? `#${String(rank).padStart(2, '0')}` : '#—';

const formatScore = (score: number): string =>
  Number.isFinite(score)
    ? score.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

/* ═══════════════════════════════════════════════════════════════════ */

export const MinerCard: React.FC<MinerCardProps> = ({
  miner,
  href,
  linkState,
  variant = 'oss',
  showDualEligibilityBadges = false,
}) => {
  const linkProps = useLinkBehavior(href, { state: linkState });
  const isNumericId = (value?: string) => !value || /^\d+$/.test(value);
  const shouldFetch = !!miner.githubId && isNumericId(miner.author);
  const { data: githubData } = useMinerGithubData(miner.githubId, shouldFetch);
  const { data: prs } = useMinerPRs(miner.githubId, shouldFetch);

  const username =
    githubData?.login ||
    prs?.[0]?.author ||
    (!isNumericId(miner.author) ? miner.author : miner.githubId) ||
    miner.githubId ||
    '';
  const avatarSrc = githubData?.avatarUrl || getGithubAvatarSrc(username);

  const credibilityPercent = (miner.credibility ?? 0) * 100;
  const issueCredPercent = (miner.issueCredibility ?? 0) * 100;
  const ossEligible = miner.ossIsEligible ?? miner.isEligible ?? false;
  const discoveriesEligible =
    miner.discoveriesIsEligible ??
    miner.isIssueEligible ??
    (variant === 'discoveries' ? (miner.isEligible ?? false) : false);
  const isWatchlist = variant === 'watchlist';
  const isDiscoveries = variant === 'discoveries';
  const baseEligible = miner.isEligible ?? false;
  const isEligible = isWatchlist
    ? ossEligible || discoveriesEligible || baseEligible
    : showDualEligibilityBadges
      ? ossEligible || discoveriesEligible
      : baseEligible;

  const rank = miner.rank;
  const isTopRank = !!rank && rank > 0 && rank <= 3;
  const rankColor =
    rank === 1
      ? RANK_COLORS.first
      : rank === 2
        ? RANK_COLORS.second
        : rank === 3
          ? RANK_COLORS.third
          : undefined;
  const segments = getSegments(miner, variant);

  // Rank is a network-leaderboard concept — the watchlist suppresses it
  // entirely (pill, accent border, and the top-3 left hairline).
  const showRank = !isWatchlist;
  const accentColor = showRank ? rankColor : undefined;

  return (
    <Card
      component="a"
      {...linkProps}
      sx={(theme) => ({
        ...linkResetSx,
        position: 'relative',
        p: 0,
        backgroundColor: 'transparent',
        border: `1px solid ${accentColor ? alpha(accentColor, 0.35) : theme.palette.border.medium}`,
        borderRadius: 1.5,
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition:
          'background-color 0.22s ease, border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.status.merged, 0.04),
          borderColor: alpha(theme.palette.status.merged, 0.28),
          transform: 'scale(1.025)',
          boxShadow: `0 8px 24px -6px ${alpha(theme.palette.common.black, 0.18)}`,
        },
        '&:hover .miner-username': {
          textDecoration: 'underline',
          textDecorationColor: alpha(theme.palette.status.merged, 0.55),
          textDecorationThickness: '1px',
          textUnderlineOffset: '3px',
        },
        /* hairline left accent for top-3 */
        '&::before': accentColor
          ? {
              content: '""',
              position: 'absolute',
              top: 16,
              bottom: 16,
              left: 0,
              width: '1.5px',
              backgroundColor: accentColor,
              borderRadius: '0 1.5px 1.5px 0',
              pointerEvents: 'none',
              zIndex: 2,
            }
          : undefined,
        '& > *': {
          position: 'relative',
          zIndex: 1,
        },
      })}
      elevation={0}
    >
      {/* ─── HEADER STRIP ─────────────────────────────────────── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: showRank
            ? 'auto 1fr auto auto'
            : 'auto 1fr auto',
          alignItems: 'center',
          columnGap: 1.25,
          px: { xs: 1.75, sm: 2 },
          py: 1.5,
        }}
      >
        <Avatar
          src={avatarSrc}
          alt={username}
          sx={(theme) => ({
            width: 38,
            height: 38,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundColor: theme.palette.surface.subtle,
            filter: isEligible ? 'none' : 'grayscale(100%)',
          })}
        />

        <Box
          sx={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.4,
          }}
        >
          <Typography
            className="miner-username"
            sx={(theme) => ({
              fontFamily: FONTS.mono,
              fontSize: '0.95rem',
              fontWeight: 600,
              color: theme.palette.text.primary,
              opacity: isEligible ? 1 : INACTIVE_OPACITY,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.005em',
              lineHeight: 1.2,
              transition: 'text-decoration-color 0.18s ease',
            })}
          >
            {username}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: showDualEligibilityBadges ? 1.5 : 0.85,
            }}
          >
            {showDualEligibilityBadges ? (
              <>
                <EligibilityLabel label="OSS" eligible={ossEligible} />
                <EligibilityLabel
                  label="Issues"
                  eligible={discoveriesEligible}
                />
              </>
            ) : (
              <EligibilityLabel
                label={isEligible ? 'Eligible' : 'Ineligible'}
                eligible={isEligible}
              />
            )}
          </Box>
        </Box>

        {/* Rank pill — leaderboard / per-repo only; hidden on the watchlist */}
        {showRank && (
          <Box
            sx={(theme) => ({
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 38,
              height: 24,
              px: 0.75,
              borderRadius: 0.85,
              border: `1px solid ${
                isTopRank
                  ? alpha(theme.palette.text.primary, 0.32)
                  : theme.palette.border.light
              }`,
              backgroundColor: isTopRank
                ? alpha(theme.palette.text.primary, 0.04)
                : 'transparent',
            })}
          >
            <Typography
              sx={(theme) => ({
                fontFamily: FONTS.mono,
                fontSize: '0.72rem',
                fontWeight: isTopRank ? 700 : 500,
                color: isTopRank
                  ? theme.palette.text.primary
                  : theme.palette.text.secondary,
                fontFeatureSettings: TABULAR_NUMS,
                lineHeight: 1,
              })}
            >
              {formatRank(rank)}
            </Typography>
          </Box>
        )}

        <Box>
          {miner.githubId && (
            <WatchlistButton
              category="miners"
              itemKey={miner.githubId}
              size="small"
            />
          )}
        </Box>
      </Box>

      {/* ─── HERO: TOTAL SCORE / EARNINGS │ CREDIBILITY ──────── */}
      <Box
        sx={(theme) => ({
          display: 'grid',
          gridTemplateColumns: isWatchlist ? '1fr' : '1fr auto',
          alignItems: 'stretch',
          borderTop: `1px solid ${theme.palette.border.light}`,
          borderBottom: `1px solid ${theme.palette.border.light}`,
          backgroundColor: alpha(theme.palette.text.primary, 0.012),
        })}
      >
        {/* Hero metric — Total Score for per-repo / leaderboard cards;
            Earnings for the watchlist, where it is a meaningful miner-wide
            figure rather than an ambiguous per-repo one. */}
        <Box
          sx={{
            px: { xs: 1.75, sm: 2 },
            py: 1.5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          {isWatchlist ? (
            <>
              <Overline>Earnings</Overline>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 0.45,
                  mt: 0.7,
                }}
              >
                <Typography
                  sx={(theme) => ({
                    fontFamily: FONTS.mono,
                    fontSize: '1.65rem',
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    opacity: isEligible ? 1 : INACTIVE_OPACITY,
                    lineHeight: 1,
                    letterSpacing: '-0.028em',
                    fontFeatureSettings: TABULAR_NUMS,
                  })}
                >
                  {formatUsdPerDay(miner.usdPerDay, { includePeriod: false })}
                </Typography>
                <Typography
                  sx={(theme) => ({
                    fontFamily: FONTS.mono,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    color: theme.palette.text.secondary,
                    opacity: isEligible ? 1 : INACTIVE_OPACITY,
                  })}
                >
                  /day
                </Typography>
              </Box>
              <Typography
                sx={(theme) => ({
                  fontFamily: FONTS.mono,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  color: theme.palette.text.tertiary,
                  opacity: isEligible ? 1 : INACTIVE_OPACITY,
                  mt: 0.45,
                  fontFeatureSettings: TABULAR_NUMS,
                })}
              >
                ~$
                {((miner.usdPerDay || 0) * 30)
                  .toFixed(0)
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                /mo
              </Typography>
            </>
          ) : (
            <>
              <Overline>Total Score</Overline>
              <Typography
                sx={(theme) => ({
                  fontFamily: FONTS.mono,
                  fontSize: '1.65rem',
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  opacity: isEligible ? 1 : INACTIVE_OPACITY,
                  lineHeight: 1,
                  letterSpacing: '-0.028em',
                  fontFeatureSettings: TABULAR_NUMS,
                  mt: 0.7,
                })}
              >
                {formatScore(Number(miner.totalScore))}
              </Typography>
            </>
          )}
        </Box>

        {/* Credibility — leaderboard / per-repo variants only. The watchlist
            omits it: credibility is per-repository, not a global figure. */}
        {!isWatchlist && (
          <Box
            sx={(theme) => ({
              px: { xs: 1.75, sm: 2 },
              py: 1.5,
              borderLeft: `1px solid ${theme.palette.border.light}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.7,
              minWidth: 96,
            })}
          >
            <Overline>Credibility</Overline>
            <CredDonut
              segments={segments}
              percent={isDiscoveries ? issueCredPercent : credibilityPercent}
              isEligible={isEligible}
              size={56}
            />
          </Box>
        )}
      </Box>

      {/* ─── ACTIVITY ROW(S) ───────────────────────────────── */}
      <Box>
        <ActivityRow
          activityLabel={isDiscoveries ? 'Issue activity' : 'PR activity'}
          segments={segments}
          scoreLabel={isWatchlist ? 'OSS' : 'Earnings'}
          scoreValue={Number(miner.totalScore)}
          scoreDisplay={
            isWatchlist
              ? undefined
              : formatUsdPerDay(miner.usdPerDay, { includePeriod: true })
          }
          isEligible={isDiscoveries ? discoveriesEligible : ossEligible}
          hideScore={isWatchlist}
        />

        {variant === 'watchlist' && (
          <ActivityRow
            activityLabel="Issue activity"
            segments={getIssueSegments(miner)}
            scoreLabel="Discovery"
            scoreValue={Number(miner.issueDiscoveryScore ?? 0)}
            isEligible={discoveriesEligible}
            divider
            hideScore
          />
        )}
      </Box>
    </Card>
  );
};

/* ── Eligibility marker — dot + word ──────────────────────────── */

interface EligibilityLabelProps {
  label: string;
  eligible: boolean;
}

const EligibilityLabel: React.FC<EligibilityLabelProps> = ({
  label,
  eligible,
}) => (
  <Box
    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}
  >
    <Box
      sx={(theme) => ({
        width: 5,
        height: 5,
        borderRadius: '50%',
        backgroundColor: eligible
          ? theme.palette.status.merged
          : alpha(theme.palette.text.tertiary, 0.6),
        flexShrink: 0,
      })}
    />
    <Typography
      sx={(theme) => ({
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        fontWeight: 500,
        color: eligible
          ? theme.palette.text.primary
          : theme.palette.text.tertiary,
        letterSpacing: '0.01em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      })}
    >
      {label}
    </Typography>
  </Box>
);

/* ── Activity row: inline stats + score on the right ─────────── */

interface ActivityRowProps {
  activityLabel: string;
  segments: Segment[];
  scoreLabel: string;
  scoreValue: number;
  /** Pre-formatted value; overrides `formatScore(scoreValue)` when set. */
  scoreDisplay?: string;
  isEligible: boolean;
  divider?: boolean;
  /** Watchlist rows hide the score column — only the activity counts show. */
  hideScore?: boolean;
}

const ActivityRow: React.FC<ActivityRowProps> = ({
  activityLabel,
  segments,
  scoreLabel,
  scoreValue,
  scoreDisplay,
  isEligible,
  divider,
  hideScore,
}) => {
  const muiTheme = useTheme();
  const inactiveColor = alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY);

  const cellColor = (i: number): string =>
    isEligible
      ? i === 0
        ? STATUS_COLORS.merged
        : i === 1
          ? alpha(muiTheme.palette.text.primary, 0.86)
          : muiTheme.palette.status.closed
      : inactiveColor;

  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: hideScore ? '1fr' : '1fr auto',
        alignItems: 'center',
        columnGap: 2,
        px: { xs: 1.75, sm: 2 },
        py: 1.4,
        borderTop: divider
          ? `1px dashed ${theme.palette.border.subtle}`
          : 'none',
      })}
    >
      <Box sx={{ minWidth: 0 }}>
        <Overline>{activityLabel}</Overline>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            mt: 0.7,
            flexWrap: 'wrap',
          }}
        >
          {segments.map((segment, i) => (
            <InlineStat
              key={segment.label}
              label={segment.label}
              value={segment.value}
              color={cellColor(i)}
              isLast={i === segments.length - 1}
            />
          ))}
        </Box>
      </Box>

      {!hideScore && (
        <Box
          sx={{
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 0.5,
          }}
        >
          <Overline align="right">{scoreLabel}</Overline>
          <Typography
            sx={(theme) => ({
              fontFamily: FONTS.mono,
              fontSize: '1.05rem',
              color: isEligible ? theme.palette.text.primary : inactiveColor,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontFeatureSettings: TABULAR_NUMS,
              lineHeight: 1,
            })}
          >
            {scoreDisplay ?? formatScore(scoreValue)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

/* ── Inline stat: "Merged 142" with subtle separator dot ──────── */

interface InlineStatProps {
  label: string;
  value: number;
  color: string;
  isLast: boolean;
}

const InlineStat: React.FC<InlineStatProps> = ({
  label,
  value,
  color,
  isLast,
}) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}>
    <Typography
      sx={(theme) => ({
        fontFamily: FONTS.mono,
        fontSize: '0.66rem',
        fontWeight: 500,
        color: theme.palette.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      })}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.92rem',
        fontWeight: 700,
        color,
        fontFeatureSettings: TABULAR_NUMS,
        letterSpacing: '-0.012em',
        lineHeight: 1,
      }}
    >
      {value.toLocaleString()}
    </Typography>
    {!isLast && (
      <Typography
        sx={(theme) => ({
          fontFamily: FONTS.mono,
          fontSize: '0.85rem',
          color: alpha(theme.palette.text.tertiary, 0.5),
          ml: 0.5,
          lineHeight: 1,
        })}
      >
        ·
      </Typography>
    )}
  </Box>
);

/* ── Section overline ────────────────────────────────────── */

interface OverlineProps {
  children: React.ReactNode;
  align?: 'left' | 'right';
}

const Overline: React.FC<OverlineProps> = ({ children, align = 'left' }) => (
  <Typography
    sx={(theme) => ({
      fontFamily: FONTS.mono,
      fontSize: '0.58rem',
      fontWeight: 500,
      color: theme.palette.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: '0.16em',
      lineHeight: 1,
      textAlign: align,
    })}
  >
    {children}
  </Typography>
);

/* ── Credibility donut ───────────────────────────────────── */

interface CredDonutProps {
  segments: Segment[];
  percent: number;
  isEligible: boolean;
  caption?: string;
  size?: number;
}

const CredDonut: React.FC<CredDonutProps> = ({
  segments,
  percent,
  isEligible,
  caption,
  size = 48,
}) => {
  const muiTheme = useTheme();
  const segmentTotal = segments.reduce((acc, s) => acc + s.value, 0);

  if (segmentTotal === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Tooltip title="No activity data yet — scores appear after you have PRs or issues in this category.">
          <Box
            sx={{
              position: 'relative',
              width: size,
              height: size,
              borderRadius: '50%',
              border: '1px dashed',
              borderColor: 'border.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'surface.subtle',
            }}
          >
            <Typography
              sx={(theme) => ({
                fontFamily: FONTS.mono,
                fontSize: size <= 48 ? '0.7rem' : '0.8rem',
                fontWeight: 700,
                color: theme.palette.text.tertiary,
              })}
            >
              —
            </Typography>
          </Box>
        </Tooltip>
        {caption && (
          <Typography
            sx={(theme) => ({
              fontFamily: FONTS.mono,
              fontSize: '0.55rem',
              color: theme.palette.status.open,
              textTransform: 'uppercase',
              mt: 0.25,
              letterSpacing: '0.04em',
            })}
          >
            {caption}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        gap: 0.4,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          opacity: isEligible ? 1 : INACTIVE_OPACITY,
        }}
      >
        <ReactECharts
          option={{
            backgroundColor: 'transparent',
            series: [
              {
                type: 'pie',
                radius: ['70%', '94%'],
                silent: true,
                label: { show: false },
                itemStyle: { borderRadius: 1, borderWidth: 0 },
                data: segments.map((segment, i) => ({
                  value: segment.value,
                  itemStyle: {
                    color: isEligible
                      ? CHART_SEGMENT_COLORS[i]
                      : alpha(
                          muiTheme.palette.text.secondary,
                          INACTIVE_OPACITY * CHART_INACTIVE_RATIOS[i],
                        ),
                  },
                })),
              },
            ],
          }}
          style={{ width: '100%', height: '100%' }}
          opts={{ renderer: 'svg' }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={(theme) => ({
              fontFamily: FONTS.mono,
              fontSize: size <= 48 ? '0.66rem' : '0.74rem',
              color: isEligible
                ? theme.palette.text.primary
                : theme.palette.text.tertiary,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              fontFeatureSettings: TABULAR_NUMS,
            })}
          >
            {percent.toFixed(0)}%
          </Typography>
        </Box>
      </Box>
      {caption && (
        <Typography
          sx={(theme) => ({
            fontFamily: FONTS.mono,
            fontSize: '0.55rem',
            fontWeight: 500,
            color: theme.palette.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            lineHeight: 1,
          })}
        >
          {caption}
        </Typography>
      )}
    </Box>
  );
};

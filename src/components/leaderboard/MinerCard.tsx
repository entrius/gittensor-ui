import React from 'react';
import { Box, Card, Typography, Avatar } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import { useMinerGithubData, useMinerPRs } from '../../api';
import {
  getPositiveColor,
  getChartSegmentColors,
} from '../../utils/themeUtils';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
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

const INACTIVE_OPACITY = 0.55;

const CHART_INACTIVE_RATIOS = [2 / 3, 1, 1 / 2];

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

export const MinerCard: React.FC<MinerCardProps> = ({
  miner,
  href,
  linkState,
  variant = 'oss',
  showDualEligibilityBadges = false,
}) => {
  const linkProps = useLinkBehavior(href, { state: linkState });
  const muiTheme = useTheme();
  // Green for positive metrics/charts; purple (status.merged) is only for PR status badges
  const posColor = getPositiveColor(muiTheme);
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

  const segments = getSegments(miner, variant);

  return (
    <Card
      component="a"
      {...linkProps}
      sx={(theme) => ({
        ...linkResetSx,
        p: 1,
        backgroundColor: theme.palette.background.paper,
        backdropFilter: theme.palette.mode === 'dark' ? 'blur(12px)' : 'none',
        border: '1px solid',
        borderColor: isEligible
          ? alpha(posColor, 0.3)
          : theme.palette.border.light,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        position: 'relative',
        boxShadow: isEligible
          ? theme.palette.mode === 'dark'
            ? `0 2px 8px ${alpha(posColor, 0.08)}`
            : '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(26,127,55,0.06)'
          : theme.palette.mode === 'dark'
            ? 'none'
            : '0 1px 3px rgba(0,0,0,0.04)',
        '&:hover': {
          backgroundColor: isEligible
            ? theme.palette.surface.elevated
            : theme.palette.surface.subtle,
          borderColor: isEligible
            ? alpha(posColor, 0.5)
            : theme.palette.border.medium,
          transform: isEligible ? 'translateY(-2px)' : 'translateY(-1px)',
          boxShadow: isEligible
            ? theme.palette.mode === 'dark'
              ? `0 8px 24px -6px ${alpha(posColor, 0.2)}`
              : '0 4px 16px -4px rgba(26,127,55,0.15)'
            : theme.palette.mode === 'dark'
              ? `0 4px 12px ${alpha(theme.palette.common.black, 0.3)}`
              : '0 2px 8px rgba(0,0,0,0.07)',
        },
      })}
      elevation={0}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <Avatar
            src={avatarSrc}
            sx={(theme) => ({
              width: 36,
              height: 36,
              border: '2px solid',
              borderColor: isEligible
                ? alpha(posColor, 0.3)
                : theme.palette.border.light,
              filter: isEligible ? 'none' : 'grayscale(80%)',
              opacity: isEligible ? 1 : 0.7,
              flexShrink: 0,
            })}
          />
          <Box
            sx={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.4,
              overflow: 'hidden',
            }}
          >
            {/* Name + rank on the same line */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              <Typography
                sx={(theme) => ({
                  fontFamily: FONTS.mono,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: isEligible
                    ? theme.palette.text.primary
                    : theme.palette.text.secondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                })}
              >
                {username}
              </Typography>
              <Typography
                sx={(theme) => ({
                  fontFamily: FONTS.mono,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: isEligible ? posColor : theme.palette.text.tertiary,
                  lineHeight: 1,
                  flexShrink: 0,
                })}
              >
                #{miner.rank}
              </Typography>
            </Box>
            {/* Badges under the name */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexWrap: 'wrap',
                mt: 0.25,
              }}
            >
              {showDualEligibilityBadges ? (
                <>
                  <Typography
                    sx={(theme) => ({
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      border: `1px solid ${
                        ossEligible
                          ? alpha(posColor, 0.45)
                          : theme.palette.border.subtle
                      }`,
                      borderRadius: 1,
                      px: 0.75,
                      py: 0.25,
                      letterSpacing: '0.06em',
                      color: ossEligible
                        ? posColor
                        : theme.palette.text.secondary,
                      backgroundColor: ossEligible
                        ? alpha(posColor, 0.08)
                        : theme.palette.surface.subtle,
                    })}
                  >
                    OSS {ossEligible ? 'Eligible' : 'Ineligible'}
                  </Typography>
                  <Typography
                    sx={(theme) => ({
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      border: `1px solid ${
                        discoveriesEligible
                          ? alpha(posColor, 0.45)
                          : theme.palette.border.subtle
                      }`,
                      borderRadius: 1,
                      px: 0.75,
                      py: 0.25,
                      letterSpacing: '0.06em',
                      color: discoveriesEligible
                        ? posColor
                        : theme.palette.text.secondary,
                      backgroundColor: discoveriesEligible
                        ? alpha(posColor, 0.08)
                        : theme.palette.surface.subtle,
                    })}
                  >
                    Issues {discoveriesEligible ? 'Eligible' : 'Ineligible'}
                  </Typography>
                </>
              ) : !isEligible ? (
                <Typography
                  sx={(theme) => ({
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: theme.palette.status.error,
                    textTransform: 'uppercase',
                    border: `1px solid ${alpha(theme.palette.status.error, 0.3)}`,
                    borderRadius: 1,
                    px: 0.75,
                    py: 0.25,
                    letterSpacing: '0.06em',
                    backgroundColor: alpha(theme.palette.status.error, 0.06),
                  })}
                >
                  Ineligible
                </Typography>
              ) : null}
            </Box>
          </Box>
        </Box>
        {/* Watchlist button stays top-right */}
        <Box sx={{ flexShrink: 0 }}>
          {miner.githubId && (
            <WatchlistButton
              category="miners"
              itemKey={miner.githubId}
              size="small"
            />
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography
              sx={(theme) => ({
                fontFamily: FONTS.mono,
                fontSize: '1.6rem',
                fontWeight: 800,
                color: isEligible ? posColor : theme.palette.text.secondary,
                lineHeight: 1,
              })}
            >
              ${Math.round(miner.usdPerDay || 0).toLocaleString()}
            </Typography>
            <Typography
              sx={(theme) => ({
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                color: isEligible
                  ? theme.palette.status.open
                  : theme.palette.text.tertiary,
              })}
            >
              /day
            </Typography>
          </Box>
          <Typography
            sx={() => ({
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              color: isEligible ? posColor : muiTheme.palette.text.tertiary,
              opacity: 0.7,
              mt: 0.2,
            })}
          >
            ~${Math.round((miner.usdPerDay || 0) * 30).toLocaleString()}/mo
          </Typography>
        </Box>

        {isWatchlist ? (
          <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
            <CredDonut
              segments={getPrSegments(miner)}
              percent={credibilityPercent}
              isEligible={ossEligible}
              label="PRs"
            />
            <CredDonut
              segments={getIssueSegments(miner)}
              percent={issueCredPercent}
              isEligible={discoveriesEligible}
              label="Issues"
            />
          </Box>
        ) : (
          <CredDonut
            segments={segments}
            percent={isDiscoveries ? issueCredPercent : credibilityPercent}
            isEligible={isEligible}
            size={56}
          />
        )}
      </Box>

      <MinerCardFooter
        miner={miner}
        totalScore={miner.totalScore}
        segments={segments}
        isEligible={isEligible}
        variant={variant}
      />
    </Card>
  );
};

interface MinerCardFooterProps {
  miner: MinerStats;
  totalScore: number;
  segments: Segment[];
  isEligible: boolean;
  variant: LeaderboardVariant;
}

const MinerCardFooter: React.FC<MinerCardFooterProps> = ({
  miner,
  totalScore,
  segments,
  isEligible,
  variant,
}) => {
  const muiTheme = useTheme();
  const inactiveColor = alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY);
  const positiveColor = getPositiveColor(muiTheme);

  const statColors = isEligible
    ? [
        positiveColor,
        alpha(muiTheme.palette.text.primary, 0.84),
        muiTheme.palette.status.closed,
      ]
    : [
        alpha(positiveColor, 0.55),
        muiTheme.palette.text.tertiary,
        alpha(muiTheme.palette.status.closed, 0.55),
      ];

  const issueSegments = getIssueSegments(miner);
  const issueDiscoveryScore = Number(miner.issueDiscoveryScore ?? 0);

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: variant === 'discoveries' || variant === 'watchlist' ? 0.75 : 0,
        backgroundColor: isEligible
          ? alpha(theme.palette.background.default, 0.2)
          : theme.palette.surface.subtle,
        borderRadius: 1.5,
        p: 1,
      })}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 4.5rem',
          gap: 1,
          alignItems: 'center',
        }}
      >
        {segments.map((segment, i) => (
          <StatCell
            key={segment.label}
            label={segment.label}
            value={segment.value}
            color={statColors[i]}
            isEligible={isEligible}
          />
        ))}
        <Box
          sx={(theme) => ({
            textAlign: 'right',
            borderLeft: `1px solid ${theme.palette.border.light}`,
            pl: 1.5,
          })}
        >
          <StatLabel isEligible={isEligible}>
            {variant === 'watchlist' ? 'OSS' : 'Score'}
          </StatLabel>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.9rem',
              color: isEligible
                ? muiTheme.palette.text.primary
                : muiTheme.palette.text.secondary,
              fontWeight: 700,
            }}
          >
            {Number(totalScore).toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {variant === 'watchlist' && (
        <Box
          sx={(theme) => ({
            pt: 0.75,
            borderTop: `1px solid ${theme.palette.border.light}`,
          })}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 4.5rem',
              gap: 1,
              alignItems: 'center',
            }}
          >
            {issueSegments.map((segment, i) => (
              <StatCell
                key={segment.label}
                label={segment.label}
                value={segment.value}
                color={statColors[i]}
                isEligible={isEligible}
              />
            ))}
            <Box
              sx={(theme) => ({
                textAlign: 'right',
                borderLeft: `1px solid ${theme.palette.border.light}`,
                pl: 1.5,
              })}
            >
              <StatLabel isEligible={isEligible}>Discovery</StatLabel>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.9rem',
                  color: isEligible
                    ? muiTheme.palette.text.primary
                    : inactiveColor,
                  fontWeight: 700,
                }}
              >
                {issueDiscoveryScore.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

interface StatCellProps {
  label: string;
  value: number;
  color: string;
  isEligible: boolean;
}

const StatCell: React.FC<StatCellProps> = ({
  label,
  value,
  color,
  isEligible,
}) => (
  <Box>
    <StatLabel isEligible={isEligible}>{label}</StatLabel>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.85rem',
        color,
        fontWeight: 600,
      }}
    >
      {value}
    </Typography>
  </Box>
);

const StatLabel: React.FC<{
  isEligible: boolean;
  children: React.ReactNode;
}> = ({ isEligible, children }) => (
  <Typography
    sx={(theme) => ({
      fontFamily: FONTS.mono,
      fontSize: '0.6rem',
      color: isEligible
        ? theme.palette.status.open
        : theme.palette.text.tertiary,
      textTransform: 'uppercase',
      mb: 0.2,
    })}
  >
    {children}
  </Typography>
);

interface CredDonutProps {
  segments: Segment[];
  percent: number;
  isEligible: boolean;
  label?: string;
  size?: number;
}

const CredDonut: React.FC<CredDonutProps> = ({
  segments,
  percent,
  isEligible,
  label,
  size = 48,
}) => {
  const muiTheme = useTheme();
  const positiveColor = getPositiveColor(muiTheme);
  const chartSegmentColors = getChartSegmentColors(muiTheme);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
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
                radius: ['65%', '90%'],
                silent: true,
                label: { show: false },
                itemStyle: { borderRadius: 3, borderWidth: 0 },
                data: segments.map((segment, i) => ({
                  value: segment.value,
                  itemStyle: {
                    color: isEligible
                      ? chartSegmentColors[i]
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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: size <= 48 ? '0.65rem' : '0.75rem',
              color: isEligible
                ? percent >= 80
                  ? positiveColor
                  : muiTheme.palette.status.open
                : muiTheme.palette.text.tertiary,
              fontWeight: 700,
            }}
          >
            {percent.toFixed(0)}%
          </Typography>
        </Box>
      </Box>
      {label && (
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
          {label}
        </Typography>
      )}
    </Box>
  );
};

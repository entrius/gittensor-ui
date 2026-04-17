import React, { useMemo } from 'react';
import { Box, Card, Typography, Avatar } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import { useMinerGithubData, useMinerPRs } from '../../api';
import { CHART_COLORS, STATUS_COLORS } from '../../theme';
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

const INACTIVE_OPACITY = 0.24;

const CHART_SEGMENT_COLORS = [
  CHART_COLORS.merged,
  CHART_COLORS.open,
  CHART_COLORS.closed,
];
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

const isNumericGithubAuthor = (value?: string) => !value || /^\d+$/.test(value);

export const MinerCard: React.FC<MinerCardProps> = ({
  miner,
  href,
  linkState,
  variant = 'oss',
  showDualEligibilityBadges = false,
}) => {
  const linkProps = useLinkBehavior(href, { state: linkState });
  const shouldFetch = !!miner.githubId && isNumericGithubAuthor(miner.author);
  const { data: githubData } = useMinerGithubData(miner.githubId, shouldFetch);
  const { data: prs } = useMinerPRs(miner.githubId, shouldFetch);

  const username =
    githubData?.login ||
    prs?.[0]?.author ||
    (!isNumericGithubAuthor(miner.author) ? miner.author : miner.githubId) ||
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

  const minerIdentity = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minWidth: 0,
        flex: { sm: '1 1 0%' },
      }}
    >
      <Avatar
        src={avatarSrc}
        sx={(theme) => ({
          width: 36,
          height: 36,
          border: '2px solid',
          borderColor: isEligible
            ? alpha(theme.palette.status.merged, 0.3)
            : theme.palette.border.subtle,
          filter: isEligible ? 'none' : 'grayscale(100%)',
          opacity: isEligible ? 1 : INACTIVE_OPACITY,
          flexShrink: 0,
        })}
      />
      <Box
        sx={{
          minWidth: 0,
          minHeight: 36,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <Typography
          sx={(theme) => ({
            fontFamily: FONTS.mono,
            fontSize: '1rem',
            fontWeight: 700,
            color: isEligible
              ? theme.palette.text.primary
              : theme.palette.text.tertiary,
            opacity: isEligible ? 1 : INACTIVE_OPACITY,
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
            color: isEligible
              ? theme.palette.status.merged
              : theme.palette.text.tertiary,
            opacity: isEligible ? 1 : INACTIVE_OPACITY,
            lineHeight: 1,
            mt: 0.1,
          })}
        >
          #{miner.rank}
        </Typography>
      </Box>
    </Box>
  );

  const dualEligibilityPills = (
    <>
      <Typography
        sx={(theme) => ({
          fontFamily: FONTS.mono,
          fontSize: { xs: '0.6rem', sm: '0.65rem' },
          fontWeight: 700,
          textTransform: 'uppercase',
          border: `1px solid ${
            ossEligible
              ? alpha(theme.palette.status.merged, 0.45)
              : theme.palette.border.subtle
          }`,
          borderRadius: 1,
          px: { xs: 0.65, sm: 0.75 },
          py: 0.35,
          letterSpacing: { xs: '0.04em', sm: '0.06em' },
          color: ossEligible
            ? theme.palette.status.merged
            : theme.palette.text.secondary,
          backgroundColor: ossEligible
            ? alpha(theme.palette.status.merged, 0.08)
            : theme.palette.surface.subtle,
          lineHeight: 1.2,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        })}
      >
        OSS {ossEligible ? 'Eligible' : 'Ineligible'}
      </Typography>
      <Typography
        sx={(theme) => ({
          fontFamily: FONTS.mono,
          fontSize: { xs: '0.6rem', sm: '0.65rem' },
          fontWeight: 700,
          textTransform: 'uppercase',
          border: `1px solid ${
            discoveriesEligible
              ? alpha(theme.palette.status.merged, 0.45)
              : theme.palette.border.subtle
          }`,
          borderRadius: 1,
          px: { xs: 0.65, sm: 0.75 },
          py: 0.35,
          letterSpacing: { xs: '0.04em', sm: '0.06em' },
          color: discoveriesEligible
            ? theme.palette.status.merged
            : theme.palette.text.secondary,
          backgroundColor: discoveriesEligible
            ? alpha(theme.palette.status.merged, 0.08)
            : theme.palette.surface.subtle,
          lineHeight: 1.2,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        })}
      >
        Issues {discoveriesEligible ? 'Eligible' : 'Ineligible'}
      </Typography>
    </>
  );

  return (
    <Card
      component="a"
      {...linkProps}
      sx={(theme) => ({
        ...linkResetSx,
        p: 1,
        backgroundColor: isEligible
          ? theme.palette.background.default
          : theme.palette.surface.subtle,
        backdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: isEligible
          ? alpha(theme.palette.status.merged, 0.3)
          : theme.palette.border.subtle,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        position: 'relative',
        boxShadow: isEligible
          ? `0 2px 8px ${alpha(theme.palette.background.default, 0.1)}`
          : 'none',
        '&:hover': {
          backgroundColor: isEligible
            ? theme.palette.surface.elevated
            : theme.palette.surface.light,
          borderColor: isEligible
            ? alpha(theme.palette.status.merged, 0.5)
            : theme.palette.border.subtle,
          transform: isEligible ? 'translateY(-2px)' : 'none',
          boxShadow: isEligible
            ? `0 8px 24px -6px ${alpha(theme.palette.background.default, 0.6)}`
            : 'none',
        },
      })}
      elevation={0}
    >
      {showDualEligibilityBadges ? (
        <>
          <Box
            sx={{
              display: { xs: 'flex', sm: 'none' },
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                minWidth: 0,
              }}
            >
              {minerIdentity}
              {miner.githubId && (
                <WatchlistButton githubId={miner.githubId} size="small" />
              )}
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                columnGap: 0.75,
                rowGap: 0.75,
              }}
            >
              {dualEligibilityPills}
            </Box>
          </Box>
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
              width: '100%',
              minWidth: 0,
            }}
          >
            {minerIdentity}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: { sm: 0.5, md: 0.75 },
                flexShrink: 0,
                flexWrap: 'nowrap',
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: { sm: 0.45, md: 0.5 },
                  flexWrap: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {dualEligibilityPills}
              </Box>
              {miner.githubId && (
                <WatchlistButton githubId={miner.githubId} size="small" />
              )}
            </Box>
          </Box>
        </>
      ) : (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          {minerIdentity}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flexShrink: 0,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {!isEligible ? (
              <Typography
                sx={(theme) => ({
                  fontFamily: FONTS.mono,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: theme.palette.text.secondary,
                  textTransform: 'uppercase',
                  border: `1px solid ${theme.palette.border.subtle}`,
                  borderRadius: 1,
                  px: 0.75,
                  py: 0.25,
                  letterSpacing: '0.06em',
                  backgroundColor: theme.palette.surface.subtle,
                })}
              >
                Ineligible
              </Typography>
            ) : null}
            {miner.githubId && (
              <WatchlistButton githubId={miner.githubId} size="small" />
            )}
          </Box>
        </Box>
      )}

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
                color: isEligible
                  ? theme.palette.status.merged
                  : theme.palette.text.tertiary,
                opacity: isEligible ? 1 : INACTIVE_OPACITY,
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
              color: isEligible
                ? theme.palette.status.merged
                : theme.palette.text.tertiary,
              opacity: isEligible ? 0.7 : INACTIVE_OPACITY,
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
              isEligible={miner.isEligible ?? false}
              label="PRs"
            />
            <CredDonut
              segments={getIssueSegments(miner)}
              percent={issueCredPercent}
              isEligible={miner.isIssueEligible ?? false}
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

  const statColors = isEligible
    ? [
        STATUS_COLORS.merged,
        alpha(muiTheme.palette.text.primary, 0.84),
        muiTheme.palette.status.closed,
      ]
    : [inactiveColor, inactiveColor, inactiveColor];

  const issueSegments = getIssueSegments(miner);
  const issueTotal =
    (miner.totalSolvedIssues ?? 0) +
    (miner.totalOpenIssues ?? 0) +
    (miner.totalClosedIssues ?? 0);

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: variant === 'discoveries' || variant === 'watchlist' ? 0.75 : 0,
        backgroundColor: isEligible
          ? alpha(theme.palette.background.default, 0.2)
          : theme.palette.surface.subtle,
        opacity: isEligible ? 1 : 0.62,
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
            borderLeft: `1px solid ${
              isEligible
                ? theme.palette.border.light
                : theme.palette.border.subtle
            }`,
            pl: 1.5,
          })}
        >
          <StatLabel isEligible={isEligible}>Score</StatLabel>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.9rem',
              color: isEligible ? muiTheme.palette.text.primary : inactiveColor,
              fontWeight: 700,
            }}
          >
            {Number(totalScore).toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {(variant === 'discoveries' || variant === 'watchlist') && (
        <Box
          sx={(theme) => ({
            pt: 0.35,
            borderTop: `1px solid ${theme.palette.border.light}`,
          })}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: muiTheme.palette.status.open,
              textTransform: 'uppercase',
              mb: 0.35,
              letterSpacing: '0.04em',
            }}
          >
            Issues
          </Typography>
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
                borderLeft: `1px solid ${
                  isEligible
                    ? theme.palette.border.light
                    : theme.palette.border.subtle
                }`,
                pl: 1.5,
              })}
            >
              <StatLabel isEligible={isEligible}>Total</StatLabel>
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
                {issueTotal}
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
        : alpha(theme.palette.text.tertiary, INACTIVE_OPACITY),
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
  const segmentFingerprint = segments.map((s) => s.value).join(',');

  const chartOption = useMemo(() => {
    const values =
      segmentFingerprint === ''
        ? []
        : segmentFingerprint.split(',').map((v) => Number(v));

    return {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'pie' as const,
          radius: ['65%', '90%'],
          silent: true,
          label: { show: false },
          itemStyle: { borderRadius: 3, borderWidth: 0 },
          data: values.map((value, i) => ({
            value,
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
    };
  }, [segmentFingerprint, isEligible, muiTheme]);

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
          option={chartOption}
          style={{ width: '100%', height: '100%' }}
          opts={{ renderer: 'svg' }}
          lazyUpdate
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
            sx={(theme) => ({
              fontFamily: FONTS.mono,
              fontSize: size <= 48 ? '0.65rem' : '0.75rem',
              color: isEligible
                ? percent >= 80
                  ? STATUS_COLORS.merged
                  : STATUS_COLORS.open
                : theme.palette.text.tertiary,
              fontWeight: 700,
            })}
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

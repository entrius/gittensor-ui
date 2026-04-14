import React from 'react';
import { Box, Card, Typography, Avatar } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import { useMinerGithubData, useMinerPRs } from '../../api';
import { CHART_COLORS, STATUS_COLORS } from '../../theme';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
import { type MinerStats, type LeaderboardVariant, FONTS } from './types';

interface MinerCardProps {
  miner: MinerStats;
  onClick: () => void;
  variant?: LeaderboardVariant;
}

const INACTIVE_OPACITY = 0.24;

export const MinerCard: React.FC<MinerCardProps> = ({ miner, onClick, variant = 'oss' }) => {
  const muiTheme = useTheme();
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
  const isEligible = miner.isEligible ?? false;

  return (
    <Card
      onClick={onClick}
      sx={(theme) => ({
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
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
        {!isEligible && (
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
              flexShrink: 0,
              backgroundColor: theme.palette.surface.subtle,
            })}
          >
            Ineligible
          </Typography>
        )}
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

        <Box
          sx={{
            position: 'relative',
            width: 56,
            height: 56,
            flexShrink: 0,
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
                  itemStyle: {
                    borderRadius: 3,
                    borderWidth: 0,
                  },
                  data: [
                    {
                      value: miner.totalMergedPrs ?? 0,
                      itemStyle: {
                        color: isEligible
                          ? CHART_COLORS.merged
                          : alpha(
                              muiTheme.palette.text.secondary,
                              (INACTIVE_OPACITY * 2) / 3,
                            ),
                      },
                    },
                    {
                      value: miner.totalOpenPrs ?? 0,
                      itemStyle: {
                        color: isEligible
                          ? CHART_COLORS.open
                          : alpha(
                              muiTheme.palette.text.secondary,
                              INACTIVE_OPACITY,
                            ),
                      },
                    },
                    {
                      value: miner.totalClosedPrs ?? 0,
                      itemStyle: {
                        color: isEligible
                          ? CHART_COLORS.closed
                          : alpha(
                              muiTheme.palette.text.secondary,
                              INACTIVE_OPACITY / 2,
                            ),
                      },
                    },
                  ],
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
              sx={(theme) => ({
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                color: isEligible
                  ? credibilityPercent >= 80
                    ? STATUS_COLORS.merged
                    : STATUS_COLORS.open
                  : theme.palette.text.tertiary,
                fontWeight: 700,
              })}
            >
              {credibilityPercent.toFixed(0)}%
            </Typography>
          </Box>
        </Box>
      </Box>

      <MinerCardFooter miner={miner} variant={variant} isEligible={isEligible} />
    </Card>
  );
};

interface MinerCardFooterProps {
  miner: MinerStats;
  variant: LeaderboardVariant;
  isEligible: boolean;
}

const MinerCardFooter: React.FC<MinerCardFooterProps> = ({
  miner,
  variant,
  isEligible,
}) => {
  const muiTheme = useTheme();

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: variant === 'discoveries' ? 0.75 : 0,
        backgroundColor: isEligible ? alpha(theme.palette.background.default, 0.2) : theme.palette.surface.subtle,
        opacity: isEligible ? 1 : 0.62,
        borderRadius: 1.5,
        p: 1,
      })}
    >
      <PrimaryStatsRow miner={miner} isEligible={isEligible} />
      {variant === 'discoveries' && (
        <IssueStatsSection
          miner={miner}
          isEligible={isEligible}
          textColor={alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY)}
        />
      )}
    </Box>
  );
};

interface PrimaryStatsRowProps {
  miner: MinerStats;
  isEligible: boolean;
}

const PrimaryStatsRow: React.FC<PrimaryStatsRowProps> = ({
  miner,
  isEligible,
}) => {
  const muiTheme = useTheme();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 1, alignItems: 'center' }}>
      {[
        {
          label: 'Merged',
          value: miner.totalMergedPrs ?? 0,
          color: isEligible ? STATUS_COLORS.merged : alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY),
        },
        {
          label: 'Open',
          value: miner.totalOpenPrs ?? 0,
          color: isEligible ? alpha(muiTheme.palette.text.primary, 0.84) : alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY),
        },
        {
          label: 'Closed',
          value: miner.totalClosedPrs ?? 0,
          color: isEligible ? muiTheme.palette.status.closed : alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY),
        },
      ].map(({ label, value, color }) => (
        <Box key={label}>
          <Typography
            sx={(theme) => ({
              fontFamily: FONTS.mono,
              fontSize: '0.6rem',
              color: isEligible ? theme.palette.status.open : alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY),
              textTransform: 'uppercase',
              mb: 0.2,
            })}
          >
            {label}
          </Typography>
          <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.85rem', color, fontWeight: 600 }}>
            {value}
          </Typography>
        </Box>
      ))}
      <Box
        sx={(theme) => ({
          textAlign: 'right',
          borderLeft: `1px solid ${
            isEligible ? theme.palette.border.light : theme.palette.border.subtle
          }`,
          pl: 1.5,
        })}
      >
        <Typography
          sx={(theme) => ({
            fontFamily: FONTS.mono,
            fontSize: '0.6rem',
            color: isEligible ? theme.palette.status.open : alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY),
            textTransform: 'uppercase',
            mb: 0.2,
          })}
        >
          Score
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.9rem',
            color: isEligible
              ? muiTheme.palette.text.primary
              : alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY),
            fontWeight: 700,
          }}
        >
          {Number(miner.totalScore).toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );
};

interface IssueStatsSectionProps {
  miner: MinerStats;
  isEligible: boolean;
  textColor: string;
}

const IssueStatsSection: React.FC<IssueStatsSectionProps> = ({
  miner,
  isEligible,
  textColor,
}) => {
  const muiTheme = useTheme();

  return (
    <Box sx={{ pt: 0.35, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem', fontWeight: 700, color: '#8b949e', minWidth: 28, textTransform: 'uppercase', mb: 0.35, letterSpacing: '0.04em' }}>
        Issues
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr auto',
          gap: 1,
          alignItems: 'center',
        }}
      >
        {[
          {
            label: 'Solved',
            value: miner.totalSolvedIssues ?? 0,
            color: isEligible ? STATUS_COLORS.merged : textColor,
          },
          {
            label: 'Open',
            value: miner.totalOpenIssues ?? 0,
            color: isEligible ? alpha(muiTheme.palette.text.primary, 0.84) : textColor,
          },
          {
            label: 'Closed',
            value: miner.totalClosedIssues ?? 0,
            color: isEligible ? muiTheme.palette.status.closed : textColor,
          },
        ].map(({ label, value, color }) => (
          <Box key={label}>
            <Typography
              sx={(theme) => ({
                fontFamily: FONTS.mono,
                fontSize: '0.6rem',
                color: isEligible ? theme.palette.status.open : alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY),
                textTransform: 'uppercase',
                mb: 0.2,
              })}
            >
              {label}
            </Typography>
            <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.85rem', color, fontWeight: 600 }}>
              {value}
            </Typography>
          </Box>
        ))}
        <Box
          sx={(theme) => ({
            textAlign: 'right',
            borderLeft: `1px solid ${
              isEligible ? theme.palette.border.light : theme.palette.border.subtle
            }`,
            pl: 1.5,
          })}
        >
          <Typography
            sx={(theme) => ({
              fontFamily: FONTS.mono,
              fontSize: '0.6rem',
              color: isEligible ? theme.palette.status.open : alpha(muiTheme.palette.text.tertiary, INACTIVE_OPACITY),
              textTransform: 'uppercase',
              mb: 0.2,
            })}
          >
            Issues
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.9rem',
              color: isEligible ? muiTheme.palette.text.primary : textColor,
              fontWeight: 700,
            }}
          >
            {(miner.totalSolvedIssues ?? 0) +
              (miner.totalOpenIssues ?? 0) +
              (miner.totalClosedIssues ?? 0)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

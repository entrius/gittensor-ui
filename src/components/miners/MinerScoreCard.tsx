import React, { useMemo } from 'react';
import {
  Card,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  Tooltip,
  alpha,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  GitHub as GitHubIcon,
  Update as UpdateIcon,
  Language as WebsiteIcon,
  LocationOn as LocationIcon,
  Business as CompanyIcon,
  People as FollowersIcon,
} from '@mui/icons-material';
import {
  useMinerStats,
  useMinerPRs,
  useAllMiners,
  useMinerGithubData,
  useGeneralConfig,
} from '../../api';
import {
  RANK_COLORS,
  STATUS_COLORS,
  CREDIBILITY_COLORS,
  RISK_COLORS,
} from '../../theme';
import {
  calculateDynamicOpenPrThreshold,
  parseNumber,
} from '../../utils/ExplorerUtils';

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) {
    const mins = diffMins % 60;
    return mins > 0 ? `${diffHours}h ${mins}m ago` : `${diffHours}h ago`;
  }
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

const credibilityColor = (cred: number) => {
  if (cred >= 0.9) return CREDIBILITY_COLORS.excellent;
  if (cred >= 0.7) return CREDIBILITY_COLORS.good;
  if (cred >= 0.5) return CREDIBILITY_COLORS.moderate;
  if (cred >= 0.3) return CREDIBILITY_COLORS.low;
  return CREDIBILITY_COLORS.poor;
};

const openPrColor = (open: number, threshold: number) => {
  if (open >= threshold) return RISK_COLORS.exceeded;
  if (open >= threshold - 1) return RISK_COLORS.critical;
  if (open >= threshold - 2) return RISK_COLORS.approaching;
  return undefined;
};

const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: 'surface.tooltip',
      color: 'text.primary',
      fontSize: '0.75rem',
      fontFamily: '"JetBrains Mono", monospace',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: 'border.light',
      maxWidth: 260,
    },
  },
  arrow: { sx: { color: 'surface.tooltip' } },
};

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  rank?: number | null;
  color?: string;
  tooltip?: string;
}

const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  sub,
  rank,
  color,
  tooltip,
}) => (
  <Box
    sx={{
      backgroundColor: 'surface.subtle',
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'border.subtle',
      p: 2,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {tooltip ? (
        <Tooltip
          title={tooltip}
          arrow
          placement="top"
          slotProps={tooltipSlotProps}
        >
          <Typography
            variant="statLabel"
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {label}
            <InfoOutlinedIcon sx={{ fontSize: '0.75rem' }} />
          </Typography>
        </Tooltip>
      ) : (
        <Typography variant="statLabel">{label}</Typography>
      )}
      {rank != null && rank > 0 && (
        <Box
          sx={{
            backgroundColor: 'background.default',
            borderRadius: '2px',
            width: 18,
            height: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            borderColor:
              rank <= 3
                ? alpha(
                    rank === 1
                      ? RANK_COLORS.first
                      : rank === 2
                        ? RANK_COLORS.second
                        : RANK_COLORS.third,
                    0.4,
                  )
                : 'border.light',
          }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.6rem',
              fontWeight: 600,
              color:
                rank === 1
                  ? RANK_COLORS.first
                  : rank === 2
                    ? RANK_COLORS.second
                    : rank === 3
                      ? RANK_COLORS.third
                      : (t) => alpha(t.palette.text.primary, 0.6),
            }}
          >
            {rank}
          </Typography>
        </Box>
      )}
    </Box>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '1.5rem',
        fontWeight: 600,
        color: color || 'text.primary',
        lineHeight: 1.2,
      }}
    >
      {value}
    </Typography>
    {sub && (
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          color: (t) => alpha(t.palette.text.primary, 0.4),
          mt: 0.25,
        }}
      >
        {sub}
      </Typography>
    )}
  </Box>
);

interface MinerScoreCardProps {
  githubId: string;
}

const MinerScoreCard: React.FC<MinerScoreCardProps> = ({ githubId }) => {
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  const { data: prs } = useMinerPRs(githubId);
  const { data: githubData } = useMinerGithubData(githubId);
  const { data: generalConfig } = useGeneralConfig();
  const { data: allMinersStats } = useAllMiners();

  const username = githubData?.login || prs?.[0]?.author || githubId;

  const openPrThreshold = minerStats
    ? calculateDynamicOpenPrThreshold(
        minerStats,
        generalConfig?.repositoryPrScoring,
      )
    : (generalConfig?.repositoryPrScoring?.excessivePrPenaltyThreshold ?? 10);

  const rankings = useMemo(() => {
    if (!allMinersStats || !minerStats) return null;
    const rank = (_key: string, extract: (m: any) => number) =>
      allMinersStats
        .slice()
        .sort((a, b) => extract(b) - extract(a))
        .findIndex((m) => m.githubId === githubId) + 1 || null;
    return {
      score: rank('score', (m) => Number(m.totalScore)),
      totalPrs: rank('prs', (m) => Number(m.totalPrs)),
    };
  }, [allMinersStats, minerStats, githubId]);

  const topPrScore = useMemo(() => {
    if (!prs || prs.length === 0) return null;
    return prs.reduce((max, pr) => {
      const s = parseFloat(pr.score || '0');
      return s > max ? s : max;
    }, 0);
  }, [prs]);

  if (isLoading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }} elevation={0}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (error || !minerStats) {
    return (
      <Card sx={{ p: 4 }}>
        <Typography
          sx={{
            color: alpha(STATUS_COLORS.error, 0.9),
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
          }}
        >
          No data found for GitHub user: {githubId}
        </Typography>
      </Card>
    );
  }

  const cred = parseNumber(minerStats.credibility);
  const openPrs = parseNumber(minerStats.totalOpenPrs);
  const collateral = parseNumber(minerStats.totalCollateralScore);
  const isEligible = minerStats.isEligible ?? false;
  const eligibilityColor = isEligible
    ? STATUS_COLORS.success
    : STATUS_COLORS.neutral;

  return (
    <Card sx={{ p: 3, position: 'relative' }} elevation={0}>
      {/* Updated chip — desktop */}
      {minerStats.updatedAt && (
        <Chip
          icon={<UpdateIcon sx={{ fontSize: '0.9rem' }} />}
          label={`Updated ${formatTimeAgo(new Date(minerStats.updatedAt))}`}
          variant="outlined"
          size="small"
          sx={{
            display: { xs: 'none', sm: 'flex' },
            position: 'absolute',
            top: 16,
            right: 16,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.7rem',
            color: (t) => alpha(t.palette.text.primary, 0.5),
            borderColor: 'border.light',
            backgroundColor: 'surface.elevated',
            '& .MuiChip-icon': {
              color: (t) => alpha(t.palette.text.primary, 0.4),
            },
          }}
        />
      )}

      {/* Identity row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar
          src={`https://avatars.githubusercontent.com/${username}`}
          alt={username}
          sx={{
            width: 64,
            height: 64,
            border: '2px solid',
            borderColor: 'border.light',
          }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
              mb: 0.5,
            }}
          >
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: { xs: '1.15rem', sm: '1.35rem' },
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              {githubData?.name || username}
            </Typography>
            <Chip
              variant="outlined"
              label={isEligible ? 'Eligible' : 'Ineligible'}
              size="small"
              sx={{
                color: eligibilityColor,
                borderColor: alpha(eligibilityColor, 0.35),
                backgroundColor: alpha(eligibilityColor, 0.1),
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography
              component="a"
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.9rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              <GitHubIcon sx={{ fontSize: '1rem' }} />@{username}
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.45),
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: { xs: '0.55rem', sm: '0.65rem' },
                wordBreak: 'break-all',
              }}
            >
              {minerStats.hotkey || ''}
            </Typography>
          </Box>

          {/* Bio / about me */}
          {githubData?.bio && (
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.7),
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                mt: 1,
                lineHeight: 1.5,
              }}
            >
              {githubData.bio}
            </Typography>
          )}

          {/* GitHub meta — compact inline chips */}
          {githubData && (
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
              {githubData.company && (
                <Chip
                  variant="info"
                  icon={<CompanyIcon />}
                  label={githubData.company}
                  size="small"
                />
              )}
              {githubData.location && (
                <Chip
                  variant="info"
                  icon={<LocationIcon />}
                  label={githubData.location}
                  size="small"
                />
              )}
              {githubData.blog && (
                <Chip
                  variant="info"
                  component="a"
                  href={
                    githubData.blog.startsWith('http')
                      ? githubData.blog
                      : `https://${githubData.blog}`
                  }
                  target="_blank"
                  icon={<WebsiteIcon />}
                  label="Website"
                  clickable
                  size="small"
                />
              )}
              <Chip
                variant="info"
                icon={<FollowersIcon />}
                label={`${githubData.followers} followers`}
                size="small"
              />
            </Stack>
          )}

          {/* Updated chip — mobile */}
          {minerStats.updatedAt && (
            <Chip
              icon={<UpdateIcon sx={{ fontSize: '0.8rem' }} />}
              label={`Updated ${formatTimeAgo(new Date(minerStats.updatedAt))}`}
              variant="outlined"
              size="small"
              sx={{
                display: { xs: 'flex', sm: 'none' },
                mt: 1,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.65rem',
                color: (t) => alpha(t.palette.text.primary, 0.5),
                borderColor: 'border.light',
                backgroundColor: 'surface.elevated',
                '& .MuiChip-icon': {
                  color: (t) => alpha(t.palette.text.primary, 0.4),
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Stat tiles */}
      <Grid container spacing={1.5}>
        <Grid item xs={6} sm={4} md={2}>
          <StatTile
            label="Score"
            value={Number(minerStats.totalScore).toFixed(2)}
            sub={
              topPrScore != null
                ? `Best PR: ${topPrScore.toFixed(2)}`
                : undefined
            }
            rank={rankings?.score}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatTile
            label="Credibility"
            value={`${(cred * 100).toFixed(1)}%`}
            sub={`${minerStats.totalMergedPrs || 0} merged · ${minerStats.totalClosedPrs || 0} closed`}
            color={credibilityColor(cred)}
            tooltip="Ratio of merged PRs to total attempts (merged + closed). Higher credibility means a stronger multiplier on your scores."
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatTile
            label="Token Score"
            value={Number(minerStats.totalTokenScore || 0).toFixed(0)}
            sub={`${Number(minerStats.totalNodesScored || 0).toLocaleString()} tokens`}
            tooltip="Sum of token-level scores from merged PRs. Each scored code element (function, class, etc.) contributes to this."
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatTile
            label="PRs"
            value={String(minerStats.totalPrs || 0)}
            sub={`${Number((minerStats.totalAdditions ?? 0) + (minerStats.totalDeletions ?? 0)).toLocaleString()} lines`}
            rank={rankings?.totalPrs}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatTile
            label="Open Risk"
            value={`${openPrs} / ${openPrThreshold}`}
            sub={
              collateral > 0
                ? `Collateral: -${collateral.toFixed(2)}`
                : 'No collateral'
            }
            color={openPrColor(openPrs, openPrThreshold)}
            tooltip={`Open PRs have collateral deducted from score. Exceeding ${openPrThreshold} triggers a full penalty. Threshold scales with token score (+1 per 300).`}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatTile
            label="Earnings"
            value={`$${Math.round(minerStats.usdPerDay ?? 0).toLocaleString()}/d`}
            sub={`$${Math.round((minerStats.usdPerDay ?? 0) * 30).toLocaleString()}/mo · $${Math.round(minerStats.lifetimeUsd ?? 0).toLocaleString()} total`}
            color={
              (minerStats.usdPerDay ?? 0) > 0
                ? STATUS_COLORS.success
                : undefined
            }
            tooltip="Estimated earnings based on current network incentive distribution. Actual payouts depend on validator consensus."
          />
        </Grid>
      </Grid>
    </Card>
  );
};

export default MinerScoreCard;

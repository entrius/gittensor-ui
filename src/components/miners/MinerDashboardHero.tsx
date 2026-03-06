import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  alpha,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import UpdateIcon from '@mui/icons-material/Update';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import PeopleIcon from '@mui/icons-material/People';
import {
  useMinerStats,
  useMinerPRs,
  useMinerGithubData,
  useGeneralConfig,
  type MinerEvaluation,
  type RepositoryPrScoring,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const calculateDynamicThreshold = (
  minerStats: MinerEvaluation,
  prScoring: RepositoryPrScoring | undefined,
): number => {
  const baseThreshold = prScoring?.excessivePrPenaltyThreshold ?? 10;
  const tokenScorePer = prScoring?.openPrThresholdTokenScore ?? 500;
  const maxThreshold = prScoring?.maxOpenPrThreshold ?? 30;
  const currentTierLevel =
    TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;
  let unlockedTokenScore = 0;
  if (currentTierLevel >= 1)
    unlockedTokenScore += Number(minerStats.bronzeTokenScore || 0);
  if (currentTierLevel >= 2)
    unlockedTokenScore += Number(minerStats.silverTokenScore || 0);
  if (currentTierLevel >= 3)
    unlockedTokenScore += Number(minerStats.goldTokenScore || 0);
  const bonus = Math.floor(unlockedTokenScore / tokenScorePer);
  return Math.min(baseThreshold + bonus, maxThreshold);
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays}d ago`;
};

interface MinerDashboardHeroProps {
  githubId: string;
}

const MinerDashboardHero: React.FC<MinerDashboardHeroProps> = ({
  githubId,
}) => {
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  const { data: prs } = useMinerPRs(githubId);
  const { data: githubData } = useMinerGithubData(githubId);
  const { data: generalConfig } = useGeneralConfig();

  const username = githubData?.login || prs?.[0]?.author || githubId;
  const openPrThreshold = minerStats
    ? calculateDynamicThreshold(minerStats, generalConfig?.repositoryPrScoring)
    : 10;
  const openPrs = Number(minerStats?.totalOpenPrs || 0);
  const openRiskColor =
    openPrs >= openPrThreshold
      ? STATUS_COLORS.error
      : openPrs >= openPrThreshold - 2
        ? '#f59e0b'
        : undefined;

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 120,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
        }}
      >
        <CircularProgress size={36} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !minerStats) {
    return (
      <Box
        sx={{
          p: 3,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          color: alpha(STATUS_COLORS.error, 0.9),
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.9rem',
        }}
      >
        No data found for GitHub user: {githubId}
      </Box>
    );
  }

  const tierColor =
    minerStats.currentTier === 'Gold'
      ? TIER_COLORS.gold
      : minerStats.currentTier === 'Silver'
        ? TIER_COLORS.silver
        : minerStats.currentTier === 'Bronze'
          ? TIER_COLORS.bronze
          : 'rgba(255,255,255,0.4)';

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        p: { xs: 2, sm: 3 },
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {minerStats.updatedAt && (
        <Chip
          icon={<UpdateIcon sx={{ fontSize: '0.8rem' }} />}
          label={`Updated ${formatTimeAgo(new Date(minerStats.updatedAt))}`}
          size="small"
          sx={{
            position: { xs: 'static', sm: 'absolute' },
            top: { sm: 12 },
            right: { sm: 12 },
            alignSelf: { xs: 'flex-start', sm: 'auto' },
            order: { xs: 2, sm: 'unset' },
            mt: { xs: 1, sm: 0 },
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            color: 'rgba(255, 255, 255, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            '& .MuiChip-icon': { color: 'rgba(255, 255, 255, 0.4)' },
          }}
        />
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 2, sm: 3 },
          flexWrap: 'wrap',
          order: { xs: 1, sm: 'unset' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={`https://avatars.githubusercontent.com/${username}`}
            alt={username}
            sx={{
              width: 56,
              height: 56,
              border: `2px solid ${alpha(tierColor, 0.5)}`,
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                alignSelf: 'flex-start',
              }}
            >
              <Typography
                sx={{
                  color: '#fff',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  fontSize: '1.15rem',
                }}
              >
                {githubData?.name || username}
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1.25,
                  py: 0.25,
                  borderRadius: 1,
                  border: `1px solid ${alpha(tierColor, 0.4)}`,
                  backgroundColor: alpha(tierColor, 0.08),
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: tierColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {minerStats.currentTier || 'Unranked'} Tier
                </Typography>
              </Box>
            </Box>
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
              <GitHubIcon sx={{ fontSize: '1rem' }} /> @{username}
            </Typography>
          </Box>
        </Box>

        {minerStats.hotkey && (
          <Typography
            sx={{
              width: '100%',
              color: 'rgba(255,255,255,0.4)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
            }}
          >
            Hotkey: {minerStats.hotkey}
          </Typography>
        )}

        {githubData &&
          (githubData.location ||
            githubData.hireable ||
            githubData.followers != null) && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center',
                width: '100%',
              }}
            >
              {githubData.location && (
                <Chip
                  size="small"
                  icon={<LocationOnIcon sx={{ fontSize: '0.9rem' }} />}
                  label={githubData.location}
                  variant="outlined"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.7)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    '& .MuiChip-icon': { color: 'rgba(255,255,255,0.5)' },
                  }}
                />
              )}
              {githubData.hireable && (
                <Chip
                  size="small"
                  icon={<WorkOutlineIcon sx={{ fontSize: '0.9rem' }} />}
                  label="Open to Work"
                  variant="outlined"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.7rem',
                    color: STATUS_COLORS.success,
                    borderColor: alpha(STATUS_COLORS.success, 0.4),
                    '& .MuiChip-icon': { color: STATUS_COLORS.success },
                  }}
                />
              )}
              {githubData.followers != null && (
                <Chip
                  size="small"
                  icon={<PeopleIcon sx={{ fontSize: '0.9rem' }} />}
                  label={`${githubData.followers} followers`}
                  variant="outlined"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.7)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    '& .MuiChip-icon': { color: 'rgba(255,255,255,0.5)' },
                  }}
                />
              )}
            </Box>
          )}

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: { xs: 1.5, sm: 2 },
            alignItems: 'center',
          }}
        >
          <StatPill
            label="Score"
            value={Number(minerStats.totalScore).toFixed(2)}
          />
          <Tooltip
            title="Merged PRs ÷ total attempts. Higher credibility increases your score multiplier."
            arrow
            slotProps={{
              tooltip: {
                sx: {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                },
              },
            }}
          >
            <Box>
              <StatPill
                label="Credibility"
                value={`${(Number(minerStats.credibility || 0) * 100).toFixed(0)}%`}
                valueColor={
                  (minerStats.credibility || 0) >= 0.7
                    ? STATUS_COLORS.success
                    : undefined
                }
              />
            </Box>
          </Tooltip>
          <Tooltip
            title={`Threshold: ${openPrThreshold} open PRs. Exceeding this reduces your score.`}
            arrow
            slotProps={{
              tooltip: {
                sx: {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                },
              },
            }}
          >
            <Box>
              <StatPill
                label="Open PRs"
                value={`${openPrs} / ${openPrThreshold}`}
                valueColor={openRiskColor}
              />
            </Box>
          </Tooltip>
          <StatPill
            label="Est. daily"
            value={`$${Math.round(minerStats.usdPerDay ?? 0).toLocaleString()}`}
            valueColor={
              (minerStats.usdPerDay ?? 0) > 0
                ? STATUS_COLORS.success
                : undefined
            }
          />
        </Box>
      </Box>
    </Box>
  );
};

const StatPill: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
}> = ({ label, value, valueColor }) => (
  <Box
    sx={{
      px: 1.5,
      py: 1,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <Typography
      sx={{
        color: 'rgba(255,255,255,0.5)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        color: valueColor || '#fff',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '1rem',
        fontWeight: 600,
      }}
    >
      {value}
    </Typography>
  </Box>
);

export default MinerDashboardHero;

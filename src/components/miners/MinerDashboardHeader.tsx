import React, { useMemo } from 'react';
import {
  Card,
  Typography,
  Box,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  Divider,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Language as WebsiteIcon,
  Twitter as TwitterIcon,
  LocationOn as LocationIcon,
  Business as CompanyIcon,
  People as FollowersIcon,
  Update as UpdateIcon,
  EmojiEvents as RankIcon,
  TrendingUp as ScoreIcon,
  Verified as CredibilityIcon,
  AccountBalanceWallet as EarningsIcon,
} from '@mui/icons-material';
import {
  useMinerStats,
  useMinerPRs,
  useAllMiners,
  useMinerGithubData,
  type MinerEvaluation,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';
import TrustBadge from './TrustBadge';

// Custom time formatting
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

const getTierColor = (tier: string | undefined): string => {
  switch (tier?.toLowerCase()) {
    case 'gold':
      return TIER_COLORS.gold;
    case 'silver':
      return TIER_COLORS.silver;
    case 'bronze':
      return TIER_COLORS.bronze;
    default:
      return 'rgba(255, 255, 255, 0.4)';
  }
};

interface MinerDashboardHeaderProps {
  githubId: string;
}

const MinerDashboardHeader: React.FC<MinerDashboardHeaderProps> = ({
  githubId,
}) => {
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  const { data: prs } = useMinerPRs(githubId);
  const { data: githubData } = useMinerGithubData(githubId);
  const { data: allMinersStats } = useAllMiners();

  const username = githubData?.login || prs?.[0]?.author || githubId;

  // Calculate rank
  const rank = useMemo(() => {
    if (!allMinersStats || !minerStats) return null;
    return (
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
        .findIndex((m) => m.githubId === githubId) + 1
    );
  }, [allMinersStats, minerStats, githubId]);

  const totalMiners = allMinersStats?.length || 0;

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (error || !minerStats) {
    return (
      <Card
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          p: 4,
        }}
        elevation={0}
      >
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

  const tierColor = getTierColor(minerStats.currentTier);
  const credPercent = (Number(minerStats.credibility || 0) * 100).toFixed(1);

  const keyStats = [
    {
      label: 'Total Score',
      value: Number(minerStats.totalScore).toFixed(2),
      icon: <ScoreIcon sx={{ fontSize: '1rem' }} />,
      color: '#ffffff',
    },
    {
      label: 'Credibility',
      value: `${credPercent}%`,
      icon: <CredibilityIcon sx={{ fontSize: '1rem' }} />,
      color:
        Number(minerStats.credibility || 0) >= 0.9
          ? STATUS_COLORS.success
          : Number(minerStats.credibility || 0) >= 0.7
            ? '#a3e635'
            : Number(minerStats.credibility || 0) >= 0.5
              ? '#facc15'
              : '#f87171',
    },
    {
      label: 'Est. Daily',
      value: `$${Math.round(minerStats.usdPerDay ?? 0).toLocaleString()}`,
      icon: <EarningsIcon sx={{ fontSize: '1rem' }} />,
      color:
        (minerStats.usdPerDay ?? 0) > 0 ? STATUS_COLORS.success : '#ffffff',
      subValue: `${(minerStats.taoPerDay ?? 0).toFixed(4)} TAO`,
    },
    {
      label: 'Rank',
      value: rank ? `#${rank}` : 'N/A',
      icon: <RankIcon sx={{ fontSize: '1rem' }} />,
      color:
        rank === 1
          ? TIER_COLORS.gold
          : rank === 2
            ? TIER_COLORS.silver
            : rank === 3
              ? TIER_COLORS.bronze
              : '#ffffff',
      subValue: totalMiners ? `of ${totalMiners}` : undefined,
    },
  ];

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: alpha(tierColor, 0.3),
        backgroundColor: 'transparent',
        p: 3,
        position: 'relative',
        overflow: 'visible',
      }}
      elevation={0}
    >
      {/* Updated timestamp */}
      {minerStats.updatedAt && (
        <Chip
          icon={<UpdateIcon sx={{ fontSize: '0.9rem' }} />}
          label={`Updated ${formatTimeAgo(new Date(minerStats.updatedAt))}`}
          variant="outlined"
          size="small"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.7rem',
            color: 'rgba(255, 255, 255, 0.5)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            '& .MuiChip-icon': { color: 'rgba(255, 255, 255, 0.4)' },
          }}
        />
      )}

      {/* Top section: Identity */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          mb: 3,
        }}
      >
        {/* Avatar + Name + Tier */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
          <Avatar
            src={`https://avatars.githubusercontent.com/${username}`}
            alt={username}
            sx={{
              width: 80,
              height: 80,
              border: `2px solid ${alpha(tierColor, 0.4)}`,
              boxShadow: `0 0 20px ${alpha(tierColor, 0.15)}`,
            }}
          />
          <Box>
            {/* Name + Tier Badge */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'stretch',
                border: '1px solid',
                borderColor: alpha(tierColor, 0.5),
                borderRadius: '6px',
                overflow: 'hidden',
                backgroundColor: 'rgba(0,0,0,0.2)',
                mb: 0.5,
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    color: '#ffffff',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {githubData?.name || username}
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  borderLeft: '1px solid',
                  borderColor: alpha(tierColor, 0.3),
                  backgroundColor: alpha(tierColor, 0.1),
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.875rem',
                    color: tierColor,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 700,
                  }}
                >
                  {minerStats.currentTier || 'Unranked'}
                </Typography>
              </Box>
            </Box>

            {/* GitHub link */}
            <Typography
              component="a"
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.1rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': { textDecoration: 'underline' },
                mb: 0.5,
              }}
            >
              <GitHubIcon fontSize="small" />@{username}
            </Typography>

            {/* Trust Badge */}
            <Box sx={{ mt: 1 }}>
              <TrustBadge
                credibility={Number(minerStats.credibility || 0)}
                totalPRs={Number(minerStats.totalPrs || 0)}
              />
            </Box>
          </Box>
        </Box>

        <Divider
          sx={{
            display: { xs: 'block', md: 'none' },
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        />

        {/* Bio + social links */}
        {githubData && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {githubData.bio && (
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontStyle: 'italic',
                  mb: 2,
                  fontSize: '0.95rem',
                  maxWidth: '600px',
                }}
              >
                {githubData.bio}
              </Typography>
            )}
            <Stack direction="row" gap={1.5} flexWrap="wrap">
              {githubData.company && (
                <Chip
                  variant="info"
                  icon={<CompanyIcon />}
                  label={githubData.company}
                />
              )}
              {githubData.location && (
                <Chip
                  variant="info"
                  icon={<LocationIcon />}
                  label={githubData.location}
                />
              )}
              {githubData.blog && (
                <Chip
                  variant="status"
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
                  sx={{
                    color: STATUS_COLORS.info,
                    borderColor: alpha(STATUS_COLORS.info, 0.3),
                    '& .MuiChip-icon': { color: STATUS_COLORS.info },
                  }}
                />
              )}
              {githubData.twitterUsername && (
                <Chip
                  variant="status"
                  component="a"
                  href={`https://twitter.com/${githubData.twitterUsername}`}
                  target="_blank"
                  icon={<TwitterIcon />}
                  label={`@${githubData.twitterUsername}`}
                  clickable
                  sx={{
                    color: '#1DA1F2',
                    borderColor: 'rgba(29, 161, 242, 0.3)',
                    '& .MuiChip-icon': { color: '#1DA1F2' },
                  }}
                />
              )}
              <Chip
                variant="info"
                icon={<FollowersIcon />}
                label={`${githubData.followers} followers`}
              />
            </Stack>
          </Box>
        )}
      </Box>

      {/* Key stats row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(4, 1fr)',
          },
          gap: 2,
        }}
      >
        {keyStats.map((stat) => (
          <Box
            key={stat.label}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              p: 2,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mb: 1,
              }}
            >
              <Box sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>{stat.icon}</Box>
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                }}
              >
                {stat.label}
              </Typography>
            </Box>
            <Typography
              sx={{
                color: stat.color,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.5rem',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {stat.value}
            </Typography>
            {stat.subValue && (
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  mt: 0.5,
                }}
              >
                {stat.subValue}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Card>
  );
};

export default MinerDashboardHeader;

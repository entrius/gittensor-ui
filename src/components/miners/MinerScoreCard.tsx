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
  Divider,
  Tooltip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Language as WebsiteIcon,
  Twitter as TwitterIcon,
  LocationOn as LocationIcon,
  Business as CompanyIcon,
  CheckCircle as HireableIcon,
  GitHub as GitHubIcon,
  People as FollowersIcon,
  AttachMoney as EarningsIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import {
  useMinerStats,
  useMinerPRs,
  useAllMiners,
  useMinerGithubData,
  useGeneralConfig,
} from '../../api';
import { TIER_COLORS } from '../../theme';

// Custom time formatting - shows minutes precision for < 24h
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

interface MinerScoreCardProps {
  githubId: string;
}

const MinerScoreCard: React.FC<MinerScoreCardProps> = ({ githubId }) => {
  // Use pre-computed stats from MinerEvaluations table - much faster!
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  // Fetch PRs to get username for avatar (only fetches first PR)
  const { data: prs } = useMinerPRs(githubId);
  // Fetch Rich Github Data
  const { data: githubData } = useMinerGithubData(githubId);
  // Fetch general config for open PR threshold
  const { data: generalConfig } = useGeneralConfig();

  const username = githubData?.login || prs?.[0]?.author || githubId;

  // Get threshold from config or fallback to 10
  const openPrThreshold =
    generalConfig?.repositoryPrScoring?.excessivePrPenaltyThreshold ?? 10;

  // Get color for open PRs based on proximity to threshold
  const getOpenPrColor = (openPrs: number, threshold: number) => {
    if (openPrs >= threshold) return 'rgba(248, 113, 113, 0.9)'; // red
    if (openPrs >= threshold - 1) return 'rgba(251, 146, 60, 0.9)'; // orange
    if (openPrs >= threshold - 2) return 'rgba(250, 204, 21, 0.9)'; // yellow
    return undefined; // default white
  };

  // Fetch all miners' stats to calculate rankings
  const { data: allMinersStats } = useAllMiners();

  // Calculate rankings for each metric
  const rankings = useMemo(() => {
    if (!allMinersStats || !minerStats) return null;

    // Sort miners by each metric and find the current miner's rank
    const prRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalPrs) - Number(a.totalPrs))
        .findIndex((m) => m.githubId === githubId) + 1;

    const linesRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalNodesScored) - Number(a.totalNodesScored))
        .findIndex((m) => m.githubId === githubId) + 1;

    const reposRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.uniqueReposCount) - Number(a.uniqueReposCount))
        .findIndex((m) => m.githubId === githubId) + 1;

    const scoreRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
        .findIndex((m) => m.githubId === githubId) + 1;

    const credibilityRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.credibility || 0) - Number(a.credibility || 0))
        .findIndex((m) => m.githubId === githubId) + 1;

    return {
      totalPrs: prRanking || null,
      linesChanged: linesRanking || null,
      uniqueRepos: reposRanking || null,
      score: scoreRanking || null,
      credibility: credibilityRanking || null,
    };
  }, [allMinersStats, minerStats, githubId]);

  // Find top PR by score - MUST be before conditional returns
  const topPR = useMemo(() => {
    if (!prs || prs.length === 0) return null;
    return prs.reduce((max, pr) => {
      const prScore = parseFloat(pr.score || '0');
      const maxScore = parseFloat(max.score || '0');
      return prScore > maxScore ? pr : max;
    }, prs[0]);
  }, [prs]);

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          borderRadius: '8px',
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
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          p: 4,
        }}
      >
        <Typography
          sx={{
            color: 'rgba(255, 107, 107, 0.9)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
          }}
        >
          No data found for GitHub user: {githubId}
        </Typography>
      </Card>
    );
  }

  // Use pre-computed stats directly from the evaluation
  const statItems: Array<{
    label: string;
    value: string | number;
    rank: number | null | undefined;
    link?: string | null;
    color?: string;
    subItems?: Array<{ label: string; value: string | number; color?: string }>;
    tooltip?: string;
    icon?: 'earnings' | 'warning';
  }> = [
    {
      label: 'Credibility',
      value: `${(Number(minerStats.credibility || 0) * 100).toFixed(1)}%`,
      rank: null,
      color:
        (minerStats.credibility || 0) >= 0.9
          ? '#4ade80' // High green
          : (minerStats.credibility || 0) >= 0.7
            ? '#a3e635' // Light green
            : (minerStats.credibility || 0) >= 0.5
              ? '#facc15' // Yellow
              : (minerStats.credibility || 0) >= 0.3
                ? '#fb923c' // Orange
                : '#f87171', // Red
      subItems: [
        { label: 'Merged', value: minerStats.totalMergedPrs || 0 },
        { label: 'Closed', value: minerStats.totalClosedPrs || 0 },
      ],
      tooltip:
        'Credibility is the ratio of merged PRs to total PR attempts (merged + closed). It represents your success rate.',
    },
    {
      label: 'Current Score',
      value: Number(minerStats.totalScore).toFixed(2),
      rank: rankings?.score,
      subItems: [
        {
          label: 'Top PR',
          value: topPR ? parseFloat(topPR.score || '0').toFixed(2) : 'N/A',
        },
      ],
    },
    {
      label: 'Token Score',
      value: Number(minerStats.totalTokenScore || 0).toFixed(2),
      rank: null,
      subItems: [
        {
          label: 'Tokens Changed',
          value: Number(minerStats.totalNodesScored || 0).toLocaleString(),
        },
      ],
      tooltip:
        'Total token score from all merged PRs. Tokens are the individual code elements (functions, classes, etc.) that were scored.',
    },
    {
      label: 'PR Activity',
      value: `${Number(minerStats.totalPrs || 0)} PRs`,
      rank: rankings?.totalPrs,
      subItems: [
        {
          label: 'Lines',
          value: Number(
            (minerStats?.totalAdditions ?? 0) +
              (minerStats?.totalDeletions ?? 0),
          ).toLocaleString(),
        },
      ],
    },
    {
      label: 'Open Risk',
      value: `${Number(minerStats.totalOpenPrs || 0)} PRs`,
      rank: null,
      color: getOpenPrColor(
        Number(minerStats.totalOpenPrs || 0),
        openPrThreshold,
      ),
      subItems: [
        {
          label: 'Collateral',
          value:
            Number(minerStats.totalCollateralScore || 0) > 0
              ? `-${Number(minerStats.totalCollateralScore).toFixed(2)}`
              : '0.00',
          color:
            Number(minerStats.totalCollateralScore || 0) > 0
              ? 'rgba(248, 113, 113, 0.8)'
              : undefined,
        },
      ],
      tooltip: `Open PRs have collateral deducted from your score. Exceeding ${openPrThreshold} open PRs incurs drastic penalties.`,
    },
    {
      label: 'Est. Earnings',
      value: `$${Math.round(minerStats.usdPerDay ?? 0).toLocaleString()}`,
      rank: null,
      color: (minerStats.usdPerDay ?? 0) > 0 ? '#4ade80' : undefined,
      subItems: [
        {
          label: 'Monthly',
          value: `$${Math.round((minerStats.usdPerDay ?? 0) * 30).toLocaleString()}`,
          color: (minerStats.usdPerDay ?? 0) > 0 ? '#4ade80' : undefined,
        },
        {
          label: 'Lifetime',
          value: `$${Math.round(minerStats.lifetimeUsd ?? 0).toLocaleString()}`,
          // Color removed to reduce visual noise and prioritize active earnings
        },
      ],
      tooltip:
        'Estimated earnings based on current network incentive distribution. Actual payouts depend on validator consensus.',
    },
  ];

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        p: 3,
        mb: 3,
        position: 'relative',
      }}
      elevation={0}
    >
      {/* Last Updated Chip */}
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
            '& .MuiChip-icon': {
              color: 'rgba(255, 255, 255, 0.4)',
            },
          }}
        />
      )}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
        }}
      >
        {/* Identity Column */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
          <Avatar
            src={`https://avatars.githubusercontent.com/${username}`}
            alt={username}
            sx={{
              width: 80,
              height: 80,
              border: '2px solid rgba(255, 255, 255, 0.1)',
            }}
          />
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1.5,
                mb: 0.5,
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'stretch',
                  border: '1px solid',
                  borderColor:
                    minerStats.currentTier === 'Gold'
                      ? 'rgba(255, 215, 0, 0.5)'
                      : minerStats.currentTier === 'Silver'
                        ? 'rgba(192, 192, 192, 0.5)'
                        : minerStats.currentTier === 'Bronze'
                          ? 'rgba(205, 127, 50, 0.5)'
                          : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(0,0,0,0.2)',
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
                    borderColor:
                      minerStats.currentTier === 'Gold'
                        ? 'rgba(255, 215, 0, 0.3)'
                        : minerStats.currentTier === 'Silver'
                          ? 'rgba(192, 192, 192, 0.3)'
                          : minerStats.currentTier === 'Bronze'
                            ? 'rgba(205, 127, 50, 0.3)'
                            : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor:
                      minerStats.currentTier === 'Gold'
                        ? 'rgba(255, 215, 0, 0.1)'
                        : minerStats.currentTier === 'Silver'
                          ? 'rgba(192, 192, 192, 0.1)'
                          : minerStats.currentTier === 'Bronze'
                            ? 'rgba(205, 127, 50, 0.1)'
                            : 'transparent',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.875rem',
                      color:
                        minerStats.currentTier === 'Gold'
                          ? TIER_COLORS.gold
                          : minerStats.currentTier === 'Silver'
                            ? TIER_COLORS.silver
                            : minerStats.currentTier === 'Bronze'
                              ? TIER_COLORS.bronze
                              : 'rgba(255, 255, 255, 0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontWeight: 700,
                    }}
                  >
                    {minerStats.currentTier || 'Unranked'} Tier
                  </Typography>
                </Box>
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
                fontSize: '1.1rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': { textDecoration: 'underline' },
                mb: 1,
              }}
            >
              <GitHubIcon fontSize="small" />@{username}
            </Typography>

            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
            >
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Hotkey:
              </Typography>
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                }}
              >
                {minerStats.hotkey || 'N/A'}
              </Typography>
            </Box>

            {/* Current Tier Badge & Earnings */}
          </Box>
        </Box>

        {/* Divider for mobile */}
        <Divider
          sx={{
            display: { xs: 'block', md: 'none' },
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        />

        {/* Extended Details Column */}
        {githubData && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Bio */}
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

            {/* Badges/Tags */}
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
                    color: '#58a6ff',
                    borderColor: 'rgba(88, 166, 255, 0.3)',
                    '& .MuiChip-icon': { color: '#58a6ff' },
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
              {githubData.hireable && (
                <Chip
                  icon={<HireableIcon />}
                  label="Open to Work"
                  color="success"
                  variant="outlined"
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

      <Grid container spacing={2}>
        {statItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Box
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  {item.tooltip ? (
                    <Tooltip
                      title={item.tooltip}
                      arrow
                      placement="top"
                      slotProps={{
                        tooltip: {
                          sx: {
                            backgroundColor: 'rgba(30, 30, 30, 0.95)',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontFamily: '"JetBrains Mono", monospace',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            maxWidth: 240,
                          },
                        },
                        arrow: {
                          sx: {
                            color: 'rgba(30, 30, 30, 0.95)',
                          },
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          color:
                            item.icon === 'earnings'
                              ? '#4ade80'
                              : 'rgba(255, 255, 255, 0.5)',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.9rem',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          cursor: 'pointer',
                        }}
                      >
                        {item.icon === 'earnings' && (
                          <EarningsIcon sx={{ fontSize: '1rem' }} />
                        )}
                        {item.label}
                        <InfoOutlinedIcon sx={{ fontSize: '0.85rem' }} />
                      </Typography>
                    </Tooltip>
                  ) : (
                    <Typography
                      sx={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      {item.icon === 'earnings' && (
                        <EarningsIcon
                          sx={{ fontSize: '1rem', color: '#4ade80' }}
                        />
                      )}
                      {item.label}
                    </Typography>
                  )}
                  {item.rank && (
                    <Box
                      sx={{
                        backgroundColor: '#000000',
                        borderRadius: '2px',
                        width: '18px',
                        height: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid',
                        borderColor:
                          item.rank === 1
                            ? 'rgba(255, 215, 0, 0.4)'
                            : item.rank === 2
                              ? 'rgba(192, 192, 192, 0.4)'
                              : item.rank === 3
                                ? 'rgba(205, 127, 50, 0.4)'
                                : 'rgba(255, 255, 255, 0.15)',
                        boxShadow:
                          item.rank === 1
                            ? '0 0 12px rgba(255, 215, 0, 0.4), 0 0 4px rgba(255, 215, 0, 0.2)'
                            : item.rank === 2
                              ? '0 0 12px rgba(192, 192, 192, 0.4), 0 0 4px rgba(192, 192, 192, 0.2)'
                              : item.rank === 3
                                ? '0 0 12px rgba(205, 127, 50, 0.4), 0 0 4px rgba(205, 127, 50, 0.2)'
                                : 'none',
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          color:
                            item.rank === 1
                              ? '#FFD700'
                              : item.rank === 2
                                ? '#C0C0C0'
                                : item.rank === 3
                                  ? '#CD7F32'
                                  : 'rgba(255, 255, 255, 0.6)',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.rank}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Typography
                  sx={{
                    color: item.color || '#ffffff',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '1.75rem',
                    fontWeight: 600,
                    wordBreak: 'break-all',
                    lineHeight: 1.2,
                  }}
                >
                  {item.label === 'Est. Earnings' ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                            textTransform: 'uppercase',
                          }}
                        >
                          Daily:
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: item.color,
                          }}
                        >
                          {String(item.value)}
                        </Typography>
                      </Box>

                      {item.subItems && item.subItems[0] && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.75rem',
                              color: 'rgba(255, 255, 255, 0.5)',
                              textTransform: 'uppercase',
                            }}
                          >
                            Monthly:
                          </Typography>
                          <Typography
                            component="span"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '1.5rem',
                              fontWeight: 600,
                              color: item.subItems[0].color,
                            }}
                          >
                            {item.subItems[0].value}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    String(item.value)
                  )}
                </Typography>
              </Box>
              {item.subItems && item.subItems.length > 0 && (
                <Box
                  sx={{
                    mt: 1.5,
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    pt: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {item.subItems.map((sub, subIndex) => {
                    if (item.label === 'Est. Earnings' && subIndex === 0)
                      return null;
                    return (
                      <Typography
                        key={subIndex}
                        sx={{
                          color: sub.color || 'rgba(255, 255, 255, 0.4)',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.85rem',
                        }}
                      >
                        {sub.label}: {sub.value}
                      </Typography>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );
};

export default MinerScoreCard;

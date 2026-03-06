import React, { useMemo } from 'react';
import {
  Card,
  Typography,
  Box,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import {
  useMinerStats,
  useMinerPRs,
  useReposAndWeights,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

interface EarningsOverviewProps {
  githubId: string;
}

const EarningsOverview: React.FC<EarningsOverviewProps> = ({ githubId }) => {
  const { data: minerStats, isLoading } = useMinerStats(githubId);
  const { data: prs } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();

  // Build repo tier map
  const repoTiers = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo?.fullName) {
          map.set(repo.fullName, repo.tier || '');
        }
      });
    }
    return map;
  }, [repos]);

  // Earnings by tier
  const tierEarnings = useMemo(() => {
    if (!minerStats) return { bronze: 0, silver: 0, gold: 0 };
    return {
      bronze: Number(minerStats.bronzeScore || 0),
      silver: Number(minerStats.silverScore || 0),
      gold: Number(minerStats.goldScore || 0),
    };
  }, [minerStats]);

  // Build historical score trend from PRs (grouped by month)
  const scoreTrend = useMemo(() => {
    if (!prs || prs.length === 0) return [];

    const monthlyScores = new Map<string, number>();
    const sortedPrs = [...prs]
      .filter((pr) => pr.mergedAt)
      .sort(
        (a, b) =>
          new Date(a.mergedAt!).getTime() - new Date(b.mergedAt!).getTime(),
      );

    sortedPrs.forEach((pr) => {
      const date = new Date(pr.mergedAt!);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyScores.get(key) || 0;
      monthlyScores.set(key, existing + parseFloat(pr.score || '0'));
    });

    return Array.from(monthlyScores.entries()).map(([month, score]) => ({
      month,
      score,
    }));
  }, [prs]);

  // Top repos by score contribution
  const topRepos = useMemo(() => {
    if (!prs) return [];
    const repoScores = new Map<string, number>();
    prs.forEach((pr) => {
      const existing = repoScores.get(pr.repository) || 0;
      repoScores.set(pr.repository, existing + parseFloat(pr.score || '0'));
    });
    return Array.from(repoScores.entries())
      .map(([repo, score]) => ({
        repo,
        score,
        tier: repoTiers.get(repo) || '',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [prs, repoTiers]);

  // ECharts option for score trend
  const chartOption = useMemo(() => {
    if (scoreTrend.length === 0) return null;
    return {
      backgroundColor: 'transparent',
      grid: {
        left: '10%',
        right: '5%',
        top: '15%',
        bottom: '15%',
      },
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          color: '#ffffff',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
        },
      },
      xAxis: {
        type: 'category' as const,
        data: scoreTrend.map((d) => d.month),
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.4)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
        },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.4)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
        },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
      },
      series: [
        {
          name: 'Score',
          type: 'line',
          data: scoreTrend.map((d) => d.score.toFixed(2)),
          smooth: true,
          lineStyle: {
            color: '#1d37fc',
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(29, 55, 252, 0.3)' },
                { offset: 1, color: 'rgba(29, 55, 252, 0.02)' },
              ],
            },
          },
          itemStyle: {
            color: '#1d37fc',
          },
        },
      ],
    };
  }, [scoreTrend]);

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <CircularProgress size={30} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (!minerStats) return null;

  const dailyUsd = minerStats.usdPerDay ?? 0;
  const dailyTao = minerStats.taoPerDay ?? 0;
  const dailyAlpha = minerStats.alphaPerDay ?? 0;
  const lifetimeUsd = minerStats.lifetimeUsd ?? 0;
  const lifetimeTao = minerStats.lifetimeTao ?? 0;

  const getTierColor = (tier: string): string => {
    switch (tier.toLowerCase()) {
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

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        p: 3,
      }}
      elevation={0}
    >
      <Typography
        variant="h6"
        sx={{
          color: '#ffffff',
          fontFamily: '"JetBrains Mono", monospace',
          mb: 3,
          fontWeight: 600,
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          '&::before': {
            content: '""',
            width: '4px',
            height: '20px',
            backgroundColor: STATUS_COLORS.success,
            borderRadius: '2px',
          },
        }}
      >
        Earnings Overview
      </Typography>

      {/* Earnings summary cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Daily */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            backgroundColor: alpha(STATUS_COLORS.success, 0.05),
            border: `1px solid ${alpha(STATUS_COLORS.success, 0.15)}`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
            }}
          >
            <WalletIcon
              sx={{ fontSize: '1rem', color: STATUS_COLORS.success }}
            />
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Daily
            </Typography>
          </Box>
          <Typography
            sx={{
              color: STATUS_COLORS.success,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.5rem',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            ${Math.round(dailyUsd).toLocaleString()}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              mt: 0.5,
            }}
          >
            {dailyTao.toFixed(4)} TAO / {dailyAlpha.toFixed(4)} ALPHA
          </Typography>
        </Box>

        {/* Monthly */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
            }}
          >
            <TrendIcon sx={{ fontSize: '1rem', color: '#a3e635' }} />
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Monthly (Est.)
            </Typography>
          </Box>
          <Typography
            sx={{
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.5rem',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            ${Math.round(dailyUsd * 30).toLocaleString()}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              mt: 0.5,
            }}
          >
            {(dailyTao * 30).toFixed(2)} TAO
          </Typography>
        </Box>

        {/* Lifetime */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
            }}
          >
            <WalletIcon
              sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.5)' }}
            />
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Lifetime
            </Typography>
          </Box>
          <Typography
            sx={{
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.5rem',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            ${Math.round(lifetimeUsd).toLocaleString()}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              mt: 0.5,
            }}
          >
            {lifetimeTao.toFixed(2)} TAO
          </Typography>
        </Box>
      </Box>

      {/* Score trend chart */}
      {chartOption && (
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              mb: 1.5,
              fontWeight: 600,
            }}
          >
            Score Contribution Trend
          </Typography>
          <ReactECharts
            option={chartOption}
            style={{ height: 200, width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </Box>
      )}

      {/* Earnings by tier + top repos */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        {/* By tier */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              mb: 1.5,
              fontWeight: 600,
            }}
          >
            Score by Tier
          </Typography>
          {(['bronze', 'silver', 'gold'] as const).map((tier) => {
            const score =
              tierEarnings[tier];
            const totalScore = Number(minerStats.totalScore || 1);
            const pct = totalScore > 0 ? (score / totalScore) * 100 : 0;
            return (
              <Box key={tier} sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.25,
                  }}
                >
                  <Typography
                    sx={{
                      color: getTierColor(tier),
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {tier}
                  </Typography>
                  <Typography
                    sx={{
                      color: '#ffffff',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {score.toFixed(2)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 3,
                      backgroundColor: getTierColor(tier),
                      transition: 'width 0.5s ease',
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Top repos */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              mb: 1.5,
              fontWeight: 600,
            }}
          >
            Top Repos by Score
          </Typography>
          {topRepos.map((repo, i) => (
            <Box
              key={repo.repo}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 0.75,
                borderBottom:
                  i < topRepos.length - 1
                    ? '1px solid rgba(255, 255, 255, 0.05)'
                    : 'none',
              }}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                {repo.tier && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: getTierColor(repo.tier),
                      flexShrink: 0,
                    }}
                  />
                )}
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                  }}
                >
                  {repo.repo}
                </Typography>
              </Box>
              <Typography
                sx={{
                  color: '#ffffff',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {repo.score.toFixed(2)}
              </Typography>
            </Box>
          ))}
          {topRepos.length === 0 && (
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.3)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                textAlign: 'center',
                py: 2,
              }}
            >
              No repository data
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  );
};

export default EarningsOverview;

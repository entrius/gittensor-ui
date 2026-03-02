import React, { useMemo } from 'react';
import { Box, Card, Grid, Typography, alpha } from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  CalendarMonth as CalendarIcon,
  Savings as SavingsIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import { useMinerStats } from '../../api';
import { STATUS_COLORS } from '../../theme';
import { parseNumber } from './explorerUtils';

interface MinerEarningsDashboardProps {
  githubId: string;
}

interface EarningsMetric {
  label: string;
  amount: number;
  description: string;
  accent: string;
}

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
};

const buildEarningsMetrics = (
  dailyUsd: number,
  lifetimeUsd: number,
): EarningsMetric[] => {
  const projections = [
    { label: 'Daily Projection', amount: dailyUsd, days: 1, accent: STATUS_COLORS.success },
    { label: 'Monthly Projection', amount: dailyUsd * 30, days: 30, accent: '#84cc16' },
    { label: 'Yearly Projection', amount: dailyUsd * 365, days: 365, accent: '#facc15' },
  ];

  return [
    ...projections.map((item) => ({
      label: item.label,
      amount: item.amount,
      description:
        item.days === 1
          ? 'Based on current emissions and contribution score'
          : `Assuming your current daily rate for ${item.days} days`,
      accent: item.accent,
    })),
    {
      label: 'Lifetime Earned',
      amount: lifetimeUsd,
      description: 'Total USD earned from merged contributions',
      accent: '#60a5fa',
    },
  ];
};

const MinerEarningsDashboard: React.FC<MinerEarningsDashboardProps> = ({
  githubId,
}) => {
  const { data: minerStats } = useMinerStats(githubId);

  const metrics = useMemo(() => {
    if (!minerStats) return [];
    const dailyUsd = Math.max(parseNumber(minerStats.usdPerDay), 0);
    const lifetimeUsd = Math.max(parseNumber(minerStats.lifetimeUsd), 0);
    return buildEarningsMetrics(dailyUsd, lifetimeUsd);
  }, [minerStats]);

  if (!minerStats) return null;

  const [daily, monthly, yearly, lifetime] = metrics;

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
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            color: '#fff',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1.1rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <MoneyIcon sx={{ color: STATUS_COLORS.success }} />
          Earnings Overview
        </Typography>
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.85rem',
            mt: 0.75,
          }}
        >
          Your rewards are driven by merged PR score quality, credibility, and
          open-PR risk. Use these projections to plan contribution targets.
        </Typography>
      </Box>

      <Box
        sx={{
          borderRadius: 2.5,
          px: { xs: 2, sm: 3 },
          py: { xs: 2.5, sm: 3 },
          mb: 2,
          border: `1px solid ${alpha(STATUS_COLORS.success, 0.25)}`,
          background: `linear-gradient(135deg, ${alpha(STATUS_COLORS.success, 0.16)} 0%, ${alpha(STATUS_COLORS.success, 0.02)} 100%)`,
        }}
      >
        <Typography
          sx={{
            color: alpha(STATUS_COLORS.success, 0.85),
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.72rem',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          <TrendIcon sx={{ fontSize: '0.95rem' }} />
          Current Daily Earnings
        </Typography>
        <Typography
          sx={{
            color: STATUS_COLORS.success,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: { xs: '2rem', sm: '2.7rem' },
            fontWeight: 700,
            mt: 1,
            mb: 0.5,
            lineHeight: 1.1,
          }}
        >
          {daily ? formatCurrency(daily.amount) : '$0.00'}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
          {daily?.description}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {[monthly, yearly, lifetime].map(
          (metric) =>
            metric && (
              <Grid item xs={12} md={4} key={metric.label}>
                <Box
                  sx={{
                    borderRadius: 2,
                    p: 2,
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    height: '100%',
                  }}
                >
                  <Typography
                    sx={{
                      color: metric.accent,
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.72rem',
                      letterSpacing: '0.45px',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    <CalendarIcon sx={{ fontSize: '0.9rem' }} />
                    {metric.label}
                  </Typography>
                  <Typography
                    sx={{
                      color: '#fff',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '1.45rem',
                      fontWeight: 600,
                      mt: 1.2,
                    }}
                  >
                    {formatCurrency(metric.amount)}
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.52)',
                      fontSize: '0.78rem',
                      mt: 0.5,
                      lineHeight: 1.45,
                    }}
                  >
                    {metric.description}
                  </Typography>
                </Box>
              </Grid>
            ),
        )}
      </Grid>

      <Box
        sx={{
          mt: 2,
          p: 1.5,
          borderRadius: 1.5,
          border: `1px solid ${alpha(STATUS_COLORS.info, 0.2)}`,
          backgroundColor: alpha(STATUS_COLORS.info, 0.08),
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <SavingsIcon sx={{ color: STATUS_COLORS.info, fontSize: '1rem', mt: 0.1 }} />
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.68)',
            fontSize: '0.76rem',
            lineHeight: 1.45,
          }}
        >
          Projections update as your merged score, credibility, and open PR
          collateral change. High-quality merged contributions and low open PR
          backlog generally improve daily earnings.
        </Typography>
      </Box>
    </Card>
  );
};

export default MinerEarningsDashboard;

import React, { useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  alpha,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import {
  AttachMoney as EarningsIcon,
  TrendingUp as GrowthIcon,
  AccountBalanceWallet as WalletIcon,
  CalendarToday as DateIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useMinerStats } from '../../api';
import { STATUS_COLORS } from '../../theme';

interface EarningsDashboardProps {
  githubId: string;
}

const MinerEarningsDashboard: React.FC<EarningsDashboardProps> = ({ githubId }) => {
  const { data: minerStats } = useMinerStats(githubId);

  if (!minerStats) return null;

  // Calculate earnings trends
  const earningsData = useMemo(() => {
    const daily = minerStats.usdPerDay ?? 0;
    const monthly = daily * 30;
    const yearly = daily * 365;
    const lifetime = minerStats.lifetimeUsd ?? 0;

    // Calculate growth indicators (simplified - in production would use historical data)
    const growthRate = Math.min((daily / Math.max(daily - 1, 0.01) - 1) * 100, 50);

    return {
      daily,
      monthly,
      yearly,
      lifetime,
      growthRate,
    };
  }, [minerStats]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${Math.round(value).toLocaleString()}`;
  };

  const MetricCard: React.FC<{
    title: string;
    value: string;
    subtitle: string;
    color?: string;
    growth?: number;
    icon: React.ReactNode;
  }> = ({ title, value, subtitle, color, growth, icon }) => (
    <Box
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 2.5,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: alpha(color || 'primary.main', 0.2),
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          opacity: 0.03,
          fontSize: 120,
          color: color || 'primary.main',
        }}
      >
        {icon}
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                backgroundColor: alpha(color || 'primary.main', 0.1),
                color: color || 'primary.main',
              }}
            >
              {icon}
            </Box>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600,
              }}
            >
              {title}
            </Typography>
          </Box>

          {growth !== undefined && (
            <Chip
              size="small"
              icon={growth >= 0 ? <UpIcon fontSize="small" /> : <DownIcon fontSize="small" />}
              label={`${Math.abs(growth).toFixed(1)}%`}
              sx={{
                backgroundColor: alpha(
                  growth >= 0 ? STATUS_COLORS.success : 'rgba(248, 113, 113, 0.2)',
                  0.15,
                ),
                color: growth >= 0 ? STATUS_COLORS.success : 'rgba(248, 113, 113, 0.9)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                fontWeight: 600,
                '& .MuiChip-icon': {
                  fontSize: '0.75rem',
                  color: 'inherit',
                },
              }}
            />
          )}
        </Box>

        <Typography
          sx={{
            color: color || '#ffffff',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '2rem',
            fontWeight: 700,
            mb: 0.5,
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>

        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <DateIcon sx={{ fontSize: '0.75rem' }} />
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );

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
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            color: '#ffffff',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1.25rem',
            fontWeight: 700,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <WalletIcon sx={{ color: STATUS_COLORS.success }} />
          Earnings Dashboard
        </Typography>
        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.9rem',
            maxWidth: 600,
          }}
        >
          Track your mining earnings and projected revenue. Payouts are distributed daily based on your contribution scores.
        </Typography>
      </Box>

      {/* Primary Earnings Card */}
      <Box
        sx={{
          p: 4,
          borderRadius: 2.5,
          background: `linear-gradient(135deg, ${alpha(STATUS_COLORS.success, 0.1)} 0%, ${alpha(STATUS_COLORS.success, 0.02)} 100%)`,
          border: `1px solid ${alpha(STATUS_COLORS.success, 0.2)}`,
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <EarningsIcon sx={{ fontSize: '0.9rem', color: STATUS_COLORS.success }} />
            Current Daily Earnings
          </Typography>

          <Typography
            sx={{
              color: STATUS_COLORS.success,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '3.5rem',
              fontWeight: 800,
              mb: 1,
              textShadow: `0 0 30px ${alpha(STATUS_COLORS.success, 0.3)}`,
            }}
          >
            {formatCurrency(earningsData.daily)}
          </Typography>

          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.85rem',
            }}
          >
            Earned daily based on your contribution score and network emissions
          </Typography>
        </Box>

        {/* Decorative glow */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            backgroundColor: alpha(STATUS_COLORS.success, 0.1),
            borderRadius: '50%',
            filter: 'blur(60px)',
          }}
        />
      </Box>

      {/* Breakdown Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Monthly Projection"
            value={formatCurrency(earningsData.monthly)}
            subtitle="Based on current daily rate"
            color="#a3e635"
            growth={earningsData.growthRate}
            icon={<CalendarToday />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Yearly Projection"
            value={formatCurrency(earningsData.yearly)}
            subtitle="Estimated annual income"
            color="#facc15"
            icon={<TrendingUp />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Lifetime Earnings"
            value={formatCurrency(earningsData.lifetime)}
            subtitle="All-time total earned"
            color="#60a5fa"
            icon={<AttachMoney />}
          />
        </Grid>
      </Grid>

      {/* Info Banner */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          borderRadius: 1.5,
          backgroundColor: alpha(STATUS_COLORS.info, 0.05),
          border: `1px solid ${alpha(STATUS_COLORS.info, 0.15)}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
        }}
      >
        <InfoIcon sx={{ color: STATUS_COLORS.info, fontSize: '1rem', mt: 0.25, flexShrink: 0 }} />
        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.8rem',
            lineHeight: 1.5,
          }}
        >
          Actual payouts depend on validator consensus and network conditions. Projections are estimates based on current
          score and emissions. High credibility and low open PR risk maximize your earnings potential.
        </Typography>
      </Box>
    </Card>
  );
};

export default MinerEarningsDashboard;

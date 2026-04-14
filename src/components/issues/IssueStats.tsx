import React from 'react';
import { Skeleton, Box } from '@mui/material';
import { IssuesStats } from '../../api/models/Issues';
import { useStats } from '../../api';
import KpiCard from '../dashboard/KpiCard';
import { formatTokenAmount } from '../../utils/format';
import { STATUS_COLORS } from '../../theme';

const formatUsd = (
  alphaAmount: string | undefined,
  taoPrice: number,
  alphaPrice: number,
): string | undefined => {
  if (!alphaAmount) return undefined;
  const amount = parseFloat(alphaAmount);
  if (isNaN(amount) || amount === 0) return undefined;
  const usd = amount * alphaPrice * taoPrice;
  return `~${usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`;
};

interface IssueStatsProps {
  stats?: IssuesStats;
  isLoading?: boolean;
}

const IssueStats: React.FC<IssueStatsProps> = ({
  stats,
  isLoading = false,
}) => {
  const { data: dashStats } = useStats();
  const taoPrice = dashStats?.prices?.tao?.data?.price ?? 0;
  const alphaPrice = dashStats?.prices?.alpha?.data?.price ?? 0;
  const hasPrices = taoPrice > 0 && alphaPrice > 0;

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          width: '100%',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <Box
            key={i}
            sx={{
              p: 2,
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
            }}
          >
            <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={36} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(4, 1fr)',
        },
        gap: 2,
        width: '100%',
      }}
    >
      <KpiCard
        title="Total Issues"
        value={stats?.totalIssues ?? 0}
        subtitle="All registered issues"
      />
      <KpiCard
        title="Active Issues"
        value={stats?.activeIssues ?? 0}
        subtitle="Available for solving"
      />
      <KpiCard
        title="Bounty Pool"
        value={`${formatTokenAmount(stats?.totalBountyPool)} ل`}
        subtitle={
          hasPrices
            ? (formatUsd(stats?.totalBountyPool, taoPrice, alphaPrice) ??
              'Total available')
            : 'Total available'
        }
      />
      <KpiCard
        title="Total Payouts"
        value={`${formatTokenAmount(stats?.totalPayouts)} ل`}
        subtitle={
          hasPrices
            ? (formatUsd(stats?.totalPayouts, taoPrice, alphaPrice) ??
              'Paid to solvers')
            : 'Paid to solvers'
        }
        sx={{
          '& .MuiTypography-h4': {
            color: STATUS_COLORS.merged,
          },
        }}
      />
    </Box>
  );
};

export default IssueStats;

import React from 'react';
import { Skeleton, Box } from '@mui/material';
import { IssuesStats } from '../../api/models/Issues';
import KpiCard from '../KpiCard';
import { formatTokenAmount, formatAlphaToUsd } from '../../utils/format';
import { usePrices } from '../../hooks/usePrices';

interface IssueStatsProps {
  stats?: IssuesStats;
  isLoading?: boolean;
}

const IssueStats: React.FC<IssueStatsProps> = ({
  stats,
  isLoading = false,
}) => {
  const { taoPrice, alphaPrice, hasPrices } = usePrices();
  const cards = [
    {
      title: 'Total Issues',
      value: stats?.totalIssues ?? 0,
      subtitle: 'All registered issues',
    },
    {
      title: 'Available Issues',
      value: stats?.activeIssues ?? 0,
      subtitle: 'Available for solving',
    },
    {
      title: 'Bounty Pool',
      value: `${formatTokenAmount(stats?.totalBountyPool)} ل`,
      subtitle: hasPrices
        ? (formatAlphaToUsd(stats?.totalBountyPool, taoPrice, alphaPrice) ??
          'Total available')
        : 'Total available',
    },
    {
      title: 'Total Payouts',
      value: `${formatTokenAmount(stats?.totalPayouts)} ل`,
      subtitle: hasPrices
        ? (formatAlphaToUsd(stats?.totalPayouts, taoPrice, alphaPrice) ??
          'Paid to solvers')
        : 'Paid to solvers',
      sx: {
        '& .MuiTypography-h4': {
          color: 'status.merged',
        },
      },
    },
  ];

  const gridSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: 'repeat(2, minmax(0, 1fr))',
      sm: 'repeat(4, minmax(0, 1fr))',
    },
    gap: 2,
    width: '100%',
  } as const;

  if (isLoading) {
    return (
      <Box sx={gridSx}>
        {[1, 2, 3, 4].map((i) => (
          <Box key={i}>
            <Box
              sx={{
                p: 2,
                backgroundColor: 'transparent',
                border: '1px solid',
                borderColor: 'border.light',
                borderRadius: 3,
              }}
            >
              <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={36} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={gridSx}>
      {cards.map((card) => (
        <Box key={card.title}>
          <KpiCard
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            sx={card.sx}
          />
        </Box>
      ))}
    </Box>
  );
};

export default IssueStats;

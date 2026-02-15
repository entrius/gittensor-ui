import React from 'react';
import { Grid, Skeleton, Box } from '@mui/material';
import { IssuesStats } from '../../api/models/Issues';
import KpiCard from '../dashboard/KpiCard';
import { formatTokenAmount } from '../../utils/format';

interface IssueStatsProps {
  stats?: IssuesStats;
  isLoading?: boolean;
}

const IssueStats: React.FC<IssueStatsProps> = ({
  stats,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Box
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
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={6} sm={3}>
        <KpiCard
          title="Total Issues"
          value={stats?.totalIssues ?? 0}
          subtitle="All registered issues"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <KpiCard
          title="Active Issues"
          value={stats?.activeIssues ?? 0}
          subtitle="Available for solving"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <KpiCard
          title="Bounty Pool"
          value={`${formatTokenAmount(stats?.totalBountyPool)} ل`}
          subtitle="Total available"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <KpiCard
          title="Total Payouts"
          value={`${formatTokenAmount(stats?.totalPayouts)} ل`}
          subtitle="Paid to solvers"
        />
      </Grid>
    </Grid>
  );
};

export default IssueStats;

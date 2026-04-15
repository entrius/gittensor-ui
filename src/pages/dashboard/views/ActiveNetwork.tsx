import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import {
  type DashboardKpi,
  type DashboardOverviewSection,
  type DashboardTrendSeries,
  type TrendTimeRange,
} from '../dashboardData';
import ContributionTrends from './ContributionTrends';
import DashboardOverview from './DashboardOverview';

interface ActiveNetworkProps {
  range: TrendTimeRange;
  trendLabels: string[];
  trendSeries: DashboardTrendSeries[];
  sections: DashboardOverviewSection[];
  kpis: DashboardKpi[];
  isLoading?: boolean;
  onRangeChange: (range: TrendTimeRange) => void;
}

const ActiveNetwork: React.FC<ActiveNetworkProps> = ({
  range,
  trendLabels,
  trendSeries,
  sections,
  kpis,
  isLoading = false,
  onRangeChange,
}) => {
  return (
    <Box
      sx={{
        width: '100%',
        p: { xs: 1.45, sm: 1.65 },
        borderRadius: 3,
        border: (muiTheme) => `1px solid ${muiTheme.palette.border.light}`,
        backgroundColor: 'transparent',
      }}
    >
      <ContributionTrends
        range={range}
        labels={trendLabels}
        series={trendSeries}
        isLoading={isLoading}
        onRangeChange={onRangeChange}
      />

      {isLoading ? (
        <Box
          sx={{
            minHeight: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} />
        </Box>
      ) : (
        <DashboardOverview range={range} sections={sections} kpis={kpis} />
      )}
    </Box>
  );
};

export default ActiveNetwork;

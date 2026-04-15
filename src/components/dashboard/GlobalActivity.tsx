import React, { useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  CircularProgress,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import CodeOffIcon from '@mui/icons-material/CodeOff';
import { subDays, format } from 'date-fns';
import { useAllMiners, useAllPrs } from '../../api';
import { TEXT_OPACITY } from '../../theme';
import ContributionHeatmap from './ContributionHeatmap';
import PRStatusChart from './PRStatusChart';

const GlobalActivity: React.FC = () => {
  const theme = useTheme();
  const { data: allMinerStats, isLoading: isLoadingStats } = useAllMiners();
  const { data: allPrs, isLoading: isLoadingPRs } = useAllPrs();

  // Calculate Heatmap Data
  const { contributionData, contributionsLast30Days, totalDaysShown } =
    useMemo(() => {
      if (!Array.isArray(allPrs) || allPrs.length === 0) {
        return {
          contributionData: [],
          contributionsLast30Days: 0,
          totalDaysShown: 0,
        };
      }

      const today = new Date();
      let earliestDate = today;

      allPrs.forEach((pr) => {
        if (pr?.mergedAt) {
          const d = new Date(pr.mergedAt);
          if (!isNaN(d.getTime()) && d < earliestDate) earliestDate = d;
        }
      });

      const diffTime = Math.abs(today.getTime() - earliestDate.getTime());
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysToShow = isNaN(daysDiff) ? 1 : Math.max(daysDiff, 1);

      const dataMap = new Map<string, number>();
      for (let i = daysToShow; i >= 0; i--) {
        dataMap.set(format(subDays(today, i), 'yyyy-MM-dd'), 0);
      }

      let last30Count = 0;
      const thirtyDaysAgo = subDays(today, 30);

      allPrs.forEach((pr) => {
        if (!pr?.mergedAt) return;
        const date = new Date(pr.mergedAt);
        if (isNaN(date.getTime())) return;

        const dateStr = format(date, 'yyyy-MM-dd');
        if (dataMap.has(dateStr)) {
          dataMap.set(dateStr, (dataMap.get(dateStr) || 0) + 1);
        }
        if (date >= thirtyDaysAgo) last30Count++;
      });

      let maxDaily = 0;
      dataMap.forEach((count) => {
        if (count > maxDaily) maxDaily = count;
      });

      const data = Array.from(dataMap.entries())
        .map(([date, count]) => {
          let level: 0 | 1 | 2 | 3 | 4 = 0;
          if (count > 0) level = 1;
          if (count >= maxDaily * 0.25) level = 2;
          if (count >= maxDaily * 0.5) level = 3;
          if (count >= maxDaily * 0.75) level = 4;
          return { date, count, level };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        contributionData: data,
        contributionsLast30Days: last30Count,
        totalDaysShown: daysToShow,
      };
    }, [allPrs]);

  // Calculate Active/Inactive Stats
  const { activeStats, inactiveStats } = useMemo(() => {
    const defaultStats = { merged: 0, open: 0, closed: 0, total: 0 };

    if (!Array.isArray(allMinerStats)) {
      return {
        activeStats: { ...defaultStats, credibility: 0 },
        inactiveStats: { ...defaultStats, credibility: 0 },
      };
    }

    const active = { ...defaultStats };
    const inactive = { ...defaultStats };

    allMinerStats.forEach((m) => {
      const target = m.isEligible ? active : inactive;

      target.merged += m.totalMergedPrs || 0;
      target.open += m.totalOpenPrs || 0;
      target.closed += m.totalClosedPrs || 0;
      target.total += 1;
    });

    return {
      activeStats: {
        ...active,
        credibility:
          active.merged + active.closed > 0
            ? active.merged / (active.merged + active.closed)
            : 0,
      },
      inactiveStats: {
        ...inactive,
        credibility:
          inactive.merged + inactive.closed > 0
            ? inactive.merged / (inactive.merged + inactive.closed)
            : 0,
      },
    };
  }, [allMinerStats]);

  // Calculate Active/Inactive Discovery Stats
  const { activeDiscoveryStats, inactiveDiscoveryStats } = useMemo(() => {
    const defaultStats = { merged: 0, open: 0, closed: 0 };

    if (!Array.isArray(allMinerStats)) {
      return {
        activeDiscoveryStats: { ...defaultStats, credibility: 0 },
        inactiveDiscoveryStats: { ...defaultStats, credibility: 0 },
      };
    }

    const active = { ...defaultStats };
    const inactive = { ...defaultStats };

    allMinerStats.forEach((m) => {
      const target = m.isIssueEligible ? active : inactive;
      target.merged += m.totalSolvedIssues || 0;
      target.open += m.totalOpenIssues || 0;
      target.closed += m.totalClosedIssues || 0;
    });

    return {
      activeDiscoveryStats: {
        ...active,
        credibility:
          active.merged + active.closed > 0
            ? active.merged / (active.merged + active.closed)
            : 0,
      },
      inactiveDiscoveryStats: {
        ...inactive,
        credibility:
          inactive.merged + inactive.closed > 0
            ? inactive.merged / (inactive.merged + inactive.closed)
            : 0,
      },
    };
  }, [allMinerStats]);

  if (isLoadingPRs || isLoadingStats) {
    return (
      <Card sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={30} />
      </Card>
    );
  }

  const hasNoData = !allPrs || allPrs.length === 0;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="sectionTitle">
          Global Developer Activity
        </Typography>
        <Chip
          variant="status"
          icon={<PublicIcon />}
          label="Active Network - Continuous Development"
          sx={{
            color: theme.palette.status.success,
            borderColor: alpha(theme.palette.status.success, 0.3),
            '& .MuiChip-icon': { color: theme.palette.status.success },
          }}
        />
      </Box>

      {hasNoData ? (
        <Card
          sx={{
            p: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CodeOffIcon
            sx={{
              fontSize: 48,
              color: alpha(theme.palette.common.white, TEXT_OPACITY.ghost),
              mb: 2,
            }}
          />
          <Typography
            sx={{
              color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            No activity data available yet
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {/* Heatmap */}
          <Grid item xs={12} lg={7}>
            <ContributionHeatmap
              data={contributionData}
              contributionsLast30Days={contributionsLast30Days}
              totalDaysShown={totalDaysShown}
            />
          </Grid>

          {/* Active & Inactive Stats */}
          <Grid item xs={12} lg={5}>
            <Card
              sx={(theme) => ({
                height: '100%',
                p: { xs: 1.5, sm: 3 },
                display: 'flex',
                flexDirection: 'column',
                [theme.breakpoints.between('lg', 'xl')]: { padding: '16px' },
                overflow: 'visible',
              })}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: { xs: 1, sm: 3, lg: 1.5, xl: 3 },
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <PRStatusChart
                  stats={activeStats}
                  title="Active"
                  subtitle="Paid"
                  variant="primary"
                />
                <PRStatusChart
                  stats={inactiveStats}
                  title="Unranked"
                  subtitle="Unpaid"
                  variant="secondary"
                />
              </Box>
            </Card>
          </Grid>

          {/* Issue Discoveries Stats */}
          <Grid item xs={12}>
            <Card
              sx={{
                p: { xs: 1.5, sm: 3 },
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible',
              }}
            >
              <Typography
                variant="sectionTitle"
                sx={{ mb: 2, fontSize: '0.95rem' }}
              >
                Issue Discoveries
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: { xs: 1, sm: 3, lg: 1.5, xl: 3 },
                }}
              >
                <PRStatusChart
                  stats={activeDiscoveryStats}
                  title="Eligible"
                  subtitle="Paid"
                  variant="primary"
                  statLabels={{ merged: 'Solved', open: 'Open', closed: 'Closed' }}
                />
                <PRStatusChart
                  stats={inactiveDiscoveryStats}
                  title="Ineligible"
                  subtitle="Unpaid"
                  variant="secondary"
                  statLabels={{ merged: 'Solved', open: 'Open', closed: 'Closed' }}
                />
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default GlobalActivity;

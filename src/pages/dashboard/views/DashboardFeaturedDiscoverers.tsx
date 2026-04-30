import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import {
  type DashboardDiscoveryPulse,
  type DashboardFeaturedDiscoverer,
} from '../dashboardData';
import {
  SpotlightCredibilityLine,
  SpotlightDailyEarnings,
  SpotlightEmptyState,
  SpotlightIdentity,
  SpotlightKpiGrid,
  SpotlightLoadingState,
  SpotlightMetricBlock,
  SpotlightRank,
  SpotlightRowShell,
  SpotlightSection,
  SpotlightRepoPills,
  type SpotlightKpi,
} from './SpotlightPrimitives';

interface DashboardFeaturedDiscoverersProps {
  pulse: DashboardDiscoveryPulse;
  isLoading?: boolean;
  isError?: boolean;
  viewAllHref?: string;
}

const getKpiToneColor = (tone: SpotlightKpi['tone'], theme: Theme) => {
  if (tone === 'positive') return theme.palette.status.merged;
  if (tone === 'warning') return theme.palette.status.warning;
  return alpha(theme.palette.text.primary, 0.48);
};

const getRowToneColor = (
  tone: DashboardFeaturedDiscoverer['tone'],
  theme: Theme,
) => {
  if (tone === 'warning') return theme.palette.status.warning;
  if (tone === 'neutral') return alpha(theme.palette.text.primary, 0.5);
  return theme.palette.status.merged;
};

const getMinerCredibilityColor = (value: number, theme: Theme) => {
  if (value >= 0.75) return theme.palette.status.merged;
  if (value >= 0.5) return theme.palette.status.warning;
  return theme.palette.status.closed;
};

const DiscovererRow: React.FC<{
  discoverer: DashboardFeaturedDiscoverer;
  rank: number;
}> = ({ discoverer, rank }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const toneColor = getRowToneColor(discoverer.tone, theme);

  const content = (
    <>
      <SpotlightRank rank={rank} />

      <SpotlightIdentity
        avatarUsername={
          discoverer.avatarUsername ??
          discoverer.githubUsername ??
          discoverer.githubId
        }
        label={discoverer.roleLabel}
        markerColor={toneColor}
        name={discoverer.name}
        trailing={<SpotlightDailyEarnings value={discoverer.usdPerDay} />}
      />

      <SpotlightMetricBlock
        gridArea="primary"
        label={discoverer.primaryMetricLabel}
        value={discoverer.primaryMetric}
        valueColor={theme.palette.text.primary}
        valueFontSize="0.86rem"
      />

      {discoverer.secondaryMetric && (
        <SpotlightMetricBlock
          gridArea="secondary"
          label={discoverer.secondaryMetricLabel ?? ''}
          value={discoverer.secondaryMetric}
        />
      )}

      <Box sx={{ gridArea: 'repos', minWidth: 0 }}>
        <SpotlightRepoPills repos={discoverer.repos} name={discoverer.name} />
      </Box>

      <SpotlightCredibilityLine
        value={discoverer.credibility}
        ariaLabelPrefix="Miner credibility"
        getColor={getMinerCredibilityColor}
      />

      <ArrowForwardIcon
        sx={{
          gridArea: 'arrow',
          display: { xs: 'none', sm: discoverer.href ? 'block' : 'none' },
          color: alpha(theme.palette.text.primary, 0.34),
          fontSize: 16,
        }}
      />
    </>
  );

  return (
    <SpotlightRowShell
      ariaLabel={`Open issue discovery profile for ${discoverer.name}`}
      onClick={
        discoverer.href
          ? () =>
              navigate(discoverer.href ?? '', {
                state: { backLabel: 'Back to Dashboard' },
              })
          : undefined
      }
      toneColor={toneColor}
    >
      {content}
    </SpotlightRowShell>
  );
};

const DashboardFeaturedDiscoverers: React.FC<
  DashboardFeaturedDiscoverersProps
> = ({ pulse, isLoading = false, isError = false, viewAllHref }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const kpis: SpotlightKpi[] = pulse.kpis.map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
    detail: kpi.delta,
    tone: kpi.tone,
  }));

  return (
    <SpotlightSection
      headingId="featured-discoverers-heading"
      title="Featured Discoverers"
      chipLabel={pulse.windowLabel}
      chipColor={theme.palette.status.merged}
      railColor={theme.palette.status.merged}
      subtitle="Rolling 24h issue-discovery solves, score, and repo context."
      viewAllAriaLabel="View all issue discoverers"
      onViewAll={viewAllHref ? () => navigate(viewAllHref) : undefined}
    >
      {isLoading ? (
        <SpotlightLoadingState skeletonKeyPrefix="discovery" />
      ) : (
        <>
          {isError && (
            <Box
              role="status"
              sx={{
                px: 0.9,
                py: 0.7,
                borderRadius: 2,
                border: `1px solid ${alpha(
                  theme.palette.status.warning,
                  0.22,
                )}`,
                backgroundColor: theme.palette.common.black,
              }}
            >
              <Typography
                sx={{
                  color: alpha(theme.palette.text.primary, 0.66),
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                Discovery activity unavailable right now.
              </Typography>
            </Box>
          )}

          <SpotlightKpiGrid kpis={kpis} getToneColor={getKpiToneColor} />

          {pulse.discoverers.length > 0 ? (
            <Stack spacing={0.65}>
              {pulse.discoverers.map((discoverer, index) => (
                <DiscovererRow
                  key={discoverer.id}
                  discoverer={discoverer}
                  rank={index + 1}
                />
              ))}
            </Stack>
          ) : (
            <SpotlightEmptyState message="No new discovery issues filed in the last 24h." />
          )}
        </>
      )}
    </SpotlightSection>
  );
};

export default DashboardFeaturedDiscoverers;

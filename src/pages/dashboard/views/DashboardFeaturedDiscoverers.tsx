import React from 'react';
import { Box, Stack } from '@mui/material';
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
  SpotlightRepoPills,
  SpotlightRowShell,
  SpotlightSection,
  type SpotlightKpi,
} from './SpotlightPrimitives';

interface DashboardFeaturedDiscoverersProps {
  pulse: DashboardDiscoveryPulse;
  isLoading?: boolean;
  viewAllHref?: string;
}

const getKpiToneColor = (tone: SpotlightKpi['tone'], theme: Theme) => {
  if (tone === 'positive') return theme.palette.status.merged;
  if (tone === 'warning') return theme.palette.status.warning;
  return alpha(theme.palette.text.primary, 0.48);
};

const getRoleToneColor = (
  tone: DashboardFeaturedDiscoverer['tone'],
  theme: Theme,
) => {
  if (tone === 'warning') return theme.palette.status.warning;
  if (tone === 'neutral') return alpha(theme.palette.text.primary, 0.55);
  return theme.palette.status.merged;
};

const getFilerCredibilityColor = (value: number, theme: Theme) => {
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
  const toneColor = getRoleToneColor(discoverer.tone, theme);

  const navigateToFiler = discoverer.href
    ? () =>
        navigate(discoverer.href, {
          state: { backTo: '/dashboard', backLabel: 'Back to Dashboard' },
        })
    : undefined;

  return (
    <SpotlightRowShell
      ariaLabel={`View discovery activity for ${discoverer.author.username}`}
      onClick={navigateToFiler}
      toneColor={toneColor}
    >
      <SpotlightRank rank={rank} />

      <SpotlightIdentity
        avatarUsername={discoverer.author.username}
        label={`${discoverer.roleLabel} · ${discoverer.windowLabel}`}
        markerColor={toneColor}
        name={discoverer.author.displayName}
        trailing={
          <SpotlightDailyEarnings value={discoverer.author.usdPerDay} />
        }
      />

      <SpotlightMetricBlock
        gridArea="primary"
        label={discoverer.primary.label}
        value={discoverer.primary.value}
        valueColor={theme.palette.text.primary}
        valueFontSize="0.86rem"
      />

      <SpotlightMetricBlock
        gridArea="secondary"
        label={discoverer.secondary.label}
        value={discoverer.secondary.value}
      />

      <Box sx={{ gridArea: 'repos', minWidth: 0 }}>
        {discoverer.repos.length > 0 ? (
          <SpotlightRepoPills repos={discoverer.repos} name={discoverer.id} />
        ) : null}
      </Box>

      <SpotlightCredibilityLine
        value={discoverer.author.credibility}
        ariaLabelPrefix={`Credibility for ${discoverer.author.username}`}
        getColor={getFilerCredibilityColor}
      />

      <ArrowForwardIcon
        sx={{
          gridArea: 'arrow',
          display: { xs: 'none', sm: navigateToFiler ? 'block' : 'none' },
          color: alpha(theme.palette.text.primary, 0.34),
          fontSize: 16,
        }}
      />
    </SpotlightRowShell>
  );
};

const DashboardFeaturedDiscoverers: React.FC<
  DashboardFeaturedDiscoverersProps
> = ({ pulse, isLoading = false, viewAllHref }) => {
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
      subtitle="All-time top discoverer, plus the most active and highest-earning filers in the current window."
      viewAllAriaLabel="View all discoverers"
      onViewAll={viewAllHref ? () => navigate(viewAllHref) : undefined}
    >
      {isLoading ? (
        <SpotlightLoadingState skeletonKeyPrefix="discoverer" />
      ) : (
        <>
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
            <SpotlightEmptyState message="No discoverer activity yet." />
          )}
        </>
      )}
    </SpotlightSection>
  );
};

export default DashboardFeaturedDiscoverers;

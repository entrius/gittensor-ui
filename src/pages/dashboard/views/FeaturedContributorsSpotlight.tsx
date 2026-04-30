import React from 'react';
import { Box, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { type DashboardFeaturedContributor } from '../dashboardData';
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
  formatSpotlightUsdPerDay,
  type SpotlightKpi,
} from './SpotlightPrimitives';

interface Props {
  contributors: DashboardFeaturedContributor[];
  isLoading?: boolean;
  viewAllHref?: string;
}

const formatNumber = (value?: number) =>
  Math.round(value ?? 0).toLocaleString();

const getKpiToneColor = (tone: SpotlightKpi['tone'], theme: Theme) => {
  if (tone === 'positive') return theme.palette.status.award;
  return alpha(theme.palette.text.primary, 0.48);
};

const buildContributorKpis = (
  contributors: DashboardFeaturedContributor[],
): SpotlightKpi[] => {
  const score = contributors.reduce((sum, c) => sum + (c.score ?? 0), 0);
  const mergedPrs = contributors.reduce(
    (sum, c) => sum + (c.mergedPrs ?? 0),
    0,
  );
  const closedPrs = contributors.reduce(
    (sum, c) => sum + (c.closedPrs ?? 0),
    0,
  );
  const repos = new Set(contributors.flatMap((c) => c.repos));
  const dailyEarnings = contributors.reduce(
    (sum, c) => sum + Math.round(c.usdPerDay ?? 0),
    0,
  );

  return [
    {
      label: 'Highlighted score',
      value: formatNumber(score),
      detail: `${contributors.length} miners`,
      tone: 'positive',
    },
    {
      label: 'Merged PRs',
      value: formatNumber(mergedPrs),
      detail: 'all time',
      tone: 'positive',
    },
    {
      label: 'Closed PRs',
      value: formatNumber(closedPrs),
      detail: 'reviewed work',
    },
    {
      label: 'Repos touched',
      value: repos.size.toLocaleString(),
      detail: '35d context',
    },
    {
      label: 'Daily earnings',
      value: formatSpotlightUsdPerDay(dailyEarnings),
      detail: 'highlighted total',
      tone: dailyEarnings > 0 ? 'positive' : 'neutral',
    },
  ];
};

const ContributorRow: React.FC<{
  contributor: DashboardFeaturedContributor;
  rank: number;
}> = ({ contributor, rank }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const score = contributor.score ?? 0;
  const mergedPrs = contributor.mergedPrs ?? 0;
  const scoreTone =
    rank === 1
      ? theme.palette.status.award
      : rank === 2
        ? theme.palette.status.warningOrange
        : theme.palette.status.warning;

  return (
    <SpotlightRowShell
      onClick={() =>
        navigate(
          `/miners/details?githubId=${encodeURIComponent(
            contributor.githubId,
          )}`,
          {
            state: { backTo: '/dashboard', backLabel: 'Back to Dashboard' },
          },
        )
      }
      ariaLabel={`Open contributor profile for ${contributor.name}`}
      minHeight={{ xs: 90, sm: 70 }}
      toneColor={scoreTone}
    >
      <SpotlightRank rank={rank} />

      <SpotlightIdentity
        avatarUsername={contributor.githubUsername ?? contributor.githubId}
        label={contributor.featuredLabel}
        markerColor={scoreTone}
        name={contributor.name}
        trailing={<SpotlightDailyEarnings value={contributor.usdPerDay} />}
      />

      <SpotlightMetricBlock
        gridArea="primary"
        label="contributor score"
        value={formatNumber(score)}
        valueColor={theme.palette.text.primary}
        valueFontSize="0.86rem"
      />

      <SpotlightMetricBlock
        gridArea="secondary"
        label="merged PRs"
        value={formatNumber(mergedPrs)}
      />

      <Box sx={{ gridArea: 'repos', minWidth: 0 }}>
        <SpotlightRepoPills repos={contributor.repos} name={contributor.name} />
      </Box>

      <SpotlightCredibilityLine
        value={contributor.credibility}
        ariaLabelPrefix="OSS credibility"
      />

      <ArrowForwardIcon
        sx={{
          gridArea: 'arrow',
          display: { xs: 'none', sm: 'block' },
          color: alpha(theme.palette.text.primary, 0.34),
          fontSize: 16,
        }}
      />
    </SpotlightRowShell>
  );
};

const FeaturedContributorsSpotlight: React.FC<Props> = ({
  contributors,
  isLoading = false,
  viewAllHref,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const visibleContributors = contributors.slice(0, 3);
  const kpis = buildContributorKpis(visibleContributors);

  return (
    <SpotlightSection
      headingId="featured-contributors-heading"
      title="Featured Contributors"
      chipLabel="OSS 35d"
      chipColor={theme.palette.status.award}
      railColor={theme.palette.status.award}
      subtitle="OSS contribution leaders by score, merged PR output, and repository impact."
      viewAllAriaLabel="View all contributors"
      onViewAll={viewAllHref ? () => navigate(viewAllHref) : undefined}
    >
      {isLoading ? (
        <SpotlightLoadingState skeletonKeyPrefix="contributor" />
      ) : (
        <>
          <SpotlightKpiGrid kpis={kpis} getToneColor={getKpiToneColor} />

          {visibleContributors.length > 0 ? (
            <Stack spacing={0.65}>
              {visibleContributors.map((contributor, index) => (
                <ContributorRow
                  key={`${contributor.featuredLabel}-${contributor.githubId}`}
                  contributor={contributor}
                  rank={index + 1}
                />
              ))}
            </Stack>
          ) : (
            <SpotlightEmptyState message="No contributor highlights available." />
          )}
        </>
      )}
    </SpotlightSection>
  );
};

export default FeaturedContributorsSpotlight;

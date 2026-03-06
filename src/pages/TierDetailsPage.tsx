import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Card, Typography, Stack, alpha } from '@mui/material';
import { Page } from '../components/layout';
import {
  MinerRepositoriesTable,
  MinerPRsTable,
  BackButton,
  SEO,
} from '../components';
import { useMinerStats } from '../api';
import { TIER_COLORS } from '../theme';

const VALID_TIERS = ['Bronze', 'Silver', 'Gold'];

const TierDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const githubId = searchParams.get('githubId');
  const tierParam = searchParams.get('tier') || '';
  const tier =
    VALID_TIERS.find((t) => t.toLowerCase() === tierParam.toLowerCase()) ||
    'Bronze';

  if (!githubId) {
    navigate('/top-miners');
    return null;
  }

  const tierKey = tier.toLowerCase() as 'bronze' | 'silver' | 'gold';
  const color = TIER_COLORS[tierKey];
  const bgColor = alpha(color, 0.08);
  const borderColor = alpha(color, 0.25);

  return (
    <Page title={`${tier} Tier Details`}>
      <SEO
        title={`${tier} Tier - ${githubId} | Gittensor`}
        description={`Repositories and pull requests (merged, open, closed) for ${githubId} in the ${tier} tier on Gittensor.`}
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' },
          width: '100%',
          py: { xs: 2, sm: 0 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: 1200,
            width: '100%',
            px: { xs: 2, sm: 2, md: 0 },
          }}
        >
          <BackButton
            to={`/miners/details?githubId=${encodeURIComponent(githubId)}`}
            label="Back to Miner"
          />

          <TierSummaryCard
            githubId={githubId}
            tier={tier}
            color={color}
            bgColor={bgColor}
            borderColor={borderColor}
          />

          <Typography
            variant="sectionTitle"
            sx={{
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              '&::before': {
                content: '""',
                width: '4px',
                height: '20px',
                backgroundColor: color,
                borderRadius: '2px',
              },
            }}
          >
            Repositories in {tier} Tier
          </Typography>
          <MinerRepositoriesTable githubId={githubId} tierFilter={tier} />

          <Typography
            variant="sectionTitle"
            sx={{
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              '&::before': {
                content: '""',
                width: '4px',
                height: '20px',
                backgroundColor: color,
                borderRadius: '2px',
              },
            }}
          >
            Pull Requests in {tier} Tier
          </Typography>
          <MinerPRsTable githubId={githubId} tierFilter={tier} />
        </Box>
      </Box>
    </Page>
  );
};

interface TierSummaryCardProps {
  githubId: string;
  tier: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const TierSummaryCard: React.FC<TierSummaryCardProps> = ({
  githubId,
  tier,
  color,
  bgColor,
  borderColor,
}) => {
  const { data: minerStats, isLoading } = useMinerStats(githubId);

  const tierKey = tier.toLowerCase() as 'bronze' | 'silver' | 'gold';
  const score =
    tierKey === 'bronze'
      ? minerStats?.bronzeScore
      : tierKey === 'silver'
        ? minerStats?.silverScore
        : minerStats?.goldScore;
  const credibility =
    tierKey === 'bronze'
      ? minerStats?.bronzeCredibility
      : tierKey === 'silver'
        ? minerStats?.silverCredibility
        : minerStats?.goldCredibility;
  const merged =
    tierKey === 'bronze'
      ? minerStats?.bronzeMergedPrs
      : tierKey === 'silver'
        ? minerStats?.silverMergedPrs
        : minerStats?.goldMergedPrs;
  const closed =
    tierKey === 'bronze'
      ? minerStats?.bronzeClosedPrs
      : tierKey === 'silver'
        ? minerStats?.silverClosedPrs
        : minerStats?.goldClosedPrs;
  const total =
    tierKey === 'bronze'
      ? minerStats?.bronzeTotalPrs
      : tierKey === 'silver'
        ? minerStats?.silverTotalPrs
        : minerStats?.goldTotalPrs;
  const opened = (total ?? 0) - (merged ?? 0) - (closed ?? 0);
  const uniqueRepos =
    tierKey === 'bronze'
      ? minerStats?.bronzeUniqueRepos
      : tierKey === 'silver'
        ? minerStats?.silverUniqueRepos
        : minerStats?.goldUniqueRepos;

  if (isLoading) {
    return null;
  }

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        border: `1px solid ${borderColor}`,
        backgroundColor: bgColor,
        p: 3,
        elevation: 0,
      }}
      elevation={0}
    >
      <Typography
        variant="sectionTitle"
        sx={{
          color,
          fontSize: '1rem',
          fontWeight: 700,
          letterSpacing: '1px',
          mb: 2,
          pb: 1.5,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        {tier} Tier Summary
      </Typography>
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={4}
        useFlexGap
        sx={{
          '& > *': { minWidth: 0 },
          '& .MuiTypography-root': {
            border: 'none',
            borderBottom: 'none',
            textDecoration: 'none',
            margin: 0,
            padding: 0,
          },
        }}
      >
        <Stack direction="column" gap={0.5} sx={{ minWidth: '4.5rem' }}>
          <Typography variant="statLabel" component="span">
            Score
          </Typography>
          <Typography variant="statValue" component="span">
            {score != null ? Number(score).toFixed(4) : '0.0000'}
          </Typography>
        </Stack>
        <Stack direction="column" gap={0.5} sx={{ minWidth: '4.5rem' }}>
          <Typography variant="statLabel" component="span">
            Credibility
          </Typography>
          <Typography variant="statValue" component="span">
            {credibility != null
              ? `${(Number(credibility) * 100).toFixed(1)}%`
              : 'N/A'}
          </Typography>
        </Stack>
        <Stack direction="column" gap={0.5} sx={{ minWidth: '4.5rem' }}>
          <Typography variant="statLabel" component="span">
            PRs Merged
          </Typography>
          <Typography variant="statValue" component="span">
            {merged ?? 0}
          </Typography>
        </Stack>
        <Stack direction="column" gap={0.5} sx={{ minWidth: '4.5rem' }}>
          <Typography variant="statLabel" component="span">
            PRs Open
          </Typography>
          <Typography variant="statValue" component="span">
            {opened}
          </Typography>
        </Stack>
        <Stack direction="column" gap={0.5} sx={{ minWidth: '4.5rem' }}>
          <Typography variant="statLabel" component="span">
            PRs Closed
          </Typography>
          <Typography variant="statValue" component="span">
            {closed ?? 0}
          </Typography>
        </Stack>
        <Stack direction="column" gap={0.5} sx={{ minWidth: '4.5rem' }}>
          <Typography variant="statLabel" component="span">
            Unique Repos
          </Typography>
          <Typography variant="statValue" component="span">
            {uniqueRepos ?? 0}
          </Typography>
        </Stack>
      </Stack>
    </Card>
  );
};

export default TierDetailsPage;

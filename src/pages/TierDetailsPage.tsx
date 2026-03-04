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
            variant="h6"
            sx={{
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.1rem',
              fontWeight: 600,
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
            variant="h6"
            sx={{
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.1rem',
              fontWeight: 600,
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
        borderRadius: 3,
        border: `1px solid ${borderColor}`,
        backgroundColor: bgColor,
        p: 3,
        elevation: 0,
      }}
      elevation={0}
    >
      <Typography
        sx={{
          color,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '1rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          mb: 2,
          pb: 1.5,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        {tier} Tier Summary
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={3} useFlexGap>
        <Box>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.7rem',
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: 'uppercase',
            }}
          >
            Score
          </Typography>
          <Typography
            sx={{
              color: '#ffffff',
              fontSize: '1.1rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
            }}
          >
            {score != null ? Number(score).toFixed(4) : '0.0000'}
          </Typography>
        </Box>
        <Box>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.7rem',
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: 'uppercase',
            }}
          >
            Credibility
          </Typography>
          <Typography
            sx={{
              color: '#ffffff',
              fontSize: '1.1rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
            }}
          >
            {credibility != null
              ? `${(Number(credibility) * 100).toFixed(1)}%`
              : 'N/A'}
          </Typography>
        </Box>
        <Box>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.7rem',
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: 'uppercase',
            }}
          >
            PRs Merged
          </Typography>
          <Typography
            sx={{
              color: '#ffffff',
              fontSize: '1.1rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
            }}
          >
            {merged ?? 0}
          </Typography>
        </Box>
        <Box>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.7rem',
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: 'uppercase',
            }}
          >
            PRs Open
          </Typography>
          <Typography
            sx={{
              color: '#ffffff',
              fontSize: '1.1rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
            }}
          >
            {opened}
          </Typography>
        </Box>
        <Box>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.7rem',
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: 'uppercase',
            }}
          >
            PRs Closed
          </Typography>
          <Typography
            sx={{
              color: '#ffffff',
              fontSize: '1.1rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
            }}
          >
            {closed ?? 0}
          </Typography>
        </Box>
        <Box>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.7rem',
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: 'uppercase',
            }}
          >
            Unique Repos
          </Typography>
          <Typography
            sx={{
              color: '#ffffff',
              fontSize: '1.1rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
            }}
          >
            {uniqueRepos ?? 0}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
};

export default TierDetailsPage;

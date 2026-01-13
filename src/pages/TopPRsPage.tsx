import React, { useMemo } from 'react';
import { Box, Card } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopPRsTable, SEO } from '../components';
import { useAllPrs } from '../api';

const TopPRsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();

  const handleSelectMiner = (githubId: string) => {
    navigate(`/miners/details?githubId=${githubId}`);
  };

  const handleSelectRepository = (repositoryFullName: string) => {
    navigate(
      `/miners/repository?name=${encodeURIComponent(repositoryFullName)}`,
    );
  };

  const handleSelectPR = (repository: string, pullRequestNumber: number) => {
    navigate(
      `/miners/pr?repo=${encodeURIComponent(repository)}&number=${pullRequestNumber}`,
    );
  };

  // Process top PRs for TopPRsTable
  const topPRs = useMemo(() => {
    if (!allPRs) return [];
    return [...allPRs]
      .sort((a, b) => parseFloat(b.score || '0') - parseFloat(a.score || '0'))
      .slice(0, 100);
  }, [allPRs]);

  return (
    <Page title="Pull Requests">
      <SEO
        title="Pull Requests"
        description="Top Pull Requests across Gittensor repositories."
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
        <Box sx={{ maxWidth: 1200, width: '100%' }}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'transparent',
              overflow: 'hidden',
            }}
            elevation={0}
          >
            <TopPRsTable
              prs={topPRs}
              isLoading={isLoadingPRs}
              onSelectPR={handleSelectPR}
              onSelectMiner={handleSelectMiner}
              onSelectRepository={handleSelectRepository}
            />
          </Card>
        </Box>
      </Box>
    </Page>
  );
};

export default TopPRsPage;

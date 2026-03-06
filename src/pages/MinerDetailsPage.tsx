import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Page } from '../components/layout';
import {
  MinerDashboardHero,
  MinerActivity,
  MinerRepositoriesTable,
  MinerPRsTable,
  MinerTierPerformance,
  ScoreBreakdownCard,
  BackButton,
  SEO,
} from '../components';

const MinerDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const githubId = searchParams.get('githubId');
  const [contribTab, setContribTab] = useState<'prs' | 'repos'>('prs');
  const [contribSearch, setContribSearch] = useState('');

  if (!githubId) {
    navigate('/top-miners');
    return null;
  }

  return (
    <Page title="My Dashboard">
      <SEO
        title={`Miner Stats - ${githubId}`}
        description={`View your Gittensor stats, tier progress, contributions, and earnings. Track scores and pull requests.`}
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          maxWidth: 1200,
          width: '100%',
          mx: 'auto',
          px: { xs: 2, sm: 2, md: 0 },
          py: { xs: 2, sm: 0 },
          minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' },
        }}
      >
        <BackButton to="/top-miners" />

        <MinerDashboardHero githubId={githubId} />

        <MinerTierPerformance githubId={githubId} />

        <ScoreBreakdownCard />

        <MinerActivity githubId={githubId} />

        <Box
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            backgroundColor: 'transparent',
          }}
        >
          <Box
            sx={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              px: 2,
              py: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
            }}
          >
            <Tabs
              value={contribTab}
              onChange={(_, v: 'prs' | 'repos') => setContribTab(v)}
              sx={{
                minHeight: 44,
                flex: { xs: '0 0 auto', sm: 1 },
                width: { xs: '100%', sm: 'auto' },
                '& .MuiTab-root': {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  textTransform: 'none',
                },
                '& .Mui-selected': { color: 'primary.main' },
              }}
            >
              <Tab value="prs" label="Pull requests" />
              <Tab value="repos" label="By repository" />
            </Tabs>
            <TextField
              size="small"
              placeholder={
                contribTab === 'prs'
                  ? 'Search by title, repo, or PR #...'
                  : 'Search repositories...'
              }
              value={contribSearch}
              onChange={(e) => setContribSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}
                    />
                  </InputAdornment>
                ),
                sx: {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.8rem',
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.35)',
                  },
                  width: { xs: '100%', sm: 280 },
                },
              }}
              sx={{ width: { xs: '100%', sm: 280 }, minWidth: 0 }}
            />
          </Box>
          <Box sx={{ p: 0 }}>
            {contribTab === 'prs' && (
              <MinerPRsTable
                githubId={githubId}
                search={contribSearch}
                onSearchChange={setContribSearch}
              />
            )}
            {contribTab === 'repos' && (
              <MinerRepositoriesTable
                githubId={githubId}
                search={contribSearch}
                onSearchChange={setContribSearch}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default MinerDetailsPage;

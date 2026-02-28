import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Fade } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SourceIcon from '@mui/icons-material/Source';
import { Page } from '../components/layout';
import {
  MinerScoreCard,
  MinerActivity,
  MinerRepositoriesTable,
  MinerPRsTable,
  MinerTierPerformance,
  BackButton,
  SEO,
} from '../components';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`miner-tabpanel-${index}`}
      aria-labelledby={`miner-tab-${index}`}
      {...other}
      style={{ minHeight: '400px' }}
    >
      {value === index && (
        <Fade in={value === index} timeout={400}>
          <Box sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {children}
          </Box>
        </Fade>
      )}
    </div>
  );
}

const MinerDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const githubId = searchParams.get('githubId');
  const [tabValue, setTabValue] = useState(0);

  // If no githubId is provided, redirect to miners page
  if (!githubId) {
    navigate('/miners');
    return null;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Page title="Miner Details">
      <SEO
        title={`Miner Stats - ${githubId}`}
        description={`View detailed statistics, contributions, and pull requests for ${githubId} on Gittensor. Track open source contributions and rewards.`}
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' },
          width: '100%',
          py: { xs: 2, sm: 4 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1400,
            width: '100%',
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <Box sx={{ mb: 3 }}>
            <BackButton to="/top-miners" />
          </Box>

          {/* Miner Score Card stays universally at the top */}
          <MinerScoreCard githubId={githubId} />

          {/* Navigation Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)', mt: 2, mb: 1 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="miner dashboard tabs"
              textColor="primary"
              indicatorColor="primary"
              sx={{
                '& .MuiTab-root': {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  minHeight: 48,
                  color: 'rgba(255, 255, 255, 0.6)',
                  '&.Mui-selected': {
                    color: 'white',
                  }
                },
              }}
            >
              <Tab icon={<DashboardIcon fontSize="small" />} iconPosition="start" label="Overview" />
              <Tab icon={<AccountTreeIcon fontSize="small" />} iconPosition="start" label="Repositories" />
              <Tab icon={<SourceIcon fontSize="small" />} iconPosition="start" label="Pull Requests" />
            </Tabs>
          </Box>

          <CustomTabPanel value={tabValue} index={0}>
            {/* Overview Tab Content */}
            <MinerTierPerformance githubId={githubId} />
            <MinerActivity githubId={githubId} />
          </CustomTabPanel>

          <CustomTabPanel value={tabValue} index={1}>
            {/* Repositories Tab Content */}
            <MinerRepositoriesTable githubId={githubId} />
          </CustomTabPanel>

          <CustomTabPanel value={tabValue} index={2}>
            {/* Pull Requests Tab Content */}
            <MinerPRsTable githubId={githubId} />
          </CustomTabPanel>
        </Box>
      </Box>
    </Page>
  );
};

export default MinerDetailsPage;

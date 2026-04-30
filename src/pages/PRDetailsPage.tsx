import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, CircularProgress, Typography } from '@mui/material';
import { Page } from '../components/layout';
import {
  PRDetailsCard,
  PRHeader,
  PRFilesChanged,
  BackButton,
  SEO,
  PRComments,
  WatchlistButton,
} from '../components';
import { usePullRequestDetails } from '../api';
import { serializePRKey } from '../hooks/useWatchlist';
import { useSessionStoredState } from '../hooks/useSessionStoredState';

const isPrDetailsTab = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value <= 2;
import { STATUS_COLORS } from '../theme';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

const PRDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repository = searchParams.get('repo');
  const pullRequestNumber = searchParams.get('number');
  const [tabValue, setTabValue] = useSessionStoredState<number>(
    'prDetails:tab',
    0,
    isPrDetailsTab,
  );

  // Call hook unconditionally (React rules of hooks)
  const { data: prDetails, isLoading } = usePullRequestDetails(
    repository || '',
    pullRequestNumber ? parseInt(pullRequestNumber) : 0,
  );

  // If no repo or PR number is provided, redirect to OSS contributors (registered route)
  if (!repository || !pullRequestNumber) {
    if (typeof window !== 'undefined') {
      navigate('/top-miners', { replace: true });
    }
    return null;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Page title="Pull Request Details">
      <SEO
        title={`PR #${pullRequestNumber} - ${repository}`}
        description={`View detailed statistics for pull request #${pullRequestNumber} in ${repository} on Gittensor. Track contributions, scores, and changes.`}
        type="website"
      />

      {isLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
          <CircularProgress />
        </Box>
      ) : !prDetails ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="h6" color="error">
            PR not found
          </Typography>
          <BackButton to="/repositories" label="Back to Repositories" />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
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
              mx: 'auto',
              px: { xs: 2, sm: 2, md: 0 },
            }}
          >
            <BackButton to="/repositories" label="Back to Repositories" />

            {/* Header always visible */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <PRHeader
                  repository={repository}
                  pullRequestNumber={parseInt(pullRequestNumber)}
                  prDetails={prDetails}
                />
              </Box>
              <WatchlistButton
                category="prs"
                itemKey={serializePRKey(
                  repository,
                  parseInt(pullRequestNumber),
                )}
                size="medium"
              />
            </Box>

            {/* Tabs */}
            <Box
              sx={(theme) => ({
                borderBottom: 1,
                borderColor: theme.palette.border.light,
              })}
            >
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="pr details tabs"
                variant="scrollable"
                scrollButtons={false}
                allowScrollButtonsMobile={false}
                sx={(theme) => ({
                  '& .MuiTab-root': {
                    color: STATUS_COLORS.open,
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                    textTransform: 'none',
                    fontWeight: 500,
                    minHeight: '48px',
                    fontSize: { xs: '13px', sm: '14px' },
                    minWidth: { xs: 'auto', sm: 90 },
                    px: { xs: 1.25, sm: 2 },
                    '&.Mui-selected': {
                      color: theme.palette.text.primary,
                      fontWeight: 600,
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: theme.palette.primary.main,
                    height: '3px',
                    borderRadius: '3px 3px 0 0',
                  },
                })}
              >
                <Tab
                  label="Overview"
                  icon={<VisibilityIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                  iconPosition="start"
                />
                <Tab
                  label="Files Changed"
                  icon={<CodeIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                  iconPosition="start"
                />
                <Tab
                  label="Conversation"
                  icon={
                    <ChatBubbleOutlineIcon
                      sx={{ fontSize: 16, mb: 0, mr: 1 }}
                    />
                  }
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            {/* Content */}
            <Box sx={{ mt: 2 }}>
              {tabValue === 0 && (
                <PRDetailsCard
                  repository={repository}
                  pullRequestNumber={parseInt(pullRequestNumber)}
                  hideHeader={true}
                />
              )}
              {tabValue === 1 && (
                <PRFilesChanged
                  repository={repository}
                  pullRequestNumber={parseInt(pullRequestNumber)}
                />
              )}
              {tabValue === 2 && (
                <PRComments
                  repository={repository}
                  pullRequestNumber={parseInt(pullRequestNumber)}
                  prDetails={prDetails}
                />
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Page>
  );
};

export default PRDetailsPage;

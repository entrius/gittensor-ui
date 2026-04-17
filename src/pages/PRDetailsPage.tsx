import React, { useLayoutEffect, useRef, useState } from 'react';
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
} from '../components';
import { usePullRequestDetails } from '../api';
import { STATUS_COLORS } from '../theme';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { readStoredTab, writeStoredTab } from '../utils/tabPreferences';

const PR_DETAILS_TAB_STORAGE_KEY = 'gittensor-ui:pr-details-last-tab';

const PR_TAB_SLUGS = ['overview', 'files', 'conversation'] as const;

const PRDetailsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const repository = searchParams.get('repo');
  const pullRequestNumber = searchParams.get('number');
  const [tabValue, setTabValue] = useState(0);
  const tabInitForPr = useRef<string | null>(null);

  // Call hook unconditionally (React rules of hooks)
  const { data: prDetails, isLoading } = usePullRequestDetails(
    repository || '',
    pullRequestNumber ? parseInt(pullRequestNumber) : 0,
  );

  const prRouteKey =
    repository && pullRequestNumber ? `${repository}#${pullRequestNumber}` : '';

  useLayoutEffect(() => {
    if (!repository || !pullRequestNumber || !prDetails) {
      return;
    }
    if (tabInitForPr.current === prRouteKey) {
      return;
    }
    tabInitForPr.current = prRouteKey;

    const tabFromUrl = searchParams.get('tab');
    if (
      tabFromUrl &&
      PR_TAB_SLUGS.includes(tabFromUrl as (typeof PR_TAB_SLUGS)[number])
    ) {
      const idx = PR_TAB_SLUGS.indexOf(
        tabFromUrl as (typeof PR_TAB_SLUGS)[number],
      );
      setTabValue(idx);
      writeStoredTab(PR_DETAILS_TAB_STORAGE_KEY, PR_TAB_SLUGS[idx]);
      return;
    }

    const saved = readStoredTab(PR_DETAILS_TAB_STORAGE_KEY);
    const idx =
      saved && PR_TAB_SLUGS.includes(saved as (typeof PR_TAB_SLUGS)[number])
        ? PR_TAB_SLUGS.indexOf(saved as (typeof PR_TAB_SLUGS)[number])
        : 0;
    setTabValue(idx);
    const p = new URLSearchParams(searchParams);
    p.set('tab', PR_TAB_SLUGS[idx]);
    setSearchParams(p, { replace: true });
  }, [
    repository,
    pullRequestNumber,
    prDetails,
    prRouteKey,
    searchParams,
    setSearchParams,
  ]);

  // If no repo or PR number is provided, redirect to miners page
  if (!repository || !pullRequestNumber) {
    if (typeof window !== 'undefined') {
      navigate('/miners?tab=prs');
    }
    return null;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const slug = PR_TAB_SLUGS[newValue];
    writeStoredTab(PR_DETAILS_TAB_STORAGE_KEY, slug);
    const p = new URLSearchParams(searchParams);
    p.set('tab', slug);
    setSearchParams(p, { replace: true });
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
            <PRHeader
              repository={repository}
              pullRequestNumber={parseInt(pullRequestNumber)}
              prDetails={prDetails}
            />

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
                sx={(theme) => ({
                  '& .MuiTab-root': {
                    color: STATUS_COLORS.open,
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                    textTransform: 'none',
                    fontWeight: 500,
                    minHeight: '48px',
                    fontSize: '14px',
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

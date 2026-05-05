import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { Page } from '../components/layout';
import { BackButton, SEO, WatchlistButton } from '../components';
import {
  IssueHeaderCard,
  IssueSubmissionsTable,
  IssueConversation,
} from '../components/issues';
import { useIssueDetails, useIssueSubmissions } from '../api';
import { STATUS_COLORS } from '../theme';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';

const IssueDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const idParam = searchParams.get('id');
  const id = idParam ? parseInt(idParam, 10) : 0;
  const [tabValue, setTabValue] = useState(0);

  const { data: issue, isLoading: isLoadingDetails } = useIssueDetails(id);
  const { data: submissions, isLoading: isLoadingSubmissions } =
    useIssueSubmissions(id);

  // If no ID is provided, redirect to issues page
  if (!idParam) {
    if (typeof window !== 'undefined') {
      navigate('/bounties');
    }
    return null;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Page title="Issue Details">
      <SEO
        title={issue?.title || `Issue #${id}`}
        description={`View issue bounty details for ${issue?.repositoryFullName || 'issue'} #${issue?.issueNumber || id} on Gittensor.`}
      />

      {isLoadingDetails ? (
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
      ) : !issue ? (
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
            Issue not found
          </Typography>
          <BackButton to="/bounties" label="Back to Bounties" />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, md: 3 },
          }}
        >
          <Stack spacing={3}>
            <BackButton to="/bounties" label="Back to Bounties" mb={0} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <IssueHeaderCard issue={issue} />
              </Box>
              <WatchlistButton
                category="bounties"
                itemKey={String(issue.id)}
                size="medium"
              />
            </Box>

            {/* Tabs */}
            <Box
              sx={(theme) => ({
                borderBottom: 1,
                borderColor: theme.palette.border.light,
                overflowX: 'auto',       // allow horizontal scroll on narrow viewports
                WebkitOverflowScrolling: 'touch',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
              })}
            >
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="issue details tabs"
                variant="scrollable"     // MUI built-in scrollable tabs
                scrollButtons="auto"
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
                  label="Issue"
                  icon={
                    <ChatBubbleOutlineIcon
                      sx={{ fontSize: 16, mb: 0, mr: 1 }}
                    />
                  }
                  iconPosition="start"
                />
                <Tab
                  label="Submissions"
                  icon={<ListAltIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            {/* Content */}
            <Box sx={{ mt: 0 }}>
              {tabValue === 0 && <IssueConversation issue={issue} />}
              {tabValue === 1 && (
                <IssueSubmissionsTable
                  submissions={submissions}
                  isLoading={isLoadingSubmissions}
                  backLabel={`Back to Issue #${issue.issueNumber}`}
                />
              )}
            </Box>
          </Stack>
        </Box>
      )}
    </Page>
  );
};

export default IssueDetailsPage;

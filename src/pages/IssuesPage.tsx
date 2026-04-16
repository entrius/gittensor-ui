/**
 * Issues Page
 *
 * 3 tabs:
 * - Available Issues: Active issues ready for solving
 * - Pending Issues: Registered issues awaiting funding
 * - History: Completed or cancelled issues
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Tabs, Tab, Stack, Typography, alpha } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { IssueStats, IssuesList } from '../components/issues';
import { useIssuesStats, useIssues } from '../api';

const TAB_SLUGS = ['available', 'pending', 'history'] as const;

const ISSUE_LINK_STATE = { backLabel: 'Back to Bounties' } as const;
const getIssueHref = (id: number) => `/bounties/details?id=${id}`;

const IssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();

  const tabIndex = Math.max(
    0,
    TAB_SLUGS.indexOf(tabParam as (typeof TAB_SLUGS)[number]),
  );

  const statsQuery = useIssuesStats();
  const activeIssuesQuery = useIssues('active');
  const registeredIssuesQuery = useIssues('registered');
  const historyIssuesQuery = useIssues('completed,cancelled');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    navigate(`/bounties/${TAB_SLUGS[newValue]}`, { replace: true });
  };

  return (
    <Page title="Issue Bounties">
      <SEO
        title="Issue Bounties"
        description="Browse GitHub issues with Alpha bounties. Solve issues and earn rewards on Gittensor."
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
          px: { xs: 2, md: 3 },
        }}
      >
        <Stack spacing={3}>
          {/* Stats Header */}
          <IssueStats
            stats={statsQuery.data}
            isLoading={statsQuery.isLoading}
          />

          {/* Tabs Navigation */}
          <Box
            sx={(theme) => ({
              borderBottom: '1px solid',
              borderColor: theme.palette.border.light,
            })}
          >
            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              sx={(theme) => ({
                '& .MuiTab-root': {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  color: theme.palette.text.secondary,
                  minHeight: 48,
                  '&.Mui-selected': {
                    color: theme.palette.text.primary,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: theme.palette.text.primary,
                  height: 2,
                },
              })}
            >
              <Tab label="Available Issues" />
              <Tab label="Pending Issues" />
              <Tab label="History" />
            </Tabs>

            <Typography
              sx={{
                fontSize: '0.72rem',
                fontFamily: '"JetBrains Mono", monospace',
                color: (t) => alpha(t.palette.text.primary, 0.35),
                pr: 1,
              }}
            >
              Learn more about bounties in the{' '}
              <Typography
                component="a"
                href="https://docs.gittensor.io/issue-bounties.html"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'primary.main',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                docs
              </Typography>
            </Typography>
          </Box>

          {/* Tab Content */}
          <Box sx={{ minHeight: 400 }}>
            {tabIndex === 0 && (
              <IssuesList
                issues={activeIssuesQuery.data || []}
                isLoading={activeIssuesQuery.isLoading}
                listType="available"
                getIssueHref={getIssueHref}
                linkState={ISSUE_LINK_STATE}
              />
            )}
            {tabIndex === 1 && (
              <IssuesList
                issues={registeredIssuesQuery.data || []}
                isLoading={registeredIssuesQuery.isLoading}
                listType="pending"
                getIssueHref={getIssueHref}
                linkState={ISSUE_LINK_STATE}
              />
            )}
            {tabIndex === 2 && (
              <IssuesList
                issues={historyIssuesQuery.data || []}
                isLoading={historyIssuesQuery.isLoading}
                listType="history"
                getIssueHref={getIssueHref}
                linkState={ISSUE_LINK_STATE}
              />
            )}
          </Box>
        </Stack>
      </Box>
    </Page>
  );
};

export default IssuesPage;

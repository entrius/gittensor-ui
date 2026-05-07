import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { IssuesList, BountySidebar } from '../components/issues';
import { useIssuesStats, useIssues } from '../api';
import { useTwitterStickySidebar } from '../hooks/useTwitterStickySidebar';

const ISSUE_LINK_STATE = { backLabel: 'Back to Bounties' } as const;
const getIssueHref = (id: number) => `/bounties/details?id=${id}`;

const IssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const theme = useTheme();
  const showSidebarRight = useMediaQuery(theme.breakpoints.up('xl'));
  const stickySidebarRef = useTwitterStickySidebar();

  // Redirect legacy path-based tabs to query params
  useEffect(() => {
    if (
      tabParam === 'available' ||
      tabParam === 'pending' ||
      tabParam === 'history'
    ) {
      navigate(`/bounties?filter=${tabParam}`, { replace: true });
    }
  }, [tabParam, navigate]);

  const statsQuery = useIssuesStats();
  const activeIssuesQuery = useIssues('active');
  const registeredIssuesQuery = useIssues('registered');
  const historyIssuesQuery = useIssues('completed,cancelled');

  const allIssues = useMemo(() => {
    const seen = new Set<number>();
    const result = [];
    for (const issue of [
      ...(activeIssuesQuery.data || []),
      ...(registeredIssuesQuery.data || []),
      ...(historyIssuesQuery.data || []),
    ]) {
      if (!seen.has(issue.id)) {
        seen.add(issue.id);
        result.push(issue);
      }
    }
    return result;
  }, [
    activeIssuesQuery.data,
    registeredIssuesQuery.data,
    historyIssuesQuery.data,
  ]);

  // Show loading skeleton only while no data is available yet
  const isLoading =
    activeIssuesQuery.isLoading &&
    registeredIssuesQuery.isLoading &&
    historyIssuesQuery.isLoading;

  return (
    <Page title="Issue Bounties">
      <SEO
        title="Issue Bounties"
        description="Browse GitHub issues with Alpha bounties. Solve issues and earn rewards on Gittensor."
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
          px: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: showSidebarRight ? 'row' : 'column',
          alignItems: showSidebarRight ? 'flex-start' : 'stretch',
          gap: { xs: 2, sm: 2, md: 2.5, lg: 3 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            pr: showSidebarRight ? 1 : 0,
          }}
        >
          <IssuesList
            issues={allIssues}
            isLoading={isLoading}
            getIssueHref={getIssueHref}
            linkState={ISSUE_LINK_STATE}
          />
        </Box>
        <Box
          ref={showSidebarRight ? stickySidebarRef : undefined}
          sx={{
            width: showSidebarRight ? 340 : '100%',
            flexShrink: 0,
            position: showSidebarRight ? 'sticky' : 'static',
            top: showSidebarRight ? 88 : 'auto',
          }}
        >
          <BountySidebar
            issues={allIssues}
            stats={statsQuery.data}
            isLoading={isLoading}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default IssuesPage;

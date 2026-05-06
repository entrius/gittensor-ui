import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Stack, Typography, alpha, useMediaQuery } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Page } from '../components/layout';
import { SEO } from '../components';
import {
  IssueStats,
  IssuesList,
  type IssueStatsTabularCounts,
} from '../components/issues';
import { useIssuesStats, useIssues } from '../api';
import theme, { scrollbarSx } from '../theme';
import { useTwitterStickySidebar } from '../hooks/useTwitterStickySidebar';

const ISSUE_LINK_STATE = { backLabel: 'Back to Bounties' } as const;
const getIssueHref = (id: number) => `/bounties/details?id=${id}`;

const IssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();

  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const sidebarWidth =
    isMobile || isTablet ? '100%' : isLargeScreen ? '340px' : '300px';
  const stickySidebarRef = useTwitterStickySidebar();

  const optionsPortalTarget = useMemo(
    () => (
      <Box
        id="tabs-options-portal"
        sx={{
          display: 'none',
          '@media (min-width: 1536px)': {
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'border.light',
            backgroundColor: 'background.default',
          },
        }}
      />
    ),
    [],
  );

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

  const bountySidebarTabularCounts = useMemo<IssueStatsTabularCounts>(() => {
    const total = allIssues.length;
    const active = allIssues.filter((i) => i.status === 'active').length;
    const registered = allIssues.filter(
      (i) => i.status === 'registered',
    ).length;
    const history = allIssues.filter(
      (i) => i.status === 'completed' || i.status === 'cancelled',
    ).length;
    const completed = allIssues.filter((i) => i.status === 'completed').length;
    const cancelled = allIssues.filter((i) => i.status === 'cancelled').length;
    return {
      total,
      active,
      registered,
      history,
      completed,
      cancelled,
    };
  }, [allIssues]);

  const bountyIssuesMergedFetched =
    activeIssuesQuery.isFetched &&
    registeredIssuesQuery.isFetched &&
    historyIssuesQuery.isFetched;

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
          display: 'flex',
          flexDirection: isLargeScreen ? 'row' : 'column',
          alignItems: isLargeScreen ? 'flex-start' : 'stretch',
          gap: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 1.5 },
            minWidth: 0,
            pr: isLargeScreen ? 1 : 0,
            minHeight: isLargeScreen ? 'calc(100vh - 88px)' : 'auto',
          }}
        >
          <Stack spacing={3}>
            {!isLargeScreen ? (
              <IssueStats
                stats={statsQuery.data}
                isLoading={statsQuery.isLoading}
                layout="grid"
                gridMetrics="all"
              />
            ) : null}

            <Typography
              sx={{
                fontSize: '0.72rem',
                color: (t) => alpha(t.palette.text.primary, 0.35),
                pr: 1,
                mt: { xs: 0.5, md: 0 },
                textAlign: 'right',
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.25,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                docs
                <OpenInNewIcon sx={{ fontSize: '0.85em' }} aria-hidden="true" />
              </Typography>
            </Typography>

            <IssuesList
              issues={allIssues}
              isLoading={isLoading}
              getIssueHref={getIssueHref}
              linkState={ISSUE_LINK_STATE}
            />
          </Stack>
        </Box>

        {/* Filters portal on xl. */}
        <Box
          ref={isLargeScreen ? stickySidebarRef : undefined}
          sx={{
            width: isLargeScreen ? sidebarWidth : '100%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            position: isLargeScreen ? 'sticky' : 'static',
            top: isLargeScreen ? 88 : 'auto',
            ...(isLargeScreen && {
              maxHeight: 'calc(100vh - 88px)',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }),
          }}
        >
          <Stack spacing={2} sx={{ width: '100%', pr: 0.5, ...scrollbarSx }}>
            {isLargeScreen ? (
              <>
                <IssueStats
                  stats={statsQuery.data}
                  isLoading={statsQuery.isLoading || !bountyIssuesMergedFetched}
                  layout="sidebarDuo"
                  tabularCounts={bountySidebarTabularCounts}
                />
                <IssueStats
                  stats={statsQuery.data}
                  isLoading={statsQuery.isLoading}
                  layout="sidebarFinancial"
                />
              </>
            ) : null}
            {optionsPortalTarget}
          </Stack>
        </Box>
      </Box>
    </Page>
  );
};

export default IssuesPage;

import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Stack, Typography, alpha } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { IssueStats, IssuesList } from '../components/issues';
import { useIssuesStats } from '../api';
import { useMergedAllIssues } from '../hooks/useMergedAllIssues';

const ISSUE_LINK_STATE = { backLabel: 'Back to Bounties' } as const;
const getIssueHref = (id: number) => `/bounties/details?id=${id}`;

const IssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();

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
  const { issues: allIssues, isLoading } = useMergedAllIssues();

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
          <IssueStats
            stats={statsQuery.data}
            isLoading={statsQuery.isLoading}
          />

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
    </Page>
  );
};

export default IssuesPage;

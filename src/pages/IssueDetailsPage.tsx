import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress, Stack } from '@mui/material';
import { Page } from '../components/layout';
import { BackButton, SEO } from '../components';
import { IssueHeaderCard, IssueSubmissionsTable } from '../components/issues';
import { useIssueDetails, useIssueSubmissions } from '../api';

/**
 * Inline description card (not reused elsewhere)
 */
const IssueDescriptionCard: React.FC<{ body: string }> = ({ body }) => (
  <Card
    sx={{
      backgroundColor: '#000000',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 3,
      p: 3,
    }}
    elevation={0}
  >
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        mb: 2,
      }}
    >
      Description
    </Typography>
    <Box
      sx={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        fontSize: '0.95rem',
        lineHeight: 1.6,
        color: '#ffffff',
        '& a': {
          color: '#58a6ff',
        },
        '& code': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.85rem',
        },
        '& pre': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: '16px',
          borderRadius: '8px',
          overflow: 'auto',
        },
        '& img': {
          maxWidth: '100%',
          borderRadius: '8px',
        },
        '& ul, & ol': {
          paddingLeft: '24px',
        },
        '& blockquote': {
          borderLeft: '3px solid rgba(255, 255, 255, 0.2)',
          paddingLeft: '16px',
          margin: '16px 0',
          color: 'rgba(255, 255, 255, 0.7)',
        },
      }}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  </Card>
);

const IssueDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const idParam = searchParams.get('id');
  const id = idParam ? parseInt(idParam, 10) : 0;

  const { data: issue, isLoading: isLoadingDetails } = useIssueDetails(id);
  const { data: submissions, isLoading: isLoadingSubmissions } =
    useIssueSubmissions(id);

  // If no ID is provided, redirect to issues page
  if (!idParam) {
    if (typeof window !== 'undefined') {
      navigate('/issues');
    }
    return null;
  }

  return (
    <Page title="Issue Details">
      <SEO
        title={issue?.title || `Issue #${id}`}
        description={`View issue bounty details for ${issue?.repositoryFullName || 'issue'} #${issue?.issueNumber || id} on Gittensor.`}
        image={`${import.meta.env.VITE_REACT_APP_BASE_URL || ''}/og-image?type=bounty&id=${id}`}
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
          <BackButton to="/issues" label="Back to Issues" />
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
            <BackButton to="/issues" label="Back to Issues" mb={0} />
            <IssueHeaderCard issue={issue} />
            {issue.body && <IssueDescriptionCard body={issue.body} />}
            <IssueSubmissionsTable
              submissions={submissions}
              isLoading={isLoadingSubmissions}
              backLabel={`Back to Issue #${issue.issueNumber}`}
            />
          </Stack>
        </Box>
      )}
    </Page>
  );
};

export default IssueDetailsPage;

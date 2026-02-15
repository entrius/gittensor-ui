import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link,
  Stack,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Page } from '../components/layout';
import { BackButton, SEO } from '../components';
import { useIssueDetails, useIssueSubmissions } from '../api';
import { formatTokenAmount } from '../utils/format';

/**
 * Get status badge styling
 */
const getStatusBadge = (
  status: string,
): { color: string; bgColor: string; text: string } => {
  switch (status) {
    case 'registered':
      return {
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        text: 'Pending',
      };
    case 'active':
      return {
        color: '#58a6ff',
        bgColor: 'rgba(88, 166, 255, 0.15)',
        text: 'Available',
      };
    case 'completed':
      return {
        color: '#3fb950',
        bgColor: 'rgba(63, 185, 80, 0.15)',
        text: 'Completed',
      };
    case 'cancelled':
      return {
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        text: 'Cancelled',
      };
    default:
      return {
        color: '#8b949e',
        bgColor: 'rgba(139, 148, 158, 0.15)',
        text: status,
      };
  }
};

/**
 * Format date for display
 */
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

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

  const isLoading = isLoadingDetails;
  const statusBadge = issue ? getStatusBadge(issue.status) : null;

  const headerCellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    color: 'rgba(255, 255, 255, 0.3)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    py: 1.5,
  };

  const bodyCellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.85rem',
    color: '#ffffff',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    py: 1.5,
  };

  return (
    <Page title="Issue Details">
      <SEO
        title={issue?.title || `Issue #${id}`}
        description={`View issue bounty details for ${issue?.repositoryFullName || "issue"} #${issue?.issueNumber || id} on Gittensor.`}
        image={`${import.meta.env.VITE_REACT_APP_BASE_URL || ''}/og-image?type=bounty&id=${id}`}
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

            {/* Issue Header Card */}
            <Card
              sx={{
                backgroundColor: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                p: 3,
              }}
              elevation={0}
            >
              <Stack spacing={2}>
                {/* Repository and Issue Number */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '1rem',
                      color: '#58a6ff',
                    }}
                  >
                    {issue.repositoryFullName}
                  </Typography>
                  <Link
                    href={issue.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '1rem',
                      color: '#ffffff',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    #{issue.issueNumber}
                    <OpenInNewIcon sx={{ fontSize: 16, opacity: 0.5 }} />
                  </Link>
                  {statusBadge && (
                    <Chip
                      label={statusBadge.text}
                      size="small"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: statusBadge.bgColor,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.color}40`,
                      }}
                    />
                  )}
                </Box>

                {/* Title */}
                {issue.title && (
                  <Typography
                    sx={{
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      color: '#ffffff',
                    }}
                  >
                    {issue.title}
                  </Typography>
                )}

                {/* Bounty and metadata row */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.7rem',
                        color: 'rgba(255, 255, 255, 0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        mb: 0.5,
                      }}
                    >
                      {issue.status === 'completed' ? 'Payout' : 'Bounty'}
                    </Typography>
                    {issue.status === 'registered' ? (
                      // Pending: show current/target
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: '#f59e0b',
                          }}
                        >
                          {formatTokenAmount(issue.bountyAmount)}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                          }}
                        >
                          / {formatTokenAmount(issue.targetBounty)} ل
                        </Typography>
                      </Box>
                    ) : issue.status === 'completed' ? (
                      // Completed: show payout amount
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color: '#3fb950',
                        }}
                      >
                        {formatTokenAmount(
                          issue.payoutAmount || issue.targetBounty,
                        )}{' '}
                        ل
                      </Typography>
                    ) : (
                      // Active or Cancelled: show target bounty
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color:
                            issue.status === 'active'
                              ? '#3fb950'
                              : 'rgba(255, 255, 255, 0.6)',
                        }}
                      >
                        {formatTokenAmount(issue.targetBounty)} ل
                      </Typography>
                    )}
                  </Box>

                  {issue.authorLogin && (
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.7rem',
                          color: 'rgba(255, 255, 255, 0.5)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          mb: 0.5,
                        }}
                      >
                        Author
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.9rem',
                          color: '#ffffff',
                        }}
                      >
                        {issue.authorLogin}
                      </Typography>
                    </Box>
                  )}

                  <Box>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.7rem',
                        color: 'rgba(255, 255, 255, 0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        mb: 0.5,
                      }}
                    >
                      Created
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.9rem',
                        color: '#ffffff',
                      }}
                    >
                      {formatDate(issue.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {/* Labels */}
                {issue.labels && issue.labels.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {issue.labels.map((label) => (
                      <Chip
                        key={label}
                        label={label}
                        size="small"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.7rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Stack>
            </Card>

            {/* Issue Body */}
            {issue.body && (
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
                  dangerouslySetInnerHTML={{ __html: issue.body }}
                />
              </Card>
            )}

            {/* Submissions Section */}
            <Card
              sx={{
                backgroundColor: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
              elevation={0}
            >
              <Box sx={{ p: 3, pb: 2 }}>
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Submissions ({submissions?.length || 0})
                </Typography>
              </Box>

              {isLoadingSubmissions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : !submissions || submissions.length === 0 ? (
                <Box sx={{ p: 4, pt: 2, textAlign: 'center' }}>
                  <Typography
                    sx={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.9rem',
                    }}
                  >
                    No submissions yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headerCellSx}>PR</TableCell>
                        <TableCell sx={headerCellSx}>Title</TableCell>
                        <TableCell sx={headerCellSx}>Author</TableCell>
                        <TableCell
                          sx={{ ...headerCellSx, textAlign: 'center' }}
                        >
                          Status
                        </TableCell>
                        <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>
                          Tokens
                        </TableCell>
                        <TableCell
                          sx={{ ...headerCellSx, textAlign: 'center' }}
                        >
                          Date
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {submissions.map((submission) => (
                        <TableRow
                          key={`${submission.repositoryFullName}-${submission.number}`}
                          onClick={() =>
                            navigate(
                              `/miners/pr?repo=${encodeURIComponent(submission.repositoryFullName)}&number=${submission.number}`,
                            )
                          }
                          sx={{
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            },
                          }}
                        >
                          <TableCell sx={bodyCellSx}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              #{submission.number}
                              {submission.isWinner && (
                                <EmojiEventsIcon
                                  sx={{ fontSize: 16, color: '#f59e0b' }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell
                            sx={{
                              ...bodyCellSx,
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {submission.title}
                          </TableCell>
                          <TableCell sx={bodyCellSx}>
                            {submission.authorGithubId ? (
                              <Typography
                                component="span"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/miners/details?githubId=${submission.authorGithubId}`,
                                  );
                                }}
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: '0.85rem',
                                  color: '#58a6ff',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    textDecoration: 'underline',
                                  },
                                }}
                              >
                                {submission.authorLogin}
                              </Typography>
                            ) : (
                              <Typography
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: '0.85rem',
                                  color: '#58a6ff',
                                }}
                              >
                                {submission.authorLogin}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell
                            sx={{ ...bodyCellSx, textAlign: 'center' }}
                          >
                            <Chip
                              label={
                                submission.mergedAt
                                  ? 'Merged'
                                  : submission.prState === 'open'
                                    ? 'Open'
                                    : 'Closed'
                              }
                              size="small"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                backgroundColor: submission.mergedAt
                                  ? 'rgba(136, 87, 229, 0.15)'
                                  : submission.prState === 'open'
                                    ? 'rgba(63, 185, 80, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color: submission.mergedAt
                                  ? "#a371f7"
                                  : submission.prState === "open"
                                    ? "#3fb950"
                                    : "#ef4444",
                                border: `1px solid ${submission.mergedAt
                                  ? "#a371f740"
                                  : submission.prState === "open"
                                    ? "#3fb95040"
                                    : "#ef444440"
                                  }`,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ ...bodyCellSx, textAlign: 'right' }}>
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#ffffff',
                              }}
                            >
                              {Number(submission.tokenScore).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell
                            sx={{ ...bodyCellSx, textAlign: 'center' }}
                          >
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '0.8rem',
                                color: 'rgba(255, 255, 255, 0.6)',
                              }}
                            >
                              {formatDate(submission.prCreatedAt)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Stack>
        </Box>
      )}
    </Page>
  );
};

export default IssueDetailsPage;

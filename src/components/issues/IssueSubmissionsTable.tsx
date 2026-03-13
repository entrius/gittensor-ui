import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  alpha,
  useTheme,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { IssueSubmission } from '../../api/models/Issues';
import { STATUS_COLORS } from '../../theme';

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getHeaderCellSx = (t: any) => ({
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
  color: t.palette.text.disabled,
  borderBottom: `1px solid ${t.palette.border.light}`,
  py: 1.5,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getBodyCellSx = (t: any) => ({
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.85rem',
  color: t.palette.text.primary,
  borderBottom: `1px solid ${t.palette.border.subtle}`,
  py: 1.5,
});

interface IssueSubmissionsTableProps {
  submissions: IssueSubmission[] | undefined;
  isLoading: boolean;
  backLabel?: string;
}

const IssueSubmissionsTable: React.FC<IssueSubmissionsTableProps> = ({
  submissions,
  isLoading,
  backLabel,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Card
      sx={{
        backgroundColor: theme.palette.background.default,
        border: `1px solid ${theme.palette.border.light}`,
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
            color: theme.palette.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Submissions ({submissions?.length || 0})
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : !submissions || submissions.length === 0 ? (
        <Box sx={{ p: 4, pt: 2, textAlign: 'center' }}>
          <Typography
            sx={{
              color: theme.palette.text.secondary,
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
                <TableCell sx={getHeaderCellSx(theme)}>PR</TableCell>
                <TableCell sx={getHeaderCellSx(theme)}>Title</TableCell>
                <TableCell sx={getHeaderCellSx(theme)}>Author</TableCell>
                <TableCell
                  sx={{ ...getHeaderCellSx(theme), textAlign: 'center' }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{ ...getHeaderCellSx(theme), textAlign: 'right' }}
                >
                  Tokens
                </TableCell>
                <TableCell
                  sx={{ ...getHeaderCellSx(theme), textAlign: 'center' }}
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
                      backLabel ? { state: { backLabel } } : undefined,
                    )
                  }
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      backgroundColor: theme.palette.surface.subtle,
                    },
                  }}
                >
                  <TableCell sx={getBodyCellSx(theme)}>
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
                          sx={{ fontSize: 16, color: STATUS_COLORS.award }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      ...getBodyCellSx(theme),
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {submission.title}
                  </TableCell>
                  <TableCell sx={getBodyCellSx(theme)}>
                    {submission.authorGithubId ? (
                      <Typography
                        component="span"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/miners/details?githubId=${submission.authorGithubId}`,
                            backLabel ? { state: { backLabel } } : undefined,
                          );
                        }}
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.85rem',
                          color: STATUS_COLORS.info,
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
                          color: STATUS_COLORS.info,
                        }}
                      >
                        {submission.authorLogin}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell
                    sx={{ ...getBodyCellSx(theme), textAlign: 'center' }}
                  >
                    {(() => {
                      const state = submission.mergedAt
                        ? 'MERGED'
                        : submission.prState === 'OPEN'
                          ? 'OPEN'
                          : 'CLOSED';
                      let color = theme.palette.status.neutral;
                      if (state === 'MERGED') {
                        color = theme.palette.status.merged;
                      } else if (state === 'OPEN') {
                        color = theme.palette.status.open;
                      } else if (state === 'CLOSED') {
                        color = theme.palette.status.closed;
                      }
                      return (
                        <Chip
                          variant="status"
                          label={state}
                          sx={{
                            color,
                            borderColor: color,
                          }}
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell
                    sx={{ ...getBodyCellSx(theme), textAlign: 'right' }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                      }}
                    >
                      {Number(submission.tokenScore).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{ ...getBodyCellSx(theme), textAlign: 'center' }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.8rem',
                        color: alpha(theme.palette.text.primary, 0.6),
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
  );
};

export default IssueSubmissionsTable;

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

      {isLoading ? (
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
                <TableCell sx={{ ...headerCellSx, textAlign: 'center' }}>
                  Status
                </TableCell>
                <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>
                  Tokens
                </TableCell>
                <TableCell sx={{ ...headerCellSx, textAlign: 'center' }}>
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
                          sx={{ fontSize: 16, color: STATUS_COLORS.award }}
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
                  <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
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
                  <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
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
  );
};

export default IssueSubmissionsTable;

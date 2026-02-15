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
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { IssueSubmission } from '../../api/models/Issues';

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
}

const IssueSubmissionsTable: React.FC<IssueSubmissionsTableProps> = ({
  submissions,
  isLoading,
}) => {
  const navigate = useNavigate();

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
                  <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
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
                          ? '#a371f7'
                          : submission.prState === 'open'
                            ? '#3fb950'
                            : '#ef4444',
                        border: `1px solid ${
                          submission.mergedAt
                            ? '#a371f740'
                            : submission.prState === 'open'
                              ? '#3fb95040'
                              : '#ef444440'
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

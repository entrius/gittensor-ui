import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import { useAllPrs } from '../../api';
import { Link as RouterLink } from 'react-router-dom';
import {
  getPrStatusCounts,
  isClosedUnmergedPr,
  isMergedPr,
  isOpenPr,
} from '../../utils';
import theme from '../../theme';

interface RepositoryPRsTableProps {
  repositoryFullName: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
}

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
  state = 'all',
}) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'merged'>(
    state,
  );

  // Fetch ALL PRs at once to enable client-side filtering and accurate counts
  // This avoids server roundtrips on filter change and provides instant UI feedback
  const { data: allMinerPRs, isLoading } = useAllPrs();

  const allPRs = useMemo(() => {
    if (!allMinerPRs) return [];
    return allMinerPRs.filter(
      (pr) => pr.repository.toLowerCase() === repositoryFullName.toLowerCase(),
    );
  }, [allMinerPRs, repositoryFullName]);

  const counts = useMemo(() => {
    if (!allPRs) return { all: 0, open: 0, merged: 0, closed: 0 };
    return getPrStatusCounts(allPRs);
  }, [allPRs]);

  const filteredPRs = useMemo(() => {
    if (!allPRs) return [];
    if (filter === 'all') return allPRs;
    if (filter === 'merged') return allPRs.filter(isMergedPr);
    if (filter === 'open') return allPRs.filter(isOpenPr);
    if (filter === 'closed') return allPRs.filter(isClosedUnmergedPr);
    return allPRs;
  }, [allPRs, filter]);

  const sortedPRs = useMemo(
    () =>
      [...filteredPRs].sort(
        (a, b) => parseFloat(b.score || '0') - parseFloat(a.score || '0'),
      ),
    [filteredPRs],
  );

  const FilterButton = ({
    label,
    value,
    count,
    color,
  }: {
    label: string;
    value: typeof filter;
    count?: number;
    color: string;
  }) => (
    <Button
      size="small"
      onClick={() => setFilter(value)}
      sx={{
        color: filter === value ? '#fff' : 'rgba(255,255,255,0.5)',
        backgroundColor:
          filter === value ? 'rgba(255,255,255,0.1)' : 'transparent',
        borderRadius: '6px',
        px: 2,
        minWidth: 'auto',
        textTransform: 'none',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.8rem',
        border:
          filter === value ? `1px solid ${color}` : '1px solid transparent',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.15)',
        },
      }}
    >
      {label}{' '}
      {count !== undefined && (
        <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.75rem' }}>
          {count}
        </span>
      )}
    </Button>
  );

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{ color: '#fff', fontFamily: '"JetBrains Mono", monospace' }}
          >
            Pull Requests
          </Typography>
          <Stack direction="row" spacing={1}>
            <FilterButton
              label="All"
              value="all"
              count={counts.all}
              color={theme.palette.status.neutral}
            />
            <FilterButton
              label="Open"
              value="open"
              count={counts.open}
              color={theme.palette.status.open}
            />
            <FilterButton
              label="Merged"
              value="merged"
              count={counts.merged}
              color={theme.palette.status.merged}
            />
            <FilterButton
              label="Closed"
              value="closed"
              count={counts.closed}
              color={theme.palette.status.closed}
            />
          </Stack>
        </Box>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: '#ffffff',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1.1rem',
            fontWeight: 500,
          }}
        >
          Pull Requests ({sortedPRs.length})
        </Typography>

        <Stack direction="row" spacing={1}>
          <FilterButton
            label="All"
            value="all"
            count={counts.all}
            color={theme.palette.status.neutral}
          />
          <FilterButton
            label="Open"
            value="open"
            count={counts.open}
            color={theme.palette.status.open}
          />
          <FilterButton
            label="Merged"
            value="merged"
            count={counts.merged}
            color={theme.palette.status.merged}
          />
          <FilterButton
            label="Closed"
            value="closed"
            count={counts.closed}
            color={theme.palette.status.closed}
          />
        </Stack>
      </Box>

      {sortedPRs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No pull requests found
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            maxHeight: '500px',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
            },
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellStyle}>PR #</TableCell>
                <TableCell sx={headerCellStyle}>Title</TableCell>
                <TableCell sx={headerCellStyle}>Author</TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Commits
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  +/-
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Score
                </TableCell>
                <TableCell sx={headerCellStyle}>Status</TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Merged
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPRs.map((pr, index) => (
                <TableRow
                  key={`${pr.pullRequestNumber}-${index}`}
                  component={RouterLink}
                  to={`/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`}
                  state={{ backLabel: `Back to ${repositoryFullName}` }}
                  sx={{
                    cursor: 'pointer',
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <TableCell sx={bodyCellStyle}>
                    <a
                      href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{pr.pullRequestNumber}
                    </a>
                  </TableCell>
                  <TableCell sx={bodyCellStyle}>
                    <Box
                      sx={{
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pr.pullRequestTitle}
                    </Box>
                  </TableCell>

                  <TableCell sx={bodyCellStyle}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${pr.author}`}
                        alt={pr.author}
                        sx={{ width: 20, height: 20 }}
                      />
                      {pr.author}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={bodyCellStyle}>
                    {pr.commitCount}
                  </TableCell>
                  <TableCell align="right" sx={bodyCellStyle}>
                    <Box
                      component="span"
                      sx={{ color: theme.palette.diff.additions, mr: 1 }}
                    >
                      +{pr.additions}
                    </Box>
                    <Box
                      component="span"
                      sx={{ color: theme.palette.diff.deletions }}
                    >
                      -{pr.deletions}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={bodyCellStyle}>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {parseFloat(pr.score || '0').toFixed(4)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={bodyCellStyle}>
                    {(() => {
                      const state =
                        pr.prState?.toUpperCase() ||
                        (pr.mergedAt ? 'MERGED' : 'OPEN');
                      let color = theme.palette.status.neutral;
                      const label = state;

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
                          label={label}
                          sx={{
                            color,
                            borderColor: color,
                          }}
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell align="right" sx={bodyCellStyle}>
                    {pr.mergedAt
                      ? new Date(pr.mergedAt).toLocaleDateString()
                      : '-'}
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

const headerCellStyle = {
  backgroundColor: 'rgba(18, 18, 20, 0.95)',
  backdropFilter: 'blur(8px)',
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const bodyCellStyle = {
  color: '#ffffff',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  fontSize: '0.85rem',
};

export default RepositoryPRsTable;

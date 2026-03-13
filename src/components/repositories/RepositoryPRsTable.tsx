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
  alpha,
  useTheme,
} from '@mui/material';
import { useAllPrs, useAllMiners } from '../../api';
import { useNavigate } from 'react-router-dom';

interface RepositoryPRsTableProps {
  repositoryFullName: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
}

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
  state = 'all',
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'merged'>(
    state,
  );

  // Fetch ALL PRs at once to enable client-side filtering and accurate counts
  // This avoids server roundtrips on filter change and provides instant UI feedback
  const { data: allMinerPRs, isLoading } = useAllPrs();
  const { data: allMinersStats } = useAllMiners();

  // Create miner tier map for quick lookup
  const minerTierMap = useMemo(() => {
    const map = new Map<string, string>();
    if (allMinersStats) {
      allMinersStats.forEach((miner) => {
        if (miner.githubId && miner.currentTier) {
          map.set(miner.githubId, miner.currentTier);
        }
      });
    }
    return map;
  }, [allMinersStats]);

  const allPRs = useMemo(() => {
    if (!allMinerPRs) return [];
    return allMinerPRs.filter(
      (pr) => pr.repository.toLowerCase() === repositoryFullName.toLowerCase(),
    );
  }, [allMinerPRs, repositoryFullName]);

  const counts = useMemo(() => {
    if (!allPRs) return { all: 0, open: 0, merged: 0, closed: 0 };
    return {
      all: allPRs.length,
      open: allPRs.filter(
        (pr) => pr.prState === 'OPEN' || (!pr.prState && !pr.mergedAt),
      ).length,
      merged: allPRs.filter((pr) => pr.prState === 'MERGED' || !!pr.mergedAt)
        .length,
      closed: allPRs.filter((pr) => pr.prState === 'CLOSED' && !pr.mergedAt)
        .length,
    };
  }, [allPRs]);

  const filteredPRs = useMemo(() => {
    if (!allPRs) return [];
    if (filter === 'all') return allPRs;
    if (filter === 'merged')
      return allPRs.filter((pr) => pr.prState === 'MERGED' || !!pr.mergedAt);
    if (filter === 'open')
      return allPRs.filter(
        (pr) => pr.prState === 'OPEN' || (!pr.prState && !pr.mergedAt),
      );
    if (filter === 'closed')
      return allPRs.filter((pr) => pr.prState === 'CLOSED' && !pr.mergedAt);
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
        color:
          filter === value
            ? theme.palette.text.primary
            : theme.palette.text.secondary,
        backgroundColor:
          filter === value ? theme.palette.surface.subtle : 'transparent',
        borderRadius: '6px',
        px: 2,
        minWidth: 'auto',
        textTransform: 'none',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.8rem',
        border:
          filter === value ? `1px solid ${color}` : '1px solid transparent',
        '&:hover': {
          backgroundColor: theme.palette.surface.light,
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
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.text.primary,
              fontFamily: '"JetBrains Mono", monospace',
            }}
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
        border: `1px solid ${theme.palette.border.light}`,
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
          borderBottom: `1px solid ${theme.palette.border.light}`,
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
            color: theme.palette.text.primary,
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
              color: 'text.secondary',
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
              backgroundColor: theme.palette.border.light,
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: theme.palette.border.medium,
              },
            },
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={getHeaderCellStyle(theme)}>PR #</TableCell>
                <TableCell sx={getHeaderCellStyle(theme)}>Title</TableCell>
                <TableCell sx={getHeaderCellStyle(theme)}>Author</TableCell>
                <TableCell align="right" sx={getHeaderCellStyle(theme)}>
                  Commits
                </TableCell>
                <TableCell align="right" sx={getHeaderCellStyle(theme)}>
                  +/-
                </TableCell>
                <TableCell align="right" sx={getHeaderCellStyle(theme)}>
                  Score
                </TableCell>
                <TableCell sx={getHeaderCellStyle(theme)}>Status</TableCell>
                <TableCell align="right" sx={getHeaderCellStyle(theme)}>
                  Merged
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPRs.map((pr, index) => (
                <TableRow
                  key={`${pr.pullRequestNumber}-${index}`}
                  onClick={() => {
                    navigate(
                      `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                      { state: { backLabel: `Back to ${repositoryFullName}` } },
                    );
                  }}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: theme.palette.surface.subtle,
                    },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <TableCell sx={getBodyCellStyle(theme)}>
                    <a
                      href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'inherit',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{pr.pullRequestNumber}
                    </a>
                  </TableCell>
                  <TableCell sx={getBodyCellStyle(theme)}>
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

                  <TableCell sx={getBodyCellStyle(theme)}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        opacity:
                          pr.githubId && minerTierMap.has(pr.githubId)
                            ? 1
                            : 0.5,
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
                  <TableCell align="right" sx={getBodyCellStyle(theme)}>
                    {pr.commitCount}
                  </TableCell>
                  <TableCell align="right" sx={getBodyCellStyle(theme)}>
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
                  <TableCell align="right" sx={getBodyCellStyle(theme)}>
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
                  <TableCell sx={getBodyCellStyle(theme)}>
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
                  <TableCell align="right" sx={getBodyCellStyle(theme)}>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getHeaderCellStyle = (t: any) => ({
  backgroundColor:
    t.palette.mode === 'dark'
      ? 'rgba(18, 18, 20, 0.95)'
      : 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(8px)',
  color: alpha(t.palette.text.primary, 0.7),
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: `1px solid ${t.palette.border.light}`,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getBodyCellStyle = (t: any) => ({
  color: t.palette.text.primary,
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: `1px solid ${t.palette.border.light}`,
  fontSize: '0.85rem',
});

export default RepositoryPRsTable;

import React, { useCallback, useMemo, useState } from 'react';
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
  TableSortLabel,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';

type PrSortField =
  | 'pullRequestNumber'
  | 'pullRequestTitle'
  | 'author'
  | 'commitCount'
  | 'lines'
  | 'score'
  | 'status'
  | 'mergedAt';
type SortOrder = 'asc' | 'desc';
import { useAllPrs } from '../../api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TEXT_OPACITY,
  scrollbarSx,
  headerCellStyle,
  bodyCellStyle,
} from '../../theme';
import { filterPrs, getPrStatusCounts, type PrStatusFilter } from '../../utils';
import FilterButton from '../FilterButton';

const PR_STATUS_FILTERS: readonly PrStatusFilter[] = [
  'all',
  'open',
  'merged',
  'closed',
];

const isPrStatusFilter = (value: string | null): value is PrStatusFilter =>
  value !== null && (PR_STATUS_FILTERS as readonly string[]).includes(value);

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
  const [searchParams, setSearchParams] = useSearchParams();
  const prStatusParam = searchParams.get('prStatus');
  const filter: PrStatusFilter = isPrStatusFilter(prStatusParam)
    ? prStatusParam
    : state;

  const setFilter = useCallback(
    (next: PrStatusFilter) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (next === 'all') nextParams.delete('prStatus');
          else nextParams.set('prStatus', next);
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [sortField, setSortField] = useState<PrSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: PrSortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(
        field === 'pullRequestTitle' || field === 'author' ? 'asc' : 'desc',
      );
    }
  };

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

  const filteredPRs = useMemo(
    () => filterPrs(allPRs ?? [], { statusFilter: filter }),
    [allPRs, filter],
  );

  const sortedPRs = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const cmpStr = (a = '', b = '') => a.localeCompare(b) * dir;
    const cmpNum = (a = 0, b = 0) => (a - b) * dir;
    const stateRank = (pr: (typeof filteredPRs)[number]) => {
      const s = pr.prState?.toUpperCase() || (pr.mergedAt ? 'MERGED' : 'OPEN');
      return (
        ({ OPEN: 0, MERGED: 1, CLOSED: 2 } as Record<string, number>)[s] ?? 3
      );
    };

    return [...filteredPRs].sort((a, b) => {
      switch (sortField) {
        case 'pullRequestNumber':
          return cmpNum(a.pullRequestNumber, b.pullRequestNumber);
        case 'pullRequestTitle':
          return cmpStr(a.pullRequestTitle, b.pullRequestTitle);
        case 'author':
          return cmpStr(a.author, b.author);
        case 'commitCount':
          return cmpNum(a.commitCount, b.commitCount);
        case 'lines':
          return cmpNum(
            (a.additions ?? 0) + (a.deletions ?? 0),
            (b.additions ?? 0) + (b.deletions ?? 0),
          );
        case 'status':
          return (stateRank(a) - stateRank(b)) * dir;
        case 'mergedAt':
          return cmpNum(
            a.mergedAt ? new Date(a.mergedAt).getTime() : 0,
            b.mergedAt ? new Date(b.mergedAt).getTime() : 0,
          );
        case 'score':
        default:
          return cmpNum(parseFloat(a.score || '0'), parseFloat(b.score || '0'));
      }
    });
  }, [filteredPRs, sortField, sortOrder]);

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
              color: 'text.primary',
            }}
          >
            Pull Requests
          </Typography>
          <Stack direction="row" spacing={1}>
            <FilterButton
              label="All"
              isActive={filter === 'all'}
              onClick={() => setFilter('all')}
              count={counts.all}
              color={theme.palette.status.neutral}
            />
            <FilterButton
              label="Open"
              isActive={filter === 'open'}
              onClick={() => setFilter('open')}
              count={counts.open}
              color={theme.palette.status.open}
            />
            <FilterButton
              label="Merged"
              isActive={filter === 'merged'}
              onClick={() => setFilter('merged')}
              count={counts.merged}
              color={theme.palette.status.merged}
            />
            <FilterButton
              label="Closed"
              isActive={filter === 'closed'}
              onClick={() => setFilter('closed')}
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
            color: 'text.primary',
            fontSize: '1.1rem',
            fontWeight: 500,
          }}
        >
          Pull Requests ({sortedPRs.length})
        </Typography>

        <Stack direction="row" spacing={1}>
          <FilterButton
            label="All"
            isActive={filter === 'all'}
            onClick={() => setFilter('all')}
            count={counts.all}
            color={theme.palette.status.neutral}
          />
          <FilterButton
            label="Open"
            isActive={filter === 'open'}
            onClick={() => setFilter('open')}
            count={counts.open}
            color={theme.palette.status.open}
          />
          <FilterButton
            label="Merged"
            isActive={filter === 'merged'}
            onClick={() => setFilter('merged')}
            count={counts.merged}
            color={theme.palette.status.merged}
          />
          <FilterButton
            label="Closed"
            isActive={filter === 'closed'}
            onClick={() => setFilter('closed')}
            count={counts.closed}
            color={theme.palette.status.closed}
          />
        </Stack>
      </Box>

      {sortedPRs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            sx={{
              color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
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
            ...scrollbarSx,
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'pullRequestNumber'}
                    direction={
                      sortField === 'pullRequestNumber' ? sortOrder : 'desc'
                    }
                    onClick={() => handleSort('pullRequestNumber')}
                  >
                    PR #
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'pullRequestTitle'}
                    direction={
                      sortField === 'pullRequestTitle' ? sortOrder : 'asc'
                    }
                    onClick={() => handleSort('pullRequestTitle')}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'author'}
                    direction={sortField === 'author' ? sortOrder : 'asc'}
                    onClick={() => handleSort('author')}
                  >
                    Author
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'commitCount'}
                    direction={sortField === 'commitCount' ? sortOrder : 'desc'}
                    onClick={() => handleSort('commitCount')}
                  >
                    Commits
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'lines'}
                    direction={sortField === 'lines' ? sortOrder : 'desc'}
                    onClick={() => handleSort('lines')}
                  >
                    +/-
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'score'}
                    direction={sortField === 'score' ? sortOrder : 'desc'}
                    onClick={() => handleSort('score')}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortOrder : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'mergedAt'}
                    direction={sortField === 'mergedAt' ? sortOrder : 'desc'}
                    onClick={() => handleSort('mergedAt')}
                  >
                    Merged
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPRs.map((pr) => (
                <TableRow
                  key={`${pr.repository}-${pr.pullRequestNumber}`}
                  onClick={() => {
                    navigate(
                      `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                      { state: { backLabel: `Back to ${repositoryFullName}` } },
                    );
                  }}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'surface.light',
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
                        color: theme.palette.text.primary,
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

export default RepositoryPRsTable;

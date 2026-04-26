import React, { useCallback, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAllPrs, type CommitLog } from '../../api';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import theme, {
  TEXT_OPACITY,
  scrollbarSx,
  tooltipSlotProps,
} from '../../theme';
import { filterPrs, getPrStatusCounts, type PrStatusFilter } from '../../utils';
import FilterButton from '../FilterButton';

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

interface RepositoryPRsTableProps {
  repositoryFullName: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
}

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
  state = 'all',
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PrStatusFilter>(state);
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

  // Fetch ALL PRs at once for instant client-side filtering + accurate counts.
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

  const handleRowClick = useCallback(
    (pr: CommitLog) => {
      navigate(
        `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
        { state: { backLabel: `Back to ${repositoryFullName}` } },
      );
    },
    [navigate, repositoryFullName],
  );

  const filterButtons = (
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
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            Pull Requests
          </Typography>
          {filterButtons}
        </Box>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  const columns: DataTableColumn<CommitLog, PrSortField>[] = [
    {
      key: 'pullRequestNumber',
      header: 'PR #',
      sortKey: 'pullRequestNumber',
      renderCell: (pr) => (
        // Native <a> to GitHub — `onRowClick` (no row-as-anchor) keeps this valid HTML.
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
      ),
    },
    {
      key: 'pullRequestTitle',
      header: 'Title',
      sortKey: 'pullRequestTitle',
      renderCell: (pr) => (
        <Tooltip
          title={pr.pullRequestTitle}
          arrow
          placement="bottom"
          slotProps={tooltipSlotProps}
        >
          <Box
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {pr.pullRequestTitle}
          </Box>
        </Tooltip>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      sortKey: 'author',
      renderCell: (pr) => (
        <Tooltip
          title={pr.author}
          arrow
          placement="bottom"
          slotProps={tooltipSlotProps}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
          >
            <Avatar
              src={`https://avatars.githubusercontent.com/${pr.author}`}
              alt={pr.author}
              sx={{ width: 20, height: 20, flexShrink: 0 }}
            />
            <Box
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {pr.author}
            </Box>
          </Box>
        </Tooltip>
      ),
    },
    {
      key: 'commitCount',
      header: 'Commits',
      align: 'right',
      sortKey: 'commitCount',
      renderCell: (pr) => pr.commitCount,
    },
    {
      key: 'lines',
      header: '+/-',
      align: 'right',
      sortKey: 'lines',
      renderCell: (pr) => (
        <>
          <Box
            component="span"
            sx={{ color: theme.palette.diff.additions, mr: 1 }}
          >
            +{pr.additions}
          </Box>
          <Box component="span" sx={{ color: theme.palette.diff.deletions }}>
            -{pr.deletions}
          </Box>
        </>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      sortKey: 'score',
      renderCell: (pr) => (
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
          {parseFloat(pr.score || '0').toFixed(4)}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      renderCell: (pr) => {
        const state =
          pr.prState?.toUpperCase() || (pr.mergedAt ? 'MERGED' : 'OPEN');
        let color = theme.palette.status.neutral;
        if (state === 'MERGED') color = theme.palette.status.merged;
        else if (state === 'OPEN') color = theme.palette.status.open;
        else if (state === 'CLOSED') color = theme.palette.status.closed;
        return (
          <Chip
            variant="status"
            label={state}
            sx={{ color, borderColor: color }}
          />
        );
      },
    },
    {
      key: 'mergedAt',
      header: 'Merged',
      align: 'right',
      sortKey: 'mergedAt',
      renderCell: (pr) =>
        pr.mergedAt ? new Date(pr.mergedAt).toLocaleDateString() : '-',
    },
  ];

  const headerToolbar = (
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
        sx={{ color: 'text.primary', fontSize: '1.1rem', fontWeight: 500 }}
      >
        Pull Requests ({sortedPRs.length})
      </Typography>
      {filterButtons}
    </Box>
  );

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
        // Bounded scroll ancestor for the sticky header inside DataTable.
        '& .MuiTableContainer-root': {
          maxHeight: '500px',
          overflow: 'auto',
          ...scrollbarSx,
        },
      }}
      elevation={0}
    >
      <DataTable<CommitLog, PrSortField>
        columns={columns}
        rows={sortedPRs}
        getRowKey={(pr) => `${pr.repository}-${pr.pullRequestNumber}`}
        stickyHeader
        size="medium"
        header={headerToolbar}
        emptyState={
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
        }
        onRowClick={handleRowClick}
        sort={{
          field: sortField,
          order: sortOrder,
          onChange: handleSort,
        }}
      />
    </Card>
  );
};

export default RepositoryPRsTable;

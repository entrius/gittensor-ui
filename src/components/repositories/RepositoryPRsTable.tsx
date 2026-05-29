import React, { useCallback, useMemo, useState } from 'react';
import { useSessionStoredState } from '../../hooks/useSessionStoredState';
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAllPrs, type CommitLog } from '../../api';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import { WatchlistButton } from '../../components/common';
import TablePagination from '../../components/common/TablePagination';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import { ScrollAwareTooltip } from '../../components/common/ScrollAwareTooltip';
import {
  comparePRsByWatchlist,
  serializePRKey,
  useWatchlist,
} from '../../hooks/useWatchlist';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import theme, { TEXT_OPACITY, scrollbarSx } from '../../theme';
import {
  filterPrs,
  getPrStatusCounts,
  minerPrPath,
  type PrStatusFilter,
} from '../../utils';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { formatDate } from '../../utils/format';
import FilterButton from '../FilterButton';
import { AUTHOR_FILTER_ALL, AuthorFilter } from './AuthorFilter';

type PrSortField =
  | 'pullRequestNumber'
  | 'pullRequestTitle'
  | 'author'
  | 'commitCount'
  | 'lines'
  | 'score'
  | 'status'
  | 'mergedAt'
  | 'watch';

const PR_SORT_KEYS: readonly PrSortField[] = [
  'pullRequestNumber',
  'pullRequestTitle',
  'author',
  'commitCount',
  'lines',
  'score',
  'status',
  'mergedAt',
  'watch',
];

interface RepositoryPRsTableProps {
  repositoryFullName: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
}

const isPrStatusFilter = (v: unknown): v is PrStatusFilter =>
  v === 'all' || v === 'open' || v === 'merged' || v === 'closed';

const PR_PAGE_SIZE = 20;

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
  state = 'all',
}) => {
  const navigate = useNavigate();
  const { isWatched } = useWatchlist('prs');
  const [filter, setFilter] = useSessionStoredState<PrStatusFilter>(
    'repository:prs:statusFilter',
    state,
    isPrStatusFilter,
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filtersConfig = useMemo(
    () => ({
      author: {
        paramKey: 'prAuthor',
        parse: (raw: string | null): string => raw ?? AUTHOR_FILTER_ALL,
        serialize: (value: string): string | null =>
          value === AUTHOR_FILTER_ALL ? null : value,
      },
    }),
    [],
  );

  const {
    sortField,
    sortOrder,
    setSort: handleSort,
    page,
    setPage,
    filters,
    setFilter: setUrlFilter,
  } = useDataTableParams<PrSortField, { author: string }>({
    sortKeys: PR_SORT_KEYS,
    defaultSortKey: 'score',
    // String columns feel natural ascending; numeric/score columns descending.
    defaultOrderOverrides: { pullRequestTitle: 'asc', author: 'asc' },
    paramKeys: { sort: 'prSort', order: 'prDir', page: 'prPage' },
    filters: filtersConfig,
  });

  const authorFilter = filters.author;
  const setAuthorFilter = useCallback(
    (nextAuthor: string) => setUrlFilter('author', nextAuthor),
    [setUrlFilter],
  );

  // Filter/search are local (session/state); the hook handles page reset
  // for URL-backed slots automatically. Reset page here when the local
  // status or search filter changes.
  const handleFilterChange = useCallback(
    (next: PrStatusFilter) => {
      if (next === filter) return;
      setFilter(next);
      setPage(0);
    },
    [filter, setFilter, setPage],
  );

  const handleSearchChange = useCallback(
    (next: string) => {
      if (next === searchQuery) return;
      setSearchQuery(next);
      setPage(0);
    },
    [searchQuery, setPage],
  );

  // Fetch ALL PRs at once for instant client-side filtering + accurate counts.
  const { data: allMinerPRs, isLoading } = useAllPrs();

  const allPRs = useMemo(() => {
    if (!allMinerPRs) return [];
    return allMinerPRs.filter(
      (pr) => pr.repository.toLowerCase() === repositoryFullName.toLowerCase(),
    );
  }, [allMinerPRs, repositoryFullName]);

  const tabCounts = useMemo(
    () =>
      getPrStatusCounts(
        filterPrs(allPRs, {
          author: authorFilter === AUTHOR_FILTER_ALL ? null : authorFilter,
        }),
      ),
    [allPRs, authorFilter],
  );

  const filteredPRs = useMemo(
    () =>
      filterPrs(allPRs, {
        statusFilter: filter,
        author: authorFilter === AUTHOR_FILTER_ALL ? null : authorFilter,
        searchQuery,
        includeNumber: true,
      }),
    [allPRs, filter, authorFilter, searchQuery],
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
        case 'watch':
          return comparePRsByWatchlist(a, b, isWatched) * dir;
        case 'score':
        default:
          return cmpNum(parseFloat(a.score || '0'), parseFloat(b.score || '0'));
      }
    });
  }, [filteredPRs, sortField, sortOrder, isWatched]);

  const totalPages = Math.ceil(sortedPRs.length / PR_PAGE_SIZE);
  const pagedPRs = useMemo(
    () =>
      sortedPRs.slice(page * PR_PAGE_SIZE, page * PR_PAGE_SIZE + PR_PAGE_SIZE),
    [sortedPRs, page],
  );

  const handleRowClick = useCallback(
    (pr: CommitLog) => {
      navigate(minerPrPath(pr.repository, pr.pullRequestNumber), {
        state: { backLabel: `Back to ${repositoryFullName}` },
      });
    },
    [navigate, repositoryFullName],
  );

  const filterButtons = (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
    >
      <FilterButton
        label="All"
        isActive={filter === 'all'}
        onClick={() => handleFilterChange('all')}
        count={tabCounts.all}
        color={theme.palette.status.neutral}
      />
      <FilterButton
        label="Open"
        isActive={filter === 'open'}
        onClick={() => handleFilterChange('open')}
        count={tabCounts.open}
        color={theme.palette.status.open}
      />
      <FilterButton
        label="Merged"
        isActive={filter === 'merged'}
        onClick={() => handleFilterChange('merged')}
        count={tabCounts.merged}
        color={theme.palette.status.merged}
      />
      <FilterButton
        label="Closed"
        isActive={filter === 'closed'}
        onClick={() => handleFilterChange('closed')}
        count={tabCounts.closed}
        color={theme.palette.status.closed}
      />
      <AuthorFilter
        items={allPRs}
        getAuthor={(pr) => pr.author}
        getGithubId={(pr) => pr.githubId}
        value={authorFilter}
        onChange={setAuthorFilter}
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
      width: 88,
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
      width: 320,
      sortKey: 'pullRequestTitle',
      renderCell: (pr) => (
        <ScrollAwareTooltip
          title={pr.pullRequestTitle}
          arrow
          placement="top-start"
          enterDelay={200}
        >
          <Box
            sx={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {pr.pullRequestTitle}
          </Box>
        </ScrollAwareTooltip>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      width: 180,
      sortKey: 'author',
      renderCell: (pr) => (
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
        >
          <Avatar
            src={getRepositoryOwnerAvatarSrc(pr.author)}
            alt={pr.author}
            sx={{ width: 20, height: 20, flexShrink: 0 }}
          />
          <Box
            component="span"
            sx={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              wordBreak: 'keep-all',
            }}
          >
            {pr.author}
          </Box>
        </Box>
      ),
    },
    {
      key: 'commitCount',
      header: 'Commits',
      width: 104,
      align: 'right',
      sortKey: 'commitCount',
      renderCell: (pr) => pr.commitCount,
    },
    {
      key: 'lines',
      header: '+/-',
      width: 120,
      align: 'right',
      sortKey: 'lines',
      renderCell: (pr) => (
        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
          <Box
            component="span"
            sx={{ color: theme.palette.diff.additions, mr: 1 }}
          >
            +{pr.additions}
          </Box>
          <Box component="span" sx={{ color: theme.palette.diff.deletions }}>
            -{pr.deletions}
          </Box>
        </Box>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      width: 112,
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
      width: 112,
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
      width: 120,
      align: 'right',
      sortKey: 'mergedAt',
      renderCell: (pr) => formatDate(pr.mergedAt),
    },
    {
      key: 'watch',
      header: '★',
      width: 64,
      align: 'center',
      sortKey: 'watch',
      renderCell: (pr) => (
        <WatchlistButton
          category="prs"
          itemKey={serializePRKey(pr.repository, pr.pullRequestNumber)}
          size="small"
        />
      ),
    },
  ];

  const headerToolbar = (
    <Box
      sx={{
        p: 3,
        borderBottom: `1px solid ${theme.palette.border.light}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box
        sx={{
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
      <TextField
        size="small"
        placeholder="Search title, PR #, merged date…"
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.tertiary', fontSize: '1rem' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <ClearSearchAdornment
              visible={Boolean(searchQuery)}
              onClear={() => handleSearchChange('')}
            />
          ),
        }}
        sx={{
          maxWidth: { xs: '100%', sm: 520 },
          '& .MuiOutlinedInput-root': {
            fontSize: '0.8rem',
            color: 'text.primary',
            backgroundColor: 'surface.subtle',
            borderRadius: 2,
            '& fieldset': { borderColor: 'border.light' },
            '&:hover fieldset': { borderColor: 'border.medium' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
          },
        }}
      />
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
      }}
      elevation={0}
    >
      <DataTable<CommitLog, PrSortField>
        columns={columns}
        rows={pagedPRs}
        getRowKey={(pr) => `${pr.repository}-${pr.pullRequestNumber}`}
        minWidth="1120px"
        stickyHeader
        tableContainerSx={{
          maxHeight: 500,
          overflow: 'auto',
          scrollbarGutter: 'stable',
          ...scrollbarSx,
        }}
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
        pagination={
          totalPages > 1 ? (
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          ) : undefined
        }
      />
    </Card>
  );
};

export default RepositoryPRsTable;

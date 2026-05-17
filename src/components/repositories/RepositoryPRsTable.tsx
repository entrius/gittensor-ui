import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import theme, { TEXT_OPACITY, scrollbarSx } from '../../theme';
import {
  filterPrs,
  filterPrsBySearchTerms,
  getPrStatusCounts,
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
type SortOrder = 'asc' | 'desc';

interface RepositoryPRsTableProps {
  repositoryFullName: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
}

const PR_STATUS_FILTERS: readonly PrStatusFilter[] = [
  'all',
  'open',
  'merged',
  'closed',
];

const isPrStatusFilter = (value: string | null): value is PrStatusFilter =>
  value !== null && (PR_STATUS_FILTERS as readonly string[]).includes(value);

const chipLabelSx = {
  maxWidth: 280,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

const PR_PAGE_SIZE = 20;

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
  state = 'all',
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isWatched } = useWatchlist('prs');
  const prStatusParam = searchParams.get('prStatus');
  /** Open / Merged / Closed / All — driven by `prStatus` in the URL so chips and counts stay aligned. */
  const filter: PrStatusFilter = isPrStatusFilter(prStatusParam)
    ? prStatusParam
    : state;
  const [sortField, setSortField] = useState<PrSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const authorFilter = searchParams.get('prAuthor') ?? AUTHOR_FILTER_ALL;
  /** Each Enter appends one `prQ` param (AND semantics). */
  const committedPrQRaw = useMemo(
    () => searchParams.getAll('prQ'),
    [searchParams],
  );
  /** Draft text: live AND-preview with committed terms; Enter appends a chip. */
  const [draftSearch, setDraftSearch] = useState('');

  const appendCommittedTerm = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.append('prQ', t);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const removeCommittedTermAt = useCallback(
    (index: number) => {
      setSearchParams(
        (prev) => {
          const list = prev.getAll('prQ');
          const next = new URLSearchParams(prev);
          next.delete('prQ');
          list.forEach((raw, i) => {
            if (i !== index) next.append('prQ', raw);
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setFilterParam = useCallback(
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

  const setAuthorFilter = useCallback(
    (nextAuthor: string) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (nextAuthor === AUTHOR_FILTER_ALL) nextParams.delete('prAuthor');
          else nextParams.set('prAuthor', nextAuthor);
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Fetch ALL PRs at once for instant client-side filtering + accurate counts.
  const { data: allMinerPRs, isLoading } = useAllPrs();

  const allPRs = useMemo(() => {
    if (!allMinerPRs) return [];
    return allMinerPRs.filter(
      (pr) => pr.repository.toLowerCase() === repositoryFullName.toLowerCase(),
    );
  }, [allMinerPRs, repositoryFullName]);

  /**
   * Tab badges show repo-wide status totals (or totals for the selected author only).
   * Search terms — draft or pinned (`prQ`) — never change these numbers.
   */
  const prsForStatusTabCounts = useMemo(
    () =>
      filterPrs(allPRs, {
        author: authorFilter === AUTHOR_FILTER_ALL ? null : authorFilter,
      }),
    [allPRs, authorFilter],
  );

  const tabCounts = useMemo(
    () => getPrStatusCounts(prsForStatusTabCounts),
    [prsForStatusTabCounts],
  );

  /** Single pipeline: baseline count (status + author) + search-narrowed rows. */
  const { filteredPRs, baselinePrCount } = useMemo(() => {
    const byAuthor = filterPrs(allPRs, {
      statusFilter: filter,
      author: authorFilter === AUTHOR_FILTER_ALL ? null : authorFilter,
    });
    const baselinePrCount = byAuthor.length;
    const pool = filterPrsBySearchTerms(
      byAuthor,
      [...committedPrQRaw, draftSearch],
      true,
    );
    return { filteredPRs: pool, baselinePrCount };
  }, [allPRs, filter, authorFilter, committedPrQRaw, draftSearch]);

  const hasCommittedSearchFilters = committedPrQRaw.some((t) => t.trim());

  /** Draft or pinned terms — status chips below only show alongside search context. */
  const hasSearchContext =
    draftSearch.trim() !== '' || hasCommittedSearchFilters;

  /** Don’t duplicate Open/Merged/Closed as chips unless search is also active. */
  const showActiveFiltersRow =
    authorFilter !== AUTHOR_FILTER_ALL ||
    hasCommittedSearchFilters ||
    (filter !== 'all' && hasSearchContext);

  /** “N of M” and Clear all — any narrowing from default + draft typing. */
  const isNarrowed =
    filter !== 'all' ||
    authorFilter !== AUTHOR_FILTER_ALL ||
    draftSearch.trim() !== '' ||
    hasCommittedSearchFilters;

  /** One atomic URL write — batched `setSearchParams` calls could reuse stale `prev` and leave `prQ` behind. */
  const clearAllFilters = useCallback(() => {
    setDraftSearch('');
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('prQ');
        next.delete('prStatus');
        next.delete('prAuthor');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

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

  // Reset to the first page whenever the result set changes underneath us.
  useEffect(() => {
    setPage(0);
  }, [filter, authorFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedPRs.length / PR_PAGE_SIZE);
  const pagedPRs = useMemo(
    () =>
      sortedPRs.slice(page * PR_PAGE_SIZE, page * PR_PAGE_SIZE + PR_PAGE_SIZE),
    [sortedPRs, page],
  );

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
        onClick={() => setFilterParam('all')}
        count={tabCounts.all}
        color={theme.palette.status.neutral}
      />
      <FilterButton
        label="Open"
        isActive={filter === 'open'}
        onClick={() => setFilterParam('open')}
        count={tabCounts.open}
        color={theme.palette.status.open}
      />
      <FilterButton
        label="Merged"
        isActive={filter === 'merged'}
        onClick={() => setFilterParam('merged')}
        count={tabCounts.merged}
        color={theme.palette.status.merged}
      />
      <FilterButton
        label="Closed"
        isActive={filter === 'closed'}
        onClick={() => setFilterParam('closed')}
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
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{ color: 'text.primary', fontSize: '1.1rem', fontWeight: 500 }}
          >
            Pull Requests
          </Typography>
          <Typography
            sx={{
              color: 'text.tertiary',
              fontSize: '0.85rem',
            }}
          >
            (
            {draftSearch.trim() !== '' || sortedPRs.length !== baselinePrCount
              ? `${sortedPRs.length} of ${baselinePrCount}`
              : sortedPRs.length}
            )
          </Typography>
        </Box>
        {filterButtons}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <TextField
          size="small"
          placeholder="Add a term, press Enter — each term narrows results (AND)"
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              appendCommittedTerm(draftSearch);
              setDraftSearch('');
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.tertiary', fontSize: '1rem' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <ClearSearchAdornment
                visible={Boolean(draftSearch)}
                onClear={() => setDraftSearch('')}
              />
            ),
          }}
          sx={{
            flex: 1,
            minWidth: 0,
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
        {isNarrowed && (
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={clearAllFilters}
            sx={{
              flexShrink: 0,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              color: 'primary.main',
            }}
          >
            Clear all
          </Link>
        )}
      </Box>

      {showActiveFiltersRow && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Typography
            component="span"
            sx={{
              color: 'text.secondary',
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            Active filters:
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {filter !== 'all' && hasSearchContext && (
              <Chip
                variant="filter"
                label={filter}
                onDelete={() => setFilterParam('all')}
                sx={{ '& .MuiChip-label': chipLabelSx }}
              />
            )}
            {authorFilter !== AUTHOR_FILTER_ALL && (
              <Chip
                variant="filter"
                label={`author: ${authorFilter}`}
                onDelete={() => setAuthorFilter(AUTHOR_FILTER_ALL)}
                sx={{ '& .MuiChip-label': chipLabelSx }}
              />
            )}
            {committedPrQRaw.map((raw, index) => {
              const label = raw.trim();
              if (!label) return null;
              return (
                <Chip
                  key={`prq-${index}-${label}`}
                  variant="filter"
                  label={label}
                  onDelete={() => removeCommittedTermAt(index)}
                  sx={{ '& .MuiChip-label': chipLabelSx }}
                />
              );
            })}
          </Stack>
        </Box>
      )}
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

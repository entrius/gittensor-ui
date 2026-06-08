import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Collapse,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useMinerPRs, type CommitLog } from '../../api';
import {
  filterPrs,
  getRepositoryOwnerAvatarSrc,
  getPrStatusCounts,
  isOutsideScoringWindow,
  type PrStatusFilter,
} from '../../utils';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import FilterButton from '../FilterButton';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import { DebouncedSearchInput } from '../common/DebouncedSearchInput';
import { LoadingCard, WatchlistButton } from '../../components/common';
import {
  comparePRsByWatchlist,
  serializePRKey,
  useWatchlist,
} from '../../hooks/useWatchlist';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import MinerTableRowsSelect from './MinerTableRowsSelect';
import TablePagination, {
  getMinerExplorerPaging,
  MINER_EXPLORER_PAGE_PARAM,
  useMinerExplorerPagination,
} from '../common/TablePagination';
import { formatDate } from '../../utils/format';
import { tooltipSlotProps } from '../../theme';
import MinerPrScoreDetail from './MinerPrScoreDetail';

type PrSortField =
  | 'number'
  | 'repository'
  | 'score'
  | 'lines'
  | 'date'
  | 'watch';
type SortDir = 'asc' | 'desc';

const PR_STATUS_FILTERS: readonly PrStatusFilter[] = [
  'all',
  'open',
  'merged',
  'closed',
];

// Direction applied when a user first clicks a column header — string
// columns feel natural ascending, numeric/date columns descending.
const DEFAULT_SORT_DIR: Record<PrSortField, SortDir> = {
  number: 'desc',
  repository: 'asc',
  score: 'desc',
  lines: 'desc',
  date: 'desc',
  watch: 'desc',
};

// Mirrors the Score cell's render logic so clicking the Score header
// sorts by what users actually see: merged → score, open → collateral,
// closed-unmerged → treated as zero.
const getEffectiveScore = (pr: CommitLog): number => {
  if (pr.prState === 'CLOSED' && !pr.mergedAt) return 0;
  if (!pr.mergedAt && pr.collateralScore) {
    return parseFloat(pr.collateralScore || '0');
  }
  return parseFloat(pr.score || '0');
};

const getScoreTooltip = (pr: CommitLog): string | null => {
  const base = parseFloat(pr.baseScore || '0');
  if (!pr.mergedAt || base <= 0) return null;
  const parts: string[] = [`Base: ${base.toFixed(2)}`];
  if (pr.tokenScore != null)
    parts.push(`Tokens: ${Number(pr.tokenScore).toFixed(2)}`);
  if (pr.credibilityMultiplier != null)
    parts.push(`Cred: ${Number(pr.credibilityMultiplier).toFixed(2)}×`);
  return parts.join(' · ');
};

const isPrStatusFilter = (value: string | null): value is PrStatusFilter =>
  value !== null && (PR_STATUS_FILTERS as readonly string[]).includes(value);

// Stable per-PR key — shared by the DataTable row key and the expanded-row
// tracking set so the two never drift.
const prRowKey = (pr: CommitLog): string =>
  `${pr.repository}-${pr.pullRequestNumber}-${pr.prCreatedAt ?? ''}`;

interface MinerPRsTableProps {
  githubId: string;
}

const MinerPRsTable: React.FC<MinerPRsTableProps> = ({ githubId }) => {
  const theme = useTheme();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const { isWatched } = useWatchlist('prs');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<PrSortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const filtersConfig = useMemo(
    () => ({
      status: {
        paramKey: 'prStatus',
        parse: (raw: string | null): PrStatusFilter =>
          isPrStatusFilter(raw) ? raw : 'all',
        serialize: (value: PrStatusFilter): string | null =>
          value === 'all' ? null : value,
      },
    }),
    [],
  );

  // Status filter is URL-backed (`prStatus`); pagination is owned by
  // `useMinerExplorerPagination` below. Wiring `paramKeys.page` to
  // `MINER_EXPLORER_PAGE_PARAM` lets the hook clear the same page slot
  // when the filter changes.
  const { filters, setFilter } = useDataTableParams<
    PrSortField,
    { status: PrStatusFilter }
  >({
    sortKeys: [],
    defaultSortKey: 'date',
    paramKeys: { page: MINER_EXPLORER_PAGE_PARAM },
    filters: filtersConfig,
  });

  const statusFilter = filters.status;
  const setStatusFilter = useCallback(
    (next: PrStatusFilter) => setFilter('status', next),
    [setFilter],
  );

  useEffect(() => {
    setSelectedAuthor(null);
    setSearchQuery('');
    setSortField('date');
    setSortDir('desc');
    setExpandedKeys(new Set());
  }, [githubId]);

  const filteredPRs = useMemo(
    () =>
      filterPrs(prs ?? [], {
        author: selectedAuthor,
        includeNumber: true,
        searchQuery,
        statusFilter,
      }),
    [prs, selectedAuthor, statusFilter, searchQuery],
  );

  const sortedPRs = useMemo(() => {
    const sorted = [...filteredPRs];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'number':
          cmp = a.pullRequestNumber - b.pullRequestNumber;
          break;
        case 'repository':
          cmp = a.repository.localeCompare(b.repository);
          if (cmp === 0) cmp = a.pullRequestNumber - b.pullRequestNumber;
          break;
        case 'score':
          cmp = getEffectiveScore(a) - getEffectiveScore(b);
          break;
        case 'lines':
          cmp = a.additions + a.deletions - (b.additions + b.deletions);
          break;
        case 'date': {
          const da = a.mergedAt || a.prCreatedAt || '';
          const db = b.mergedAt || b.prCreatedAt || '';
          cmp = da.localeCompare(db);
          break;
        }
        case 'watch':
          cmp = comparePRsByWatchlist(a, b, isWatched);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredPRs, sortField, sortDir, isWatched]);

  const { page, setPage, rowsPerPage, setRowsPerPage } =
    useMinerExplorerPagination({
      resetKey: githubId,
      totalItemCount: sortedPRs.length,
    });

  const paging = useMemo(
    () => getMinerExplorerPaging(sortedPRs, page, rowsPerPage),
    [sortedPRs, page, rowsPerPage],
  );

  const { slice: pagedPRs, totalPages, safePage, showPageNav } = paging;

  const searchQueryRef = useRef(searchQuery);
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  });

  const handleDebouncedSearch = useCallback(
    (next: string) => {
      if (next === searchQueryRef.current) return;
      setSearchQuery(next);
      setPage(0);
    },
    [setPage],
  );

  const handleSort = useCallback(
    (field: PrSortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir(DEFAULT_SORT_DIR[field]);
      }
      setPage(0);
    },
    [sortField, setPage],
  );

  // Count over the search + author scope (excluding the active status filter)
  // so each button reflects what the user would see if they clicked it.
  const statusCounts = useMemo(() => {
    if (!prs) return { all: 0, open: 0, merged: 0, closed: 0 };
    const scope = filterPrs(prs, {
      author: selectedAuthor,
      includeNumber: true,
      searchQuery,
      statusFilter: 'all',
    });
    return getPrStatusCounts(scope);
  }, [prs, selectedAuthor, searchQuery]);

  const hasFilters =
    Boolean(selectedAuthor) ||
    statusFilter !== 'all' ||
    searchQuery.trim() !== '';

  // Row click toggles the in-place score breakdown — the navigate-to-PR
  // affordance moved into the expanded panel ("PR Details" button).
  const toggleExpanded = useCallback((pr: CommitLog) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      const key = prRowKey(pr);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const columns: DataTableColumn<CommitLog, PrSortField>[] = [
    {
      key: 'expand',
      header: '',
      width: 44,
      align: 'center',
      renderCell: (pr) =>
        expandedKeys.has(prRowKey(pr)) ? (
          <ExpandLessIcon
            sx={{ fontSize: '1.15rem', color: 'text.tertiary' }}
          />
        ) : (
          <ExpandMoreIcon
            sx={{ fontSize: '1.15rem', color: 'text.tertiary' }}
          />
        ),
    },
    {
      key: 'number',
      header: 'PR #',
      width: '10%',
      sortKey: 'number',
      headerSx: { whiteSpace: 'nowrap' },
      // Plain label — the row click owns the interaction (toggles the
      // breakdown accordion); GitHub / PR-detail links live inside it.
      cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' }, fontWeight: 500 },
      renderCell: (pr) => `#${pr.pullRequestNumber}`,
    },
    {
      key: 'title',
      header: 'Title',
      width: '25%',
      cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' } },
      renderCell: (pr) => (
        <Tooltip
          title={pr.pullRequestTitle}
          arrow
          placement="top"
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
      key: 'repository',
      header: 'Repository',
      width: '25%',
      sortKey: 'repository',
      renderCell: (pr) => {
        const owner = pr.repository.split('/')[0];
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              overflow: 'hidden',
            }}
          >
            <Avatar
              src={getRepositoryOwnerAvatarSrc(owner)}
              alt={owner}
              sx={{
                width: 20,
                height: 20,
                flexShrink: 0,
                border: '1px solid',
                borderColor: 'border.medium',
                backgroundColor:
                  owner === 'opentensor'
                    ? 'text.primary'
                    : owner === 'bitcoin'
                      ? 'status.warning'
                      : 'transparent',
              }}
            />
            <Box
              component="span"
              sx={{ wordBreak: 'break-word', lineHeight: 1.3 }}
            >
              {pr.repository}
            </Box>
          </Box>
        );
      },
    },
    {
      key: 'lines',
      header: '+/-',
      width: '12%',
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
      width: '13%',
      align: 'right',
      sortKey: 'score',
      renderCell: (pr) => {
        const scoreTooltip = getScoreTooltip(pr);
        return (
          <Box>
            {pr.prState === 'CLOSED' && !pr.mergedAt ? (
              <Typography
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  fontWeight: 600,
                  color: (t) => alpha(t.palette.text.primary, 0.3),
                }}
              >
                -
              </Typography>
            ) : !pr.mergedAt && pr.collateralScore ? (
              <Typography
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  fontWeight: 600,
                  color: theme.palette.status.warningOrange,
                }}
              >
                {parseFloat(pr.collateralScore || '0').toFixed(4)}
              </Typography>
            ) : scoreTooltip ? (
              <Tooltip
                title={scoreTooltip}
                arrow
                placement="top"
                followCursor
                slotProps={tooltipSlotProps}
              >
                <Typography
                  sx={{
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {parseFloat(pr.score || '0').toFixed(4)}
                </Typography>
              </Tooltip>
            ) : (
              <Typography
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  fontWeight: 600,
                }}
              >
                {parseFloat(pr.score || '0').toFixed(4)}
              </Typography>
            )}
            {!pr.mergedAt && pr.collateralScore && pr.prState !== 'CLOSED' && (
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  color: (t) => alpha(t.palette.text.primary, 0.5),
                }}
              >
                Collateral
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      width: '15%',
      align: 'right',
      sortKey: 'date',
      cellSx: {
        fontSize: { xs: '0.75rem', sm: '0.85rem' },
        color: (theme) => alpha(theme.palette.text.primary, 0.7),
      },
      renderCell: (pr) =>
        pr.mergedAt
          ? formatDate(pr.mergedAt)
          : pr.prState === 'CLOSED'
            ? 'Closed'
            : 'Open',
    },
    {
      key: 'watch',
      header: '★',
      width: '8%',
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
    return <LoadingCard />;
  }

  const headerToolbar = (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        borderBottom: '1px solid',
        borderColor: 'border.light',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
              fontWeight: 500,
            }}
          >
            Pull Requests
          </Typography>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontSize: '0.75rem',
            }}
          >
            ({filteredPRs.length}
            {hasFilters ? ` of ${prs?.length || 0}` : ''})
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1.5, sm: 1 },
            flexWrap: 'wrap',
            alignItems: { xs: 'flex-start', sm: 'center' },
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {selectedAuthor && (
            <Chip
              variant="filter"
              label={`Author: ${selectedAuthor}`}
              onDelete={() => {
                setSelectedAuthor(null);
                setPage(0);
              }}
            />
          )}

          <Box
            sx={{
              display: 'flex',
              gap: { xs: 0.75, sm: 0.5 },
              flexWrap: 'wrap',
              width: { xs: '100%', sm: 'auto' },
              '& > .MuiButton-root': {
                flex: { xs: 1, sm: 'none' },
                minWidth: 0,
              },
            }}
          >
            <FilterButton
              label="All"
              count={statusCounts.all}
              color={theme.palette.status.neutral}
              isActive={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <FilterButton
              label="Open"
              count={statusCounts.open}
              color={theme.palette.status.open}
              isActive={statusFilter === 'open'}
              onClick={() => setStatusFilter('open')}
            />
            <FilterButton
              label="Merged"
              count={statusCounts.merged}
              color={theme.palette.status.merged}
              isActive={statusFilter === 'merged'}
              onClick={() => setStatusFilter('merged')}
            />
            <FilterButton
              label="Closed"
              count={statusCounts.closed}
              color={theme.palette.status.closed}
              isActive={statusFilter === 'closed'}
              onClick={() => setStatusFilter('closed')}
            />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mt: 2,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: 2,
          width: '100%',
          minWidth: 0,
        }}
      >
        <MinerTableRowsSelect
          value={rowsPerPage}
          onChange={setRowsPerPage}
          id="miner-prs-rows"
        />
        <DebouncedSearchInput
          initialDraft={searchQuery}
          onDebouncedChange={handleDebouncedSearch}
        >
          {({ draftValue, setDraftValue }) => (
            <TextField
              size="small"
              placeholder="Search by title, repo, or PR number..."
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{
                        color: (t) => alpha(t.palette.text.primary, 0.3),
                        fontSize: '1rem',
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <ClearSearchAdornment
                    visible={Boolean(draftValue)}
                    onClear={() => setDraftValue('')}
                  />
                ),
              }}
              sx={{
                flex: 1,
                minWidth: 0,
                width: 'auto',
                maxWidth: { xs: '100%', sm: 480 },
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
          )}
        </DebouncedSearchInput>
      </Box>
    </Box>
  );

  const noDataAtAll = !prs || prs.length === 0;
  const emptyMessage = noDataAtAll
    ? 'No PRs found'
    : 'No PRs found for the selected filters';

  return (
    <Card
      sx={{
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
        getRowKey={prRowKey}
        minWidth="760px"
        stickyHeader
        size="medium"
        header={headerToolbar}
        emptyState={
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontSize: '0.9rem',
              }}
            >
              {emptyMessage}
            </Typography>
          </Box>
        }
        onRowClick={toggleExpanded}
        renderExpandedRow={(pr) => {
          const open = expandedKeys.has(prRowKey(pr));
          return (
            <Collapse in={open} timeout="auto" unmountOnExit>
              <MinerPrScoreDetail pr={pr} expanded={open} />
            </Collapse>
          );
        }}
        getRowSx={(pr) => {
          if (pr.mergedAt && isOutsideScoringWindow(pr.mergedAt)) {
            return { opacity: 0.4, filter: 'grayscale(0.5)' };
          }
          if (expandedKeys.has(prRowKey(pr))) {
            return { backgroundColor: 'surface.subtle' };
          }
          return {};
        }}
        sort={{
          field: sortField,
          order: sortDir,
          onChange: handleSort,
        }}
        pagination={
          showPageNav ? (
            <TablePagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          ) : null
        }
      />
    </Card>
  );
};

export default MinerPRsTable;

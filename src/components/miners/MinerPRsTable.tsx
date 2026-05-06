import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMinerPRs, type CommitLog } from '../../api';
import {
  filterPrs,
  getRepositoryOwnerAvatarSrc,
  getPrStatusCounts,
  paginateItems,
  type PrStatusFilter,
} from '../../utils';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import ExplorerFilterButton from './ExplorerFilterButton';
import TablePagination from './TablePagination';
import { tooltipSlotProps } from '../../theme';

type PrSortField = 'number' | 'repository' | 'score' | 'lines' | 'date';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

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

interface MinerPRsTableProps {
  githubId: string;
}

const MinerPRsTable: React.FC<MinerPRsTableProps> = ({ githubId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<PrSortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const prStatusParam = searchParams.get('prStatus');
  const statusFilter: PrStatusFilter = isPrStatusFilter(prStatusParam)
    ? prStatusParam
    : 'all';

  useEffect(() => {
    setSelectedAuthor(null);
    setSearchQuery('');
    setSortField('date');
    setSortDir('desc');
  }, [githubId]);

  const page = parseInt(searchParams.get('prPage') || '0', 10);
  const setPage = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const next = typeof updater === 'function' ? updater(page) : updater;
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 0) p.delete('prPage');
          else p.set('prPage', String(next));
          return p;
        },
        { replace: true },
      );
    },
    [page, setSearchParams],
  );

  const setStatusFilter = useCallback(
    (next: PrStatusFilter) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'all') p.delete('prStatus');
          else p.set('prStatus', next);
          p.delete('prPage');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
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
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredPRs, sortField, sortDir]);

  const pagedPRs = useMemo(
    () => paginateItems(sortedPRs, page, PAGE_SIZE),
    [sortedPRs, page],
  );

  const totalPages = Math.ceil(sortedPRs.length / PAGE_SIZE);

  const statusCounts = useMemo(() => {
    if (!prs) return { all: 0, open: 0, merged: 0, closed: 0 };
    return getPrStatusCounts(prs);
  }, [prs]);

  const hasFilters =
    Boolean(selectedAuthor) ||
    statusFilter !== 'all' ||
    searchQuery.trim() !== '';

  const handleRowClick = useCallback(
    (pr: CommitLog) => {
      navigate(
        `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
        { state: { backLabel: `Back to ${prs?.[0]?.author || githubId}` } },
      );
    },
    [navigate, prs, githubId],
  );

  const columns: DataTableColumn<CommitLog, PrSortField>[] = [
    {
      key: 'number',
      header: 'PR #',
      width: '10%',
      sortKey: 'number',
      headerSx: { whiteSpace: 'nowrap' },
      cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' } },
      renderCell: (pr) => (
        // Native <a> to GitHub — `onRowClick` (no row-as-anchor) keeps this valid HTML.
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
      ),
    },
    {
      key: 'title',
      header: 'Title',
      width: '25%',
      cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' } },
      renderCell: (pr) => (
        <Box
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {pr.pullRequestTitle}
        </Box>
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
                placement="left"
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
          ? new Date(pr.mergedAt).toLocaleDateString()
          : pr.prState === 'CLOSED'
            ? 'Closed'
            : 'Open',
    },
  ];

  if (isLoading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }} elevation={0}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
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
            <ExplorerFilterButton
              label="All"
              count={statusCounts.all}
              color={theme.palette.status.neutral}
              selected={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <ExplorerFilterButton
              label="Open"
              count={statusCounts.open}
              color={theme.palette.status.open}
              selected={statusFilter === 'open'}
              onClick={() => setStatusFilter('open')}
            />
            <ExplorerFilterButton
              label="Merged"
              count={statusCounts.merged}
              color={theme.palette.status.merged}
              selected={statusFilter === 'merged'}
              onClick={() => setStatusFilter('merged')}
            />
            <ExplorerFilterButton
              label="Closed"
              count={statusCounts.closed}
              color={theme.palette.status.closed}
              selected={statusFilter === 'closed'}
              onClick={() => setStatusFilter('closed')}
            />
          </Box>
        </Box>
      </Box>

      <TextField
        size="small"
        placeholder="Search by title, repo, or PR number..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setPage(0);
        }}
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
        }}
        sx={{
          mt: 2,
          width: { xs: '100%', sm: 'auto' },
          maxWidth: { xs: '100%', sm: 400 },
          minWidth: { xs: 0, sm: 350 },
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
        getRowKey={(pr) =>
          `${pr.repository}-${pr.pullRequestNumber}-${pr.prCreatedAt ?? ''}`
        }
        minWidth="700px"
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
        onRowClick={handleRowClick}
        sort={{
          field: sortField,
          order: sortDir,
          onChange: handleSort,
        }}
        pagination={
          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        }
      />
    </Card>
  );
};

export default MinerPRsTable;

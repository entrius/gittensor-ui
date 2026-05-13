import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Avatar,
  Box,
  Card,
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
import { useMinerIssues } from '../../api';
import type { MinerIssue } from '../../api/models/Dashboard';
import {
  getRepositoryOwnerAvatarSrc,
  getScoringWindowStartIso,
  isOutsideScoringWindow,
  paginateItems,
} from '../../utils';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import FilterButton from '../FilterButton';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import TablePagination from '../common/TablePagination';

type IssueStatusFilter = 'all' | 'open' | 'solved' | 'closed';
type IssueSortField = 'number' | 'repository' | 'date';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

const ISSUE_STATUS_FILTERS: readonly IssueStatusFilter[] = [
  'all',
  'open',
  'solved',
  'closed',
];

const DEFAULT_SORT_DIR: Record<IssueSortField, SortDir> = {
  number: 'desc',
  repository: 'asc',
  date: 'desc',
};

const isOpenIssue = (i: MinerIssue) => i.state === 'OPEN';
const isSolvedIssue = (i: MinerIssue) =>
  i.state === 'CLOSED' && !!i.solving_pr?.merged_at;
const isClosedIssue = (i: MinerIssue) =>
  i.state === 'CLOSED' && !i.solving_pr?.merged_at;

const isIssueStatusFilter = (
  value: string | null,
): value is IssueStatusFilter =>
  value !== null && (ISSUE_STATUS_FILTERS as readonly string[]).includes(value);

const filterIssues = (
  issues: MinerIssue[],
  {
    statusFilter,
    searchQuery,
  }: { statusFilter: IssueStatusFilter; searchQuery: string },
): MinerIssue[] => {
  let result = issues;
  if (statusFilter === 'open') result = result.filter(isOpenIssue);
  else if (statusFilter === 'solved') result = result.filter(isSolvedIssue);
  else if (statusFilter === 'closed') result = result.filter(isClosedIssue);

  const q = searchQuery.trim().toLowerCase();
  if (!q) return result;
  return result.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.repo_full_name.toLowerCase().includes(q) ||
      String(i.issue_number).includes(q),
  );
};

const getIssueStatusCounts = (issues: MinerIssue[]) => ({
  all: issues.length,
  open: issues.filter(isOpenIssue).length,
  solved: issues.filter(isSolvedIssue).length,
  closed: issues.filter(isClosedIssue).length,
});

const getIssueDate = (issue: MinerIssue): string =>
  issue.solving_pr?.merged_at ?? issue.closed_at ?? issue.created_at ?? '';

interface MinerOpenDiscoveryIssuesByRepoProps {
  githubId: string;
}

const MinerOpenDiscoveryIssuesByRepo: React.FC<
  MinerOpenDiscoveryIssuesByRepoProps
> = ({ githubId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Pin the `since` cutoff per mount so React Query's cache key stays stable
  // while the component is open. The 35-day scoring window slides on remount.
  const since = useMemo(() => getScoringWindowStartIso(), []);
  const { data: issues, isLoading } = useMinerIssues(githubId, true, since);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<IssueSortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const issueStatusParam = searchParams.get('issueStatus');
  const statusFilter: IssueStatusFilter = isIssueStatusFilter(issueStatusParam)
    ? issueStatusParam
    : 'all';

  useEffect(() => {
    setSearchQuery('');
    setSortField('date');
    setSortDir('desc');
  }, [githubId]);

  const page = parseInt(searchParams.get('issuePage') || '0', 10);
  const setPage = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const next = typeof updater === 'function' ? updater(page) : updater;
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 0) p.delete('issuePage');
          else p.set('issuePage', String(next));
          return p;
        },
        { replace: true },
      );
    },
    [page, setSearchParams],
  );

  const setStatusFilter = useCallback(
    (next: IssueStatusFilter) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'all') p.delete('issueStatus');
          else p.set('issueStatus', next);
          p.delete('issuePage');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleSort = useCallback(
    (field: IssueSortField) => {
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

  const filteredIssues = useMemo(
    () => filterIssues(issues ?? [], { statusFilter, searchQuery }),
    [issues, statusFilter, searchQuery],
  );

  const sortedIssues = useMemo(() => {
    const sorted = [...filteredIssues];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'number':
          cmp = a.issue_number - b.issue_number;
          break;
        case 'repository':
          cmp = a.repo_full_name.localeCompare(b.repo_full_name);
          if (cmp === 0) cmp = a.issue_number - b.issue_number;
          break;
        case 'date':
          cmp = getIssueDate(a).localeCompare(getIssueDate(b));
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredIssues, sortField, sortDir]);

  const pagedIssues = useMemo(
    () => paginateItems(sortedIssues, page, PAGE_SIZE),
    [sortedIssues, page],
  );

  const totalPages = Math.ceil(sortedIssues.length / PAGE_SIZE);

  // Count over the search scope (excluding the active status filter) so each
  // button reflects what the user would see if they clicked it.
  const statusCounts = useMemo(() => {
    if (!issues) return { all: 0, open: 0, solved: 0, closed: 0 };
    const scope = filterIssues(issues, {
      statusFilter: 'all',
      searchQuery,
    });
    return getIssueStatusCounts(scope);
  }, [issues, searchQuery]);

  const hasFilters = statusFilter !== 'all' || searchQuery.trim() !== '';

  const columns: DataTableColumn<MinerIssue, IssueSortField>[] = [
    {
      key: 'number',
      header: 'Issue',
      width: '10%',
      sortKey: 'number',
      headerSx: { whiteSpace: 'nowrap' },
      cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' } },
      renderCell: (issue) => (
        <a
          href={`https://github.com/${issue.repo_full_name}/issues/${issue.issue_number}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'inherit',
            textDecoration: 'none',
            fontWeight: 500,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          #{issue.issue_number}
        </a>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      width: '32%',
      cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' } },
      renderCell: (issue) => (
        <Tooltip
          title={issue.title}
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
            {issue.title}
          </Box>
        </Tooltip>
      ),
    },
    {
      key: 'repository',
      header: 'Repository',
      width: '25%',
      sortKey: 'repository',
      renderCell: (issue) => {
        const owner = issue.repo_full_name.split('/')[0];
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
              {issue.repo_full_name}
            </Box>
          </Box>
        );
      },
    },
    {
      key: 'linkedPr',
      header: 'Linked PR',
      width: '13%',
      align: 'right',
      renderCell: (issue) => {
        const prNumber = issue.solving_pr?.pr_number ?? null;
        if (prNumber == null) {
          return (
            <Typography
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                color: (t) => alpha(t.palette.text.primary, 0.3),
              }}
            >
              —
            </Typography>
          );
        }
        const repoForPr =
          issue.solving_pr?.repo_full_name ?? issue.repo_full_name;
        const prHref = `/miners/pr?repo=${encodeURIComponent(repoForPr)}&number=${prNumber}`;
        return (
          <a
            href={prHref}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(prHref);
            }}
            style={{
              color: theme.palette.status.info,
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.8rem',
            }}
          >
            #{prNumber}
          </a>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      width: '12%',
      align: 'right',
      sortKey: 'date',
      cellSx: {
        fontSize: { xs: '0.75rem', sm: '0.85rem' },
        color: (theme) => alpha(theme.palette.text.primary, 0.7),
      },
      renderCell: (issue) => {
        const date = getIssueDate(issue);
        if (!date) return '—';
        return new Date(date).toLocaleDateString();
      },
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
            Open Issues
          </Typography>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontSize: '0.75rem',
            }}
          >
            ({filteredIssues.length}
            {hasFilters ? ` of ${issues?.length || 0}` : ''})
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
              label="Solved"
              count={statusCounts.solved}
              color={theme.palette.status.merged}
              isActive={statusFilter === 'solved'}
              onClick={() => setStatusFilter('solved')}
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

      <TextField
        size="small"
        placeholder="Search by title, repo, or issue number..."
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
          endAdornment: (
            <ClearSearchAdornment
              visible={Boolean(searchQuery)}
              onClear={() => {
                setSearchQuery('');
                setPage(0);
              }}
            />
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

  const noDataAtAll = !issues || issues.length === 0;
  const emptyMessage = noDataAtAll
    ? 'No issues found'
    : 'No issues found for the selected filters';

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
      <DataTable<MinerIssue, IssueSortField>
        columns={columns}
        rows={pagedIssues}
        getRowKey={(issue) =>
          `${issue.repo_full_name}-${issue.issue_number}-${issue.created_at ?? ''}`
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
        getRowSx={(issue) => {
          const date = getIssueDate(issue);
          return date && isOutsideScoringWindow(date)
            ? { opacity: 0.4, filter: 'grayscale(0.5)' }
            : {};
        }}
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

export default MinerOpenDiscoveryIssuesByRepo;

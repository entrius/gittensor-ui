import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
  alpha,
  useTheme,
  type Theme,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useMinerIssues } from '../../api';
import { type MinerIssue } from '../../api/models/Dashboard';
import { getRepositoryOwnerAvatarSrc, paginateItems } from '../../utils';
import { LABEL_COLORS } from '../../theme';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import ExplorerFilterButton from './ExplorerFilterButton';
import TablePagination from './TablePagination';

type IssueSortField = 'number' | 'repository' | 'date';
type SortDir = 'asc' | 'desc';

type IssueStatusFilter = 'all' | 'open' | 'resolved' | 'closed';

const STATUS_FILTERS: readonly IssueStatusFilter[] = [
  'all',
  'open',
  'resolved',
  'closed',
];

const PAGE_SIZE = 20;

const DEFAULT_SORT_DIR: Record<IssueSortField, SortDir> = {
  number: 'desc',
  repository: 'asc',
  date: 'desc',
};

const isStatusFilter = (value: string | null): value is IssueStatusFilter =>
  value !== null && (STATUS_FILTERS as readonly string[]).includes(value);

type IssueRow = MinerIssue;

const getDate = (issue: IssueRow): string =>
  issue.closed_at || issue.updated_at || issue.created_at || '';

const statusColor = (theme: Theme, status: IssueStatusFilter) => {
  switch (status) {
    case 'all':
      return theme.palette.status.neutral;
    case 'open':
      return theme.palette.status.open;
    case 'resolved':
      return theme.palette.status.merged;
    case 'closed':
      return theme.palette.status.closed;
  }
};

const statusLabel = (status: IssueStatusFilter): string =>
  status[0].toUpperCase() + status.slice(1);

const issueState = (issue: IssueRow): Exclude<IssueStatusFilter, 'all'> => {
  if ((issue.state_reason ?? '').toLowerCase() === 'completed')
    return 'resolved';
  return issue.state === 'CLOSED' ? 'closed' : 'open';
};

interface MinerIssuesTableProps {
  githubId: string;
}

const MinerIssuesTable: React.FC<MinerIssuesTableProps> = ({ githubId }) => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: issuesData, isLoading } = useMinerIssues(githubId, !!githubId);
  const issues = useMemo<IssueRow[]>(() => issuesData ?? [], [issuesData]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<IssueSortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const issueStatusParam = searchParams.get('issueStatus');
  const statusFilter: IssueStatusFilter = isStatusFilter(issueStatusParam)
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

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return issues.filter((issue) => {
      if (statusFilter !== 'all' && issueState(issue) !== statusFilter)
        return false;
      if (!q) return true;
      const num = String(issue.issue_number);
      return (
        (issue.title || '').toLowerCase().includes(q) ||
        issue.repo_full_name.toLowerCase().includes(q) ||
        num.includes(q)
      );
    });
  }, [issues, statusFilter, searchQuery]);

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
          cmp = getDate(a).localeCompare(getDate(b));
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

  const statusCounts = useMemo(() => {
    const counts: Record<IssueStatusFilter, number> = {
      all: issues.length,
      open: 0,
      resolved: 0,
      closed: 0,
    };
    issues.forEach((issue) => {
      counts[issueState(issue)] += 1;
    });
    return counts;
  }, [issues]);

  const hasFilters = statusFilter !== 'all' || searchQuery.trim() !== '';

  const columns: DataTableColumn<IssueRow, IssueSortField>[] = [
    {
      key: 'number',
      header: 'Issue #',
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
      width: '37%',
      cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' } },
      renderCell: (issue) => (
        <Box
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {issue.title || '—'}
        </Box>
      ),
    },
    {
      key: 'repository',
      header: 'Repository',
      width: '28%',
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
      key: 'pr',
      header: 'PR',
      width: '10%',
      align: 'center',
      renderCell: (issue) => {
        const prNumber = issue.solving_pr?.pr_number ?? issue.solved_by_pr;
        if (!prNumber) {
          return (
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: (t) => alpha(t.palette.text.primary, 0.4),
              }}
            >
              —
            </Typography>
          );
        }
        const repo = issue.solving_pr?.repo_full_name ?? issue.repo_full_name;
        return (
          <RouterLink
            to={`/miners/pr?repo=${encodeURIComponent(repo)}&number=${prNumber}`}
            style={{
              color: 'inherit',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.85rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            #{prNumber}
          </RouterLink>
        );
      },
    },
    {
      key: 'labels',
      header: 'Labels',
      width: '15%',
      renderCell: (issue) => {
        const labels = issue.labels ?? [];
        if (labels.length === 0) {
          return (
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: (t) => alpha(t.palette.text.primary, 0.4),
              }}
            >
              —
            </Typography>
          );
        }
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {labels.map((l) => {
              // Map known label names to project theme colors. Unknown labels
              // fall back to the neutral text-primary tint.
              const name = l.name.toLowerCase();
              let color: string | null = null;
              if (name in LABEL_COLORS) {
                color = LABEL_COLORS[name as keyof typeof LABEL_COLORS];
              }
              const bg = color ?? theme.palette.text.primary;
              return (
                <Chip
                  key={l.name}
                  label={l.name}
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    height: 18,
                    textTransform: 'lowercase',
                    color,
                    backgroundColor: alpha(bg, 0.12),
                    border: '1px solid',
                    borderColor: alpha(bg, 0.3),
                  }}
                />
              );
            })}
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
        color: (t) => alpha(t.palette.text.primary, 0.7),
      },
      renderCell: (issue) => {
        const d = getDate(issue);
        return d ? new Date(d).toLocaleDateString() : '-';
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
            Issues
          </Typography>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontSize: '0.75rem',
            }}
          >
            ({filteredIssues.length}
            {hasFilters ? ` of ${issues.length}` : ''})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => (
            <ExplorerFilterButton
              key={s}
              label={statusLabel(s)}
              count={statusCounts[s]}
              color={statusColor(theme, s)}
              selected={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
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
          maxWidth: 400,
          minWidth: 350,
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

  const noDataAtAll = issues.length === 0;
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
      <DataTable<IssueRow, IssueSortField>
        columns={columns}
        rows={pagedIssues}
        getRowKey={(issue) => `${issue.repo_full_name}#${issue.issue_number}`}
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

export default MinerIssuesTable;

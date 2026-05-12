import React, { useCallback, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
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
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { getRepositoryOwnerAvatarSrc, paginateItems } from '../../utils';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import ExplorerFilterButton from './ExplorerFilterButton';
import TablePagination from './TablePagination';
import { type RepositoryIssue } from '../../api/models/Miner';

export type IssueFilter = 'all' | 'open' | 'solved' | 'closed';
export type IssueSortField = 'number' | 'repository' | 'opened';
export type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

const DEFAULT_SORT_DIR: Record<IssueSortField, SortDir> = {
  number: 'desc',
  repository: 'asc',
  opened: 'desc',
};

const isOpenIssue = (i: RepositoryIssue) => !i.closedAt;
const isSolvedIssue = (i: RepositoryIssue) =>
  !!i.closedAt && i.prNumber != null;
const isClosedIssue = (i: RepositoryIssue) =>
  !!i.closedAt && i.prNumber == null;

export const githubIssueUrl = (issue: RepositoryIssue) =>
  issue.url ??
  `https://github.com/${issue.repositoryFullName}/issues/${issue.number}`;

const getIssueCounts = (issues: RepositoryIssue[]) => ({
  all: issues.length,
  open: issues.filter(isOpenIssue).length,
  solved: issues.filter(isSolvedIssue).length,
  closed: issues.filter(isClosedIssue).length,
});

const applyIssueFilter = (
  issues: RepositoryIssue[],
  filter: IssueFilter,
  search: string,
  sortField: IssueSortField,
  sortDir: SortDir,
): RepositoryIssue[] => {
  let result = issues;
  if (filter === 'open') result = result.filter(isOpenIssue);
  else if (filter === 'solved') result = result.filter(isSolvedIssue);
  else if (filter === 'closed') result = result.filter(isClosedIssue);
  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.repositoryFullName.toLowerCase().includes(q) ||
        String(i.number).includes(q),
    );
  }
  return [...result].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'number') cmp = a.number - b.number;
    else if (sortField === 'repository')
      cmp = a.repositoryFullName.localeCompare(b.repositoryFullName);
    else cmp = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    return sortDir === 'asc' ? cmp : -cmp;
  });
};

type LayoutInline = {
  layout: 'inline';
  toolbarTitle: string;
  stickyHeader?: boolean;
};

type LayoutCollapsible = {
  layout: 'collapsible';
  summaryTitle: string;
  initialExpanded?: boolean;
};

export type MinerIssueRepoSectionProps = {
  issues: RepositoryIssue[];
  isLoading: boolean;
  getRowKey: (issue: RepositoryIssue) => string;
  toolbarSubtitle?: string;
  emptyWhenNoIssues: React.ReactNode;
  emptyWhenFiltered: React.ReactNode;
} & (LayoutInline | LayoutCollapsible);

const useIssueRepoColumns = (): DataTableColumn<
  RepositoryIssue,
  IssueSortField
>[] =>
  useMemo(
    () => [
      {
        key: 'number',
        header: (
          <>
            <Box
              component="span"
              sx={{ display: { xs: 'none', sm: 'inline' } }}
            >
              Issue{' '}
            </Box>
            #
          </>
        ),
        width: '9%',
        sortKey: 'number',
        headerSx: { verticalAlign: 'middle', whiteSpace: 'nowrap' },
        cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' } },
        renderCell: (issue) => (
          <a
            href={githubIssueUrl(issue)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              fontWeight: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            #{issue.number}
          </a>
        ),
      },
      {
        key: 'title',
        header: 'Title',
        width: '38%',
        headerSx: { verticalAlign: 'middle' },
        cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' } },
        renderCell: (issue) => (
          <Tooltip title={issue.title} placement="bottom" arrow>
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
        width: '20%',
        sortKey: 'repository',
        headerSx: { verticalAlign: 'middle' },
        renderCell: (issue) => {
          const owner = issue.repositoryFullName.split('/')[0];
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
                }}
              />
              <Tooltip
                title={issue.repositoryFullName}
                placement="bottom"
                arrow
              >
                <Box
                  component="span"
                  sx={{ wordBreak: 'break-word', lineHeight: 1.3 }}
                >
                  {issue.repositoryFullName}
                </Box>
              </Tooltip>
            </Box>
          );
        },
      },
      {
        key: 'linked_pr',
        header: 'Linked PR',
        width: '14%',
        headerSx: { verticalAlign: 'middle' },
        renderCell: (issue) =>
          issue.prNumber != null ? (
            <a
              href={`https://github.com/${issue.repositoryFullName}/pull/${issue.prNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Chip
                size="small"
                label={`PR #${issue.prNumber}`}
                sx={{
                  height: 20,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  bgcolor: (t) => alpha(t.palette.success.main, 0.14),
                  color: 'success.light',
                  borderColor: (t) => alpha(t.palette.success.main, 0.35),
                  '& .MuiChip-label': { px: 1 },
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.success.main, 0.25),
                  },
                }}
                variant="outlined"
              />
            </a>
          ) : (
            <Chip
              size="small"
              label="No PR yet"
              sx={{
                height: 20,
                fontSize: '0.72rem',
                bgcolor: (t) => alpha(t.palette.warning.main, 0.1),
                color: (t) => alpha(t.palette.warning.light, 0.75),
                borderColor: (t) => alpha(t.palette.warning.main, 0.25),
                '& .MuiChip-label': { px: 1 },
              }}
              variant="outlined"
            />
          ),
      },
      {
        key: 'opened',
        header: 'Opened',
        width: '19%',
        align: 'right',
        sortKey: 'opened',
        headerSx: { verticalAlign: 'middle' },
        cellSx: {
          fontSize: { xs: '0.75rem', sm: '0.85rem' },
          color: (t) => alpha(t.palette.text.primary, 0.7),
        },
        renderCell: (issue) =>
          issue.createdAt ? (
            <Tooltip
              title={new Date(issue.createdAt).toLocaleDateString()}
              placement="bottom"
              arrow
            >
              <span style={{ cursor: 'default' }}>
                {formatDistanceToNow(new Date(issue.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </Tooltip>
          ) : null,
      },
    ],
    [],
  );

export const MinerIssueRepoSection: React.FC<MinerIssueRepoSectionProps> = (
  props,
) => {
  const theme = useTheme();
  const { issues, isLoading, getRowKey, emptyWhenNoIssues, emptyWhenFiltered } =
    props;

  const [filter, setFilter] = useState<IssueFilter>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<IssueSortField>('opened');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(
    props.layout === 'collapsible' ? Boolean(props.initialExpanded) : true,
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
    [sortField],
  );

  const handleRowClick = useCallback((issue: RepositoryIssue) => {
    window.open(githubIssueUrl(issue), '_blank', 'noopener,noreferrer');
  }, []);

  const filtered = useMemo(
    () => applyIssueFilter(issues, filter, search, sortField, sortDir),
    [issues, filter, search, sortField, sortDir],
  );

  const paged = useMemo(
    () => paginateItems(filtered, page, PAGE_SIZE),
    [filtered, page],
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const counts = useMemo(() => getIssueCounts(issues), [issues]);
  const sectionHasFilters = filter !== 'all' || search.trim() !== '';

  const columns = useIssueRepoColumns();

  const toolbarTitle = props.layout === 'inline' ? props.toolbarTitle : null;
  const toolbarSubtitle = props.toolbarSubtitle;
  const stickyHeader =
    props.layout === 'inline' ? Boolean(props.stickyHeader) : false;

  const toolbar = (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        borderBottom: '1px solid',
        borderColor: 'border.light',
      }}
    >
      {toolbarTitle != null && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1.5,
            mb: toolbarSubtitle ? 0.75 : 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
            }}
          >
            {toolbarTitle}
          </Typography>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontSize: '0.75rem',
            }}
          >
            ({filtered.length}
            {sectionHasFilters ? ` of ${issues.length}` : ''})
          </Typography>
        </Box>
      )}

      {toolbarSubtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {toolbarSubtitle}
        </Typography>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1.25, sm: 1 },
          flexWrap: 'wrap',
        }}
      >
        <TextField
          size="small"
          placeholder="Search by title, repo, or issue #..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
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
                visible={Boolean(search)}
                onClear={() => {
                  setSearch('');
                  setPage(0);
                }}
              />
            ),
          }}
          sx={{
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

        <Box
          sx={{
            display: 'flex',
            gap: { xs: 0.75, sm: 0.5 },
            flexWrap: 'wrap',
            ml: { xs: 0, sm: 'auto' },
            width: { xs: '100%', sm: 'auto' },
            '& > .MuiButton-root': {
              flex: { xs: 1, sm: 'none' },
              minWidth: 0,
            },
          }}
        >
          <ExplorerFilterButton
            label="All"
            count={counts.all}
            color={theme.palette.status.neutral}
            selected={filter === 'all'}
            onClick={() => {
              setFilter('all');
              setPage(0);
            }}
          />
          <ExplorerFilterButton
            label="Open"
            count={counts.open}
            color={theme.palette.status.open}
            selected={filter === 'open'}
            onClick={() => {
              setFilter('open');
              setPage(0);
            }}
          />
          <ExplorerFilterButton
            label="Solved"
            count={counts.solved}
            color={theme.palette.status.merged}
            selected={filter === 'solved'}
            onClick={() => {
              setFilter('solved');
              setPage(0);
            }}
          />
          <ExplorerFilterButton
            label="Closed"
            count={counts.closed}
            color={theme.palette.status.closed}
            selected={filter === 'closed'}
            onClick={() => {
              setFilter('closed');
              setPage(0);
            }}
          />
        </Box>
      </Box>
    </Box>
  );

  const table = (
    <DataTable<RepositoryIssue, IssueSortField>
      columns={columns}
      rows={paged}
      getRowKey={getRowKey}
      isLoading={isLoading}
      minWidth="700px"
      stickyHeader={stickyHeader}
      size="medium"
      header={toolbar}
      emptyState={
        <Box sx={{ px: 3, py: issues.length === 0 ? 2.5 : 6 }}>
          {issues.length === 0 ? emptyWhenNoIssues : emptyWhenFiltered}
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
  );

  if (props.layout === 'inline') {
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
        {table}
      </Card>
    );
  }

  const { summaryTitle } = props;

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
      <Box
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        sx={{
          p: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'border.light',
          '&:hover': {
            bgcolor: (t) => alpha(t.palette.common.white, 0.03),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
            }}
          >
            {summaryTitle}
          </Typography>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontSize: '0.75rem',
            }}
          >
            ({issues.length})
          </Typography>
        </Box>
        <ExpandMoreIcon
          sx={{
            color: 'text.secondary',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </Box>

      <Collapse in={expanded}>{table}</Collapse>
    </Card>
  );
};

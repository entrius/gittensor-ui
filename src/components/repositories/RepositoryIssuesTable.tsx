import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSessionStoredState } from '../../hooks/useSessionStoredState';
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  alpha,
  useTheme,
  TextField,
  InputAdornment,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import {
  useRepositoryIssues,
  useRepoIssues,
  type RepositoryIssue,
} from '../../api';
import { LinkBox } from '../common/linkBehavior';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import { formatTokenAmount, getLowerText, type SortOrder } from '../../utils';
import { formatDate } from '../../utils/format';
import { ScrollAwareTooltip } from '../../components/common/ScrollAwareTooltip';
import {
  getIssueStatusMeta,
  getBountyAmountColor,
} from '../../utils/issueStatus';
import { STATUS_COLORS, TEXT_OPACITY, scrollbarSx } from '../../theme';
import FilterButton from '../FilterButton';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import TablePagination from '../../components/common/TablePagination';

interface RepositoryIssuesTableProps {
  repositoryFullName: string;
}

type SortKey =
  | 'number'
  | 'title'
  | 'status'
  | 'linkedPr'
  | 'created'
  | 'closed';

type RepoIssuesFilter = 'all' | 'open' | 'closed';

const isRepoIssuesFilter = (v: unknown): v is RepoIssuesFilter =>
  v === 'all' || v === 'open' || v === 'closed';

function issueMatchesSearch(
  issue: RepositoryIssue,
  searchQuery: string,
): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  const title = getLowerText(issue.title);
  if (title.includes(q)) return true;
  const author = (issue.authorLogin || issue.author || '').toLowerCase();
  if (author.includes(q)) return true;
  const numStr = String(issue.number);
  if (numStr.includes(q)) return true;
  if (q.startsWith('#')) {
    const rest = q.slice(1).trim();
    if (rest && numStr.includes(rest)) return true;
  }
  return false;
}
const ISSUE_PAGE_SIZE = 20;

const RepositoryIssuesTable: React.FC<RepositoryIssuesTableProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const { data: issues, isLoading } = useRepositoryIssues(repositoryFullName);
  const { data: bounties } = useRepoIssues(repositoryFullName);
  const [filter, setFilter] = useSessionStoredState<RepoIssuesFilter>(
    'repository:issues:filter',
    'all',
    isRepoIssuesFilter,
  );
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [sortDirection, setSortDirection] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    setSearchQuery('');
    setMobileSearchOpen(false);
  }, [repositoryFullName]);

  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    if (!issues) return { total: 0, open: 0, closed: 0 };
    const match = (issue: RepositoryIssue) =>
      issueMatchesSearch(issue, searchQuery);
    return {
      total: issues.filter(match).length,
      open: issues.filter((issue) => !issue.closedAt).filter(match).length,
      closed: issues.filter((issue) => issue.closedAt).filter(match).length,
    };
  }, [issues, searchQuery]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    if (filter === 'open') return issues.filter((issue) => !issue.closedAt);
    if (filter === 'closed') return issues.filter((issue) => issue.closedAt);
    return issues;
  }, [issues, filter]);

  const searchFilteredIssues = useMemo(() => {
    return filteredIssues.filter((issue) =>
      issueMatchesSearch(issue, searchQuery),
    );
  }, [filteredIssues, searchQuery]);

  const sortedIssues = useMemo(() => {
    const directionFactor = sortDirection === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, {
      sensitivity: 'base',
      numeric: true,
    });
    const decorated = searchFilteredIssues.map((issue) => {
      let value: number | string;
      switch (sortKey) {
        case 'number':
          value = issue.number;
          break;
        case 'title':
          value = getLowerText(issue.title);
          break;
        case 'status':
          value = !issue.closedAt ? 'open' : 'closed';
          break;
        case 'linkedPr':
          value = issue.prNumber ? String(issue.prNumber) : '';
          break;
        case 'created':
          value = issue.createdAt ? new Date(issue.createdAt).getTime() : 0;
          break;
        case 'closed':
          value = issue.closedAt ? new Date(issue.closedAt).getTime() : 0;
          break;
        default:
          value = issue.createdAt ? new Date(issue.createdAt).getTime() : 0;
      }
      return { issue, value };
    });

    decorated.sort((a, b) => {
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return (a.value - b.value) * directionFactor;
      }
      return (
        collator.compare(String(a.value), String(b.value)) * directionFactor
      );
    });
    return decorated.map((item) => item.issue);
  }, [searchFilteredIssues, sortKey, sortDirection]);

  // Reset to the first page whenever the result set changes underneath us.
  useEffect(() => {
    setPage(0);
  }, [filter, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedIssues.length / ISSUE_PAGE_SIZE);
  const pagedIssues = useMemo(
    () =>
      sortedIssues.slice(
        page * ISSUE_PAGE_SIZE,
        page * ISSUE_PAGE_SIZE + ISSUE_PAGE_SIZE,
      ),
    [sortedIssues, page],
  );

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortKey(key);
      setSortDirection(key === 'title' || key === 'status' ? 'asc' : 'desc');
    },
    [sortKey],
  );

  const handleRowClick = useCallback((issue: RepositoryIssue) => {
    // Row navigates to GitHub in a new tab; using onRowClick (not getRowHref)
    // keeps nested <a> cells valid HTML.
    window.open(
      `https://github.com/${issue.repositoryFullName}/issues/${issue.number}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, []);

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
            Issues
          </Typography>
        </Box>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  const columns: DataTableColumn<RepositoryIssue, SortKey>[] = [
    {
      key: 'number',
      header: 'Issue #',
      width: 112,
      sortKey: 'number',
      renderCell: (issue) => (
        <a
          href={`https://github.com/${issue.repositoryFullName}/issues/${issue.number}`}
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
      width: 360,
      sortKey: 'title',
      renderCell: (issue) => (
        <ScrollAwareTooltip
          title={issue.title}
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
            {issue.title}
          </Box>
        </ScrollAwareTooltip>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 128,
      sortKey: 'status',
      renderCell: (issue) => {
        const isOpen = !issue.closedAt;
        return (
          <Chip
            variant="status"
            icon={isOpen ? <RadioButtonUncheckedIcon /> : <CheckCircleIcon />}
            label={isOpen ? 'OPEN' : 'CLOSED'}
            sx={{
              color: isOpen ? STATUS_COLORS.open : STATUS_COLORS.merged,
              borderColor: isOpen ? STATUS_COLORS.open : STATUS_COLORS.merged,
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        );
      },
    },
    {
      key: 'linkedPr',
      header: 'Linked PR',
      width: 128,
      sortKey: 'linkedPr',
      renderCell: (issue) =>
        issue.prNumber ? (
          <a
            href={`https://github.com/${issue.repositoryFullName}/pull/${issue.prNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: STATUS_COLORS.info,
              textDecoration: 'none',
              fontWeight: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            #{issue.prNumber}
          </a>
        ) : (
          <span
            style={{
              color: alpha(theme.palette.common.white, TEXT_OPACITY.faint),
            }}
          >
            -
          </span>
        ),
    },
    {
      key: 'created',
      header: 'Created',
      width: 128,
      align: 'right',
      sortKey: 'created',
      renderCell: (issue) => formatDate(issue.createdAt),
    },
    {
      key: 'closed',
      header: 'Closed',
      width: 128,
      align: 'right',
      sortKey: 'closed',
      renderCell: (issue) => formatDate(issue.closedAt),
    },
  ];

  const headerToolbar = (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        borderBottom: `1px solid ${theme.palette.border.light}`,
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1.5, sm: 2 },
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            minWidth: 0,
            flex: { sm: '1 1 auto' },
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
              fontSize: { xs: '1rem', sm: '1.1rem' },
              fontWeight: 500,
              minWidth: 0,
            }}
          >
            Issues ({sortedIssues.length})
          </Typography>
          {isSmDown && !mobileSearchOpen ? (
            <IconButton
              size="small"
              aria-label="Search issues"
              onClick={() => setMobileSearchOpen(true)}
              sx={{
                flexShrink: 0,
                border: '1px solid',
                borderColor: 'border.light',
                borderRadius: 2,
                color: 'text.secondary',
              }}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>
        {(!isSmDown || mobileSearchOpen) && (
          <TextField
            size="small"
            placeholder="Search (#, title, author)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Escape' &&
                !searchQuery.trim() &&
                isSmDown &&
                mobileSearchOpen
              ) {
                setMobileSearchOpen(false);
              }
            }}
            onBlur={() => {
              if (isSmDown && !searchQuery.trim()) {
                setMobileSearchOpen(false);
              }
            }}
            autoFocus={Boolean(isSmDown && mobileSearchOpen)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{
                      color: 'text.secondary',
                      fontSize: '1rem',
                    }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <ClearSearchAdornment
                  visible={Boolean(searchQuery)}
                  onClear={() => setSearchQuery('')}
                />
              ),
            }}
            sx={{
              width: { xs: '100%', sm: 280 },
              maxWidth: { xs: '100%', sm: 360 },
              flexShrink: 0,
              alignSelf: { xs: 'stretch', sm: 'auto' },
              '& .MuiOutlinedInput-root': {
                fontSize: '0.8rem',
                backgroundColor: 'surface.subtle',
                borderRadius: 2,
                '& fieldset': { borderColor: 'border.light' },
                '&:hover fieldset': { borderColor: 'border.medium' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
            }}
          />
        )}
      </Box>
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={1}
        sx={{ columnGap: 1, rowGap: 1 }}
      >
        <FilterButton
          label="All"
          isActive={filter === 'all'}
          onClick={() => setFilter('all')}
          count={counts.total}
          color={STATUS_COLORS.open}
          activeTextColor="text.primary"
        />
        <FilterButton
          label="Open"
          isActive={filter === 'open'}
          onClick={() => setFilter('open')}
          count={counts.open}
          color={STATUS_COLORS.open}
          activeTextColor="text.primary"
        />
        <FilterButton
          label="Closed"
          isActive={filter === 'closed'}
          onClick={() => setFilter('closed')}
          count={counts.closed}
          color={STATUS_COLORS.merged}
          activeTextColor="text.primary"
        />
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Bounties Section — list of LinkBox cards, separate from the table. */}
      {bounties && bounties.length > 0 && (
        <Card
          sx={{
            borderRadius: 3,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundColor: 'transparent',
            p: 0,
            overflow: 'hidden',
          }}
          elevation={0}
        >
          <Box
            sx={{
              p: 3,
              borderBottom: `1px solid ${theme.palette.border.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
              Bounties ({bounties.length})
            </Typography>
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {bounties.map((bounty) => {
              const meta = getIssueStatusMeta(bounty.status);
              return (
                <LinkBox
                  key={bounty.id}
                  href={`/bounties/details?id=${bounty.id}`}
                  linkState={{ backLabel: `Back to ${repositoryFullName}` }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                    backgroundColor: 'surface.subtle',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'surface.light',
                      borderColor: alpha(theme.palette.common.white, 0.15),
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      minWidth: 0,
                    }}
                  >
                    <Chip
                      label={meta.text}
                      size="small"
                      sx={{
                        backgroundColor: meta.bgColor,
                        color: meta.color,
                        border: `1px solid ${meta.borderColor}`,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        height: '22px',
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                    <Typography
                      sx={{
                        color: STATUS_COLORS.open,
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      #{bounty.issueNumber}
                    </Typography>
                    <Typography
                      sx={{
                        color: 'text.primary',
                        fontSize: '0.85rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {issues?.find(
                        (i) =>
                          i.number === bounty.issueNumber &&
                          i.repositoryFullName === bounty.repositoryFullName,
                      )?.title || `${repositoryFullName}#${bounty.issueNumber}`}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        color: getBountyAmountColor(
                          bounty.status,
                          alpha(theme.palette.common.white, TEXT_OPACITY.muted),
                        ),
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      {`${formatTokenAmount(bounty.targetBounty)} ل`}
                    </Typography>
                    <ArrowForwardIcon
                      sx={{
                        color: alpha(
                          theme.palette.common.white,
                          TEXT_OPACITY.ghost,
                        ),
                        fontSize: 16,
                      }}
                    />
                  </Box>
                </LinkBox>
              );
            })}
          </Box>
        </Card>
      )}

      {/* Issues Table */}
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
        <DataTable<RepositoryIssue, SortKey>
          columns={columns}
          rows={pagedIssues}
          getRowKey={(issue) =>
            `${issue.number}-${issue.prNumber}-${issue.repositoryFullName}`
          }
          minWidth="984px"
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
                  color: alpha(
                    theme.palette.common.white,
                    TEXT_OPACITY.tertiary,
                  ),
                  fontSize: '0.9rem',
                }}
              >
                {searchQuery.trim() &&
                sortedIssues.length === 0 &&
                filteredIssues.length > 0
                  ? 'No issues match your search.'
                  : 'No issues found'}
              </Typography>
            </Box>
          }
          onRowClick={handleRowClick}
          sort={{
            field: sortKey,
            order: sortDirection,
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
    </Box>
  );
};

export default RepositoryIssuesTable;

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
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
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useMinerGithubData, useMinerPRs } from '../../api';
import { paginateItems } from '../../utils';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import ExplorerFilterButton from './ExplorerFilterButton';
import TablePagination from './TablePagination';
import {
  selectMinerIssueScanRepos,
  useMinerRepositoriesOpenIssues,
} from '../../hooks/useMinerRepositoriesOpenIssues';
import { type RepositoryIssue } from '../../api/models/Miner';

type IssueFilter = 'all' | 'open' | 'solved' | 'closed';
type IssueSortField = 'number' | 'repository' | 'opened';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

const DEFAULT_SORT_DIR: Record<IssueSortField, SortDir> = {
  number: 'desc',
  repository: 'asc',
  opened: 'desc',
};

// Issue is still open
const isOpenIssue = (i: RepositoryIssue) => !i.closedAt;
// Issue was closed and has a linked PR (solved by a contributor)
const isSolvedIssue = (i: RepositoryIssue) =>
  !!i.closedAt && i.prNumber != null;
// Issue was closed without a linked PR (rejected, duplicate, etc.)
const isClosedIssue = (i: RepositoryIssue) =>
  !!i.closedAt && i.prNumber == null;

const githubIssueUrl = (issue: RepositoryIssue) =>
  issue.url ??
  `https://github.com/${issue.repositoryFullName}/issues/${issue.number}`;

const githubSearchIssuesByAuthor = (login: string) =>
  `https://github.com/search?q=${encodeURIComponent(`is:issue author:${login}`)}&type=issues`;

interface GithubSearchIssueItem {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  created_at: string | null;
  closed_at: string | null;
  user?: { login?: string | null } | null;
  pull_request?: unknown;
}

interface GithubSearchIssuesResponse {
  items: GithubSearchIssueItem[];
}

const parsePullNumberFromUrl = (url: string): number | null => {
  const match = url.match(/\/pull\/(\d+)(?:$|[/?#])/);
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
};

const parseRepoFromRepositoryUrl = (repositoryUrl: string): string | null => {
  const marker = '/repos/';
  const idx = repositoryUrl.indexOf(marker);
  if (idx < 0) return null;
  const repo = repositoryUrl.slice(idx + marker.length);
  return repo || null;
};

interface GithubIssueTimelineEvent {
  event?: string;
  source?: {
    issue?: {
      pull_request?: {
        html_url?: string;
      } | null;
    } | null;
  } | null;
}

const fetchLinkedPrNumberForIssue = async (
  repositoryFullName: string,
  issueNumber: number,
): Promise<number | null> => {
  try {
    const { data } = await axios.get<GithubIssueTimelineEvent[]>(
      `https://api.github.com/repos/${repositoryFullName}/issues/${issueNumber}/timeline`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    for (const event of data ?? []) {
      const prUrl = event.source?.issue?.pull_request?.html_url;
      if (!prUrl) continue;
      const prNumber = parsePullNumberFromUrl(prUrl);
      if (prNumber != null) return prNumber;
    }
  } catch {
    // Ignore timeline fetch failures and fall back to "No linked PR yet".
  }
  return null;
};

const fetchGithubIssuesByAuthor = async (
  login: string,
): Promise<RepositoryIssue[]> => {
  const { data } = await axios.get<GithubSearchIssuesResponse>(
    'https://api.github.com/search/issues',
    {
      params: { q: `is:issue author:${login}`, per_page: 100 },
    },
  );

  const mapped = (data.items || [])
    .filter((item) => !item.pull_request)
    .map((item) => {
      const repositoryFullName = parseRepoFromRepositoryUrl(
        item.repository_url,
      );
      return {
        number: item.number,
        repositoryFullName: repositoryFullName ?? '',
        prNumber: null,
        title: item.title,
        createdAt: item.created_at ?? null,
        closedAt: item.closed_at ?? null,
        state: item.closed_at ? 'closed' : 'open',
        author: item.user?.login ?? login,
        authorLogin: item.user?.login ?? login,
        url: item.html_url,
      } satisfies RepositoryIssue;
    })
    .filter((issue) => !!issue.repositoryFullName);

  const enriched = await Promise.all(
    mapped.map(async (issue) => {
      const prNumber = await fetchLinkedPrNumberForIssue(
        issue.repositoryFullName,
        issue.number,
      );
      return { ...issue, prNumber } satisfies RepositoryIssue;
    }),
  );
  return enriched;
};

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

interface MinerOpenDiscoveryIssuesByRepoProps {
  githubId: string;
}

const MinerOpenDiscoveryIssuesByRepo: React.FC<
  MinerOpenDiscoveryIssuesByRepoProps
> = ({ githubId }) => {
  const theme = useTheme();

  const { data: prs, isLoading: isLoadingPrs } = useMinerPRs(githubId);
  const { data: githubProfile, isLoading: isLoadingGithub } =
    useMinerGithubData(githubId);

  // Mine section state
  const [mineFilter, setMineFilter] = useState<IssueFilter>('all');
  const [mineSearch, setMineSearch] = useState('');
  const [mineSortField, setMineSortField] = useState<IssueSortField>('opened');
  const [mineSortDir, setMineSortDir] = useState<SortDir>('desc');
  const [minePage, setMinePage] = useState(0);

  // Other section state
  const [otherFilter, setOtherFilter] = useState<IssueFilter>('all');
  const [otherSearch, setOtherSearch] = useState('');
  const [otherSortField, setOtherSortField] =
    useState<IssueSortField>('opened');
  const [otherSortDir, setOtherSortDir] = useState<SortDir>('desc');
  const [otherPage, setOtherPage] = useState(0);
  const [otherExpanded, setOtherExpanded] = useState(false);

  const scanRepos = useMemo(() => selectMinerIssueScanRepos(prs), [prs]);
  const login = githubProfile?.login ?? '';

  const {
    data: githubAuthoredIssues = [],
    isLoading: isLoadingAuthoredIssues,
    isFetching: isFetchingAuthoredIssues,
    isError: isAuthorFallbackError,
  } = useQuery({
    queryKey: ['githubAuthorIssues', login],
    queryFn: () => fetchGithubIssuesByAuthor(login),
    enabled: !!login,
    staleTime: 60_000,
    retry: 1,
  });

  const authoredRepos = useMemo(
    () =>
      [
        ...new Set(githubAuthoredIssues.map((i) => i.repositoryFullName)),
      ].filter(Boolean),
    [githubAuthoredIssues],
  );

  const { issuesByRepo, isLoading, isError, repoFetchLimit } =
    useMinerRepositoriesOpenIssues(scanRepos, !isLoadingPrs);

  const {
    issuesByRepo: authoredReposIssuesByRepo,
    isLoading: isLoadingAuthoredRepoIssues,
    isError: isAuthoredRepoIssuesError,
  } = useMinerRepositoriesOpenIssues(
    authoredRepos,
    !isLoadingPrs && !isLoadingAuthoredIssues && authoredRepos.length > 0,
  );

  const reposForGrouping = useMemo(
    () => [...new Set([...scanRepos, ...authoredRepos])],
    [authoredRepos, scanRepos],
  );

  const { mineIssues, otherIssues } = useMemo(() => {
    const mine = new Map<string, RepositoryIssue[]>();
    const other = new Map<string, RepositoryIssue[]>();
    const mineKeys = new Set<string>();
    const indexedIssueByKey = new Map<string, RepositoryIssue>();

    const addToMap = (
      target: Map<string, RepositoryIssue[]>,
      repo: string,
      issue: RepositoryIssue,
    ) => {
      const arr = target.get(repo) ?? [];
      arr.push(issue);
      target.set(repo, arr);
    };

    reposForGrouping.forEach((repo) => {
      const fromScan = issuesByRepo.get(repo) ?? [];
      const fromAuthoredRepoFetch = authoredReposIssuesByRepo.get(repo) ?? [];
      const listByNumber = new Map<number, RepositoryIssue>();
      [...fromScan, ...fromAuthoredRepoFetch].forEach((issue) => {
        listByNumber.set(issue.number, issue);
      });
      listByNumber.forEach((issue) => {
        const key = `${repo}#${issue.number}`;
        indexedIssueByKey.set(key, issue);
        addToMap(other, repo, issue);
      });
    });

    githubAuthoredIssues.forEach((issue) => {
      const repo = issue.repositoryFullName;
      if (!repo) return;
      const key = `${repo}#${issue.number}`;
      if (mineKeys.has(key)) return;
      mineKeys.add(key);
      addToMap(mine, repo, indexedIssueByKey.get(key) ?? issue);
    });

    const filteredOther = new Map<string, RepositoryIssue[]>();
    const mineRepos = new Set(mine.keys());
    other.forEach((issues, repo) => {
      if (!mineRepos.has(repo)) return;
      const filtered = issues.filter(
        (issue) => !mineKeys.has(`${repo}#${issue.number}`),
      );
      if (filtered.length) filteredOther.set(repo, filtered);
    });

    return {
      mineIssues: [...mine.values()].flat(),
      otherIssues: [...filteredOther.values()].flat(),
    };
  }, [
    authoredReposIssuesByRepo,
    githubAuthoredIssues,
    issuesByRepo,
    reposForGrouping,
  ]);

  const handleMineSort = useCallback(
    (field: IssueSortField) => {
      if (mineSortField === field) {
        setMineSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setMineSortField(field);
        setMineSortDir(DEFAULT_SORT_DIR[field]);
      }
      setMinePage(0);
    },
    [mineSortField],
  );

  const handleOtherSort = useCallback(
    (field: IssueSortField) => {
      if (otherSortField === field) {
        setOtherSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setOtherSortField(field);
        setOtherSortDir(DEFAULT_SORT_DIR[field]);
      }
      setOtherPage(0);
    },
    [otherSortField],
  );

  const handleRowClick = useCallback((issue: RepositoryIssue) => {
    window.open(githubIssueUrl(issue), '_blank', 'noopener,noreferrer');
  }, []);

  const filteredMine = useMemo(
    () =>
      applyIssueFilter(
        mineIssues,
        mineFilter,
        mineSearch,
        mineSortField,
        mineSortDir,
      ),
    [mineIssues, mineFilter, mineSearch, mineSortField, mineSortDir],
  );
  const filteredOther = useMemo(
    () =>
      applyIssueFilter(
        otherIssues,
        otherFilter,
        otherSearch,
        otherSortField,
        otherSortDir,
      ),
    [otherIssues, otherFilter, otherSearch, otherSortField, otherSortDir],
  );

  const pagedMine = useMemo(
    () => paginateItems(filteredMine, minePage, PAGE_SIZE),
    [filteredMine, minePage],
  );
  const pagedOther = useMemo(
    () => paginateItems(filteredOther, otherPage, PAGE_SIZE),
    [filteredOther, otherPage],
  );

  const mineTotalPages = Math.ceil(filteredMine.length / PAGE_SIZE);
  const otherTotalPages = Math.ceil(filteredOther.length / PAGE_SIZE);

  const mineCounts = useMemo(() => getIssueCounts(mineIssues), [mineIssues]);
  const otherCounts = useMemo(() => getIssueCounts(otherIssues), [otherIssues]);

  const mineColumns: DataTableColumn<RepositoryIssue, IssueSortField>[] =
    useMemo(
      () => [
        {
          key: 'number',
          header: 'Issue #',
          width: '9%',
          sortKey: 'number',
          headerSx: { verticalAlign: 'middle' },
          cellSx: { fontSize: { xs: '0.75rem', sm: '0.85rem' } },
          renderCell: (issue) => (
            // stopPropagation keeps the row's onRowClick from also firing
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
                  src={`https://avatars.githubusercontent.com/${owner}`}
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

  const otherColumns: DataTableColumn<RepositoryIssue, IssueSortField>[] =
    useMemo(
      () => [
        {
          key: 'number',
          header: 'Issue #',
          width: '9%',
          sortKey: 'number' as IssueSortField,
          headerSx: { verticalAlign: 'middle' },
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
          sortKey: 'repository' as IssueSortField,
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
                  src={`https://avatars.githubusercontent.com/${owner}`}
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
          sortKey: 'opened' as IssueSortField,
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

  const renderToolbar = (
    title: string | null,
    totalIssues: RepositoryIssue[],
    filteredCount: number,
    counts: ReturnType<typeof getIssueCounts>,
    filter: IssueFilter,
    onFilterChange: (f: IssueFilter) => void,
    search: string,
    onSearchChange: (s: string) => void,
    hasFilters: boolean,
    subtitle?: string,
  ) => (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        borderBottom: '1px solid',
        borderColor: 'border.light',
      }}
    >
      {/* Title row — only when a title is provided */}
      {title != null && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1.5,
            mb: subtitle ? 0.75 : 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontSize: '0.75rem',
            }}
          >
            ({filteredCount}
            {hasFilters ? ` of ${totalIssues.length}` : ''})
          </Typography>
        </Box>
      )}

      {/* Subtitle description */}
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
      )}

      {/* Search + filters on one line */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          size="small"
          placeholder="Search by title, repo, or issue #..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
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
            maxWidth: 400,
            minWidth: 260,
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

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: 'auto' }}>
          <ExplorerFilterButton
            label="All"
            count={counts.all}
            color={theme.palette.status.neutral}
            selected={filter === 'all'}
            onClick={() => {
              onFilterChange('all');
            }}
          />
          <ExplorerFilterButton
            label="Open"
            count={counts.open}
            color={theme.palette.status.open}
            selected={filter === 'open'}
            onClick={() => {
              onFilterChange('open');
            }}
          />
          <ExplorerFilterButton
            label="Solved"
            count={counts.solved}
            color={theme.palette.status.merged}
            selected={filter === 'solved'}
            onClick={() => {
              onFilterChange('solved');
            }}
          />
          <ExplorerFilterButton
            label="Closed"
            count={counts.closed}
            color={theme.palette.status.closed}
            selected={filter === 'closed'}
            onClick={() => {
              onFilterChange('closed');
            }}
          />
        </Box>
      </Box>
    </Box>
  );

  if (isLoadingPrs || isLoadingGithub) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          p: 4,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={36} />
      </Card>
    );
  }

  if (!prs?.length) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          p: 3,
        }}
      >
        <Typography color="text.secondary">
          No scored pull requests yet. Open issues are listed for repositories
          where you already have PR activity, so this view will populate after
          your first contributions are indexed.
        </Typography>
      </Card>
    );
  }

  if (!scanRepos.length) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          p: 3,
        }}
      >
        <Typography color="text.secondary">
          No repositories found to scan for issues.
        </Typography>
      </Card>
    );
  }

  const isDataLoading =
    isLoading ||
    isLoadingAuthoredIssues ||
    isFetchingAuthoredIssues ||
    isLoadingAuthoredRepoIssues;

  const mineSectionHasFilters =
    mineFilter !== 'all' || mineSearch.trim() !== '';
  const otherSectionHasFilters =
    otherFilter !== 'all' || otherSearch.trim() !== '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert
        severity="info"
        sx={{
          borderRadius: 2,
          bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
          border: '1px solid',
          borderColor: (t) => alpha(t.palette.warning.main, 0.22),
          '& .MuiAlert-icon': {
            color: (t) => alpha(t.palette.warning.light, 0.95),
          },
        }}
      >
        Open issues are loaded from Gittensor's per-repository issue index for
        up to {repoFetchLimit} repositories where you have scored PRs (most
        recent first). When the API includes an issue author, issues you opened
        are grouped separately. Use GitHub search for the canonical list of
        everything you have opened publicly.
        {login ? (
          <Box sx={{ mt: 1.5 }}>
            <Button
              component="a"
              href={githubSearchIssuesByAuthor(login)}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              color="inherit"
              endIcon={<OpenInNewIcon fontSize="small" />}
              sx={{
                borderColor: (t) => alpha(t.palette.warning.main, 0.45),
                color: (t) => alpha(t.palette.warning.light, 0.95),
                '&:hover': {
                  borderColor: (t) => alpha(t.palette.warning.main, 0.65),
                  bgcolor: (t) => alpha(t.palette.warning.main, 0.14),
                },
              }}
            >
              View all open issues by @{login} on GitHub
            </Button>
          </Box>
        ) : null}
      </Alert>

      {prs.length > repoFetchLimit ? (
        <Typography variant="caption" color="text.secondary">
          You have PRs in more than {repoFetchLimit} repositories; only the most
          active {repoFetchLimit} are scanned here to limit load.
        </Typography>
      ) : null}

      {(isError || isAuthoredRepoIssuesError) && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Some issue lists could not be loaded. Try again later.
        </Alert>
      )}
      {isAuthorFallbackError && !isDataLoading && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Could not load all authored open issues from GitHub right now. Showing
          indexed results only.
        </Alert>
      )}

      {/* Your open discovery issues */}
      <Card
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        elevation={0}
      >
        <DataTable<RepositoryIssue, IssueSortField>
          columns={mineColumns}
          rows={pagedMine}
          getRowKey={(issue) => `${issue.repositoryFullName}-${issue.number}`}
          isLoading={isDataLoading}
          minWidth="700px"
          stickyHeader
          size="medium"
          header={renderToolbar(
            'Your open discovery issues',
            mineIssues,
            filteredMine.length,
            mineCounts,
            mineFilter,
            (f) => {
              setMineFilter(f);
              setMinePage(0);
            },
            mineSearch,
            (s) => {
              setMineSearch(s);
              setMinePage(0);
            },
            mineSectionHasFilters,
            'Open issues authored by you in the scanned repositories (discovery index plus GitHub fallback). Use this list to track your own active reports.',
          )}
          emptyState={
            <Box sx={{ px: 3, py: mineIssues.length === 0 ? 2.5 : 6 }}>
              {mineIssues.length === 0 ? (
                <Typography color="text.secondary">
                  No open issues in this index matched your GitHub login as
                  author. That usually means the API response does not yet
                  include author fields, or you have no open reports in these
                  repositories. Use the GitHub button above for a definitive
                  list.
                </Typography>
              ) : (
                <Typography
                  sx={{
                    color: (t) => alpha(t.palette.text.primary, 0.5),
                    fontSize: '0.9rem',
                    textAlign: 'center',
                  }}
                >
                  No matching open issues in the scanned repositories.
                </Typography>
              )}
            </Box>
          }
          onRowClick={handleRowClick}
          sort={{
            field: mineSortField,
            order: mineSortDir,
            onChange: handleMineSort,
          }}
          pagination={
            <TablePagination
              page={minePage}
              totalPages={mineTotalPages}
              onPageChange={setMinePage}
            />
          }
        />
      </Card>

      {/* Other open discovery issues — collapsed by default */}
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
          onClick={() => setOtherExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOtherExpanded((v) => !v);
            }
          }}
          sx={{
            p: { xs: 2, sm: 3 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
            borderBottom: otherExpanded ? '1px solid' : 'none',
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
                fontWeight: 500,
              }}
            >
              Other open discovery issues
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontSize: '0.75rem',
              }}
            >
              ({otherIssues.length})
            </Typography>
          </Box>
          <ExpandMoreIcon
            sx={{
              color: 'text.secondary',
              transition: 'transform 0.2s',
              transform: otherExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </Box>

        <Collapse in={otherExpanded}>
          <DataTable<RepositoryIssue, IssueSortField>
            columns={otherColumns}
            rows={pagedOther}
            getRowKey={(issue) =>
              `other-${issue.repositoryFullName}-${issue.number}`
            }
            isLoading={isDataLoading}
            minWidth="700px"
            size="medium"
            header={renderToolbar(
              null,
              otherIssues,
              filteredOther.length,
              otherCounts,
              otherFilter,
              (f) => {
                setOtherFilter(f);
                setOtherPage(0);
              },
              otherSearch,
              (s) => {
                setOtherSearch(s);
                setOtherPage(0);
              },
              otherSectionHasFilters,
              "Other people's open issues in the same repositories (still part of the discovery index). Useful for triage and collaboration.",
            )}
            emptyState={
              <Box sx={{ px: 3, py: otherIssues.length === 0 ? 2.5 : 6 }}>
                {otherIssues.length === 0 ? (
                  <Typography color="text.secondary">
                    No other open issues in the scanned repositories.
                  </Typography>
                ) : (
                  <Typography
                    sx={{
                      color: (t) => alpha(t.palette.text.primary, 0.5),
                      fontSize: '0.9rem',
                      textAlign: 'center',
                    }}
                  >
                    No issues match the selected filters.
                  </Typography>
                )}
              </Box>
            }
            onRowClick={handleRowClick}
            sort={{
              field: otherSortField,
              order: otherSortDir,
              onChange: handleOtherSort,
            }}
            pagination={
              <TablePagination
                page={otherPage}
                totalPages={otherTotalPages}
                onPageChange={setOtherPage}
              />
            }
          />
        </Collapse>
      </Card>
    </Box>
  );
};

export default MinerOpenDiscoveryIssuesByRepo;

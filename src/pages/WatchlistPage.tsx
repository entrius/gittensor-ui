import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  TablePagination,
  TextField,
  Typography,
  Button,
  alpha,
  Stack,
  Dialog,
  DialogTitle,
  DialogActions,
  Tab,
  Tabs,
  Badge,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Page } from '../components/layout';
import {
  TopMinersTable,
  ActivitySidebarCards,
  SEO,
  WatchlistButton,
} from '../components';
import {
  DataTable,
  type DataTableColumn,
} from '../components/common/DataTable';
import { LinkBox } from '../components/common/linkBehavior';
import { useAllMiners, useReposAndWeights, useIssues } from '../api';
import { mapAllMinersToStats } from '../utils/minerMapper';
import {
  useWatchlist,
  useWatchlistCounts,
  serializePRKey,
  type WatchlistCategory,
} from '../hooks/useWatchlist';
import { useWatchedPRs } from '../hooks/useWatchedPRs';
import { isMergedPr, isClosedUnmergedPr } from '../utils/prStatus';
import { filterPrs, type PrStatusFilter } from '../utils/prTable';
import { getIssueStatusMeta } from '../utils/issueStatus';
import { formatTokenAmount } from '../utils/format';
import theme, { STATUS_COLORS, scrollbarSx } from '../theme';
import type { CommitLog } from '../api/models/Dashboard';

const TAB_ORDER: readonly WatchlistCategory[] = [
  'miners',
  'repos',
  'bounties',
  'prs',
] as const;

const TAB_LABELS: Record<WatchlistCategory, string> = {
  miners: 'Miners',
  repos: 'Repositories',
  bounties: 'Bounties',
  prs: 'Pull Requests',
};

const TAB_NOUN: Record<WatchlistCategory, { single: string; plural: string }> =
  {
    miners: { single: 'miner', plural: 'miners' },
    repos: { single: 'repository', plural: 'repositories' },
    bounties: { single: 'bounty', plural: 'bounties' },
    prs: { single: 'pull request', plural: 'pull requests' },
  };

const TAB_DISCOVERY: Record<
  WatchlistCategory,
  { label: string; path: string; hint: string }
> = {
  miners: {
    label: 'leaderboard',
    path: '/top-miners',
    hint: 'Browse the leaderboard and star miners you want to track.',
  },
  repos: {
    label: 'repositories',
    path: '/repositories',
    hint: 'Open a repository and star it to follow its activity here.',
  },
  bounties: {
    label: 'bounties',
    path: '/bounties',
    hint: 'Open a bounty and star it to track its submissions here.',
  },
  prs: {
    label: 'repositories',
    path: '/repositories',
    hint: 'Open a pull request and star it to monitor its scoring here.',
  },
};

const tabFromParam = (param: string | null): WatchlistCategory =>
  TAB_ORDER.includes(param as WatchlistCategory)
    ? (param as WatchlistCategory)
    : 'miners';

const WatchlistPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = tabFromParam(searchParams.get('tab'));

  // Single subscription for tab badges; per-tab content uses useWatchlist
  // scoped to its own category via the *List subcomponents below.
  const counts = useWatchlistCounts();
  const { ids, count, clear } = useWatchlist(activeTab);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isEmpty = count === 0;
  const noun = TAB_NOUN[activeTab];
  const discovery = TAB_DISCOVERY[activeTab];

  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const showSidebarRight = !isEmpty && isLargeScreen;
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const sidebarWidth =
    isMobile || isTablet ? '100%' : isLargeScreen ? '340px' : '300px';

  const { ids: minerIds } = useWatchlist('miners');
  const { data: allMinersData } = useAllMiners();
  const minerStats = useMemo(() => {
    const watchedSet = new Set(minerIds);
    return mapAllMinersToStats(allMinersData ?? [])
      .filter((m) => watchedSet.has(m.githubId))
      .map((m) => ({
        ...m,
        isEligible: Boolean(m.ossIsEligible || m.discoveriesIsEligible),
      }));
  }, [allMinersData, minerIds]);

  const handleClear = () => {
    clear();
    setConfirmOpen(false);
  };

  const handleTabChange = (_event: React.SyntheticEvent, next: unknown) => {
    const validated = tabFromParam(String(next));
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (validated === 'miners') {
          params.delete('tab');
        } else {
          params.set('tab', validated);
        }
        return params;
      },
      { replace: true },
    );
  };

  return (
    <Page title="Watchlist">
      <SEO
        title="Watchlist"
        description="Your pinned miners, repositories, bounties, and pull requests on Gittensor."
      />
      <Box
        sx={{
          width: '100%',
          height: showSidebarRight ? 'calc(100vh - 64px)' : 'auto',
          display: 'flex',
          flexDirection: showSidebarRight ? 'row' : 'column',
          gap: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          overflow: 'hidden',
        }}
      >
        {/* Main Content Area */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 1.5 },
            minHeight: 0,
            overflow: showSidebarRight ? 'auto' : 'visible',
            minWidth: 0,
            pr: showSidebarRight ? 1 : 0,
            ...scrollbarSx,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            <Typography
              sx={{
                fontSize: '0.8rem',
                color: (t) => alpha(t.palette.text.primary, 0.5),
                lineHeight: 1.6,
              }}
            >
              Your watchlist — {count}{' '}
              {count === 1 ? `${noun.single} pinned` : `${noun.plural} pinned`}.
              Stored locally in this browser.
            </Typography>
            {count > 0 && (
              <Button
                size="small"
                onClick={() => setConfirmOpen(true)}
                sx={{
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  color: 'text.secondary',
                }}
              >
                Clear {noun.plural}
              </Button>
            )}
          </Stack>

          <Box sx={{ borderBottom: '1px solid', borderColor: 'border.light' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={(t) => ({
                minHeight: 48,
                '& .MuiTab-root': {
                  minHeight: 48,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  color: t.palette.text.secondary,
                  '&.Mui-selected': {
                    color: t.palette.text.primary,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: t.palette.text.primary,
                  height: 2,
                },
              })}
            >
              {TAB_ORDER.map((cat) => (
                <Tab
                  key={cat}
                  value={cat}
                  label={
                    <Badge
                      badgeContent={counts[cat]}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.65rem',
                          minWidth: 18,
                          height: 18,
                        },
                      }}
                    >
                      <Box sx={{ pr: counts[cat] > 0 ? 1.5 : 0 }}>
                        {TAB_LABELS[cat]}
                      </Box>
                    </Badge>
                  }
                />
              ))}
            </Tabs>
          </Box>

          {activeTab === 'prs' ? (
            <PRsList itemKeys={ids} />
          ) : isEmpty ? (
            <Box
              sx={{
                py: 8,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                alignItems: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography sx={{ fontSize: '0.95rem' }}>
                No watched {noun.plural} yet.
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  color: (t) => alpha(t.palette.text.primary, 0.5),
                  lineHeight: 1.6,
                }}
              >
                {discovery.hint} Pinned items appear here across reloads and
                tabs.
              </Typography>
              <Button
                component={RouterLink}
                to={discovery.path}
                variant="outlined"
                size="small"
                sx={{ textTransform: 'none', mt: 1 }}
              >
                Go to {discovery.label}
              </Button>
            </Box>
          ) : activeTab === 'miners' ? (
            <MinersList itemKeys={ids} />
          ) : activeTab === 'repos' ? (
            <ReposList itemKeys={ids} />
          ) : (
            <BountiesList itemKeys={ids} />
          )}
        </Box>

        {/* Right Sidebar — new activities */}
        {!isEmpty && (
          <Box
            sx={{
              width: showSidebarRight ? sidebarWidth : '100%',
              height: showSidebarRight ? '100%' : 'auto',
              maxHeight: showSidebarRight ? '100%' : 'none',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <ActivitySidebarCards miners={minerStats} />
          </Box>
        )}
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{
          sx: (t) => ({
            backgroundColor: t.palette.background.default,
            border: `1px solid ${t.palette.border.light}`,
            borderRadius: 3,
            backgroundImage: 'none',
            p: 3,
          }),
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '0.9rem',
            fontWeight: 600,
            p: 0,
            mb: 3,
          }}
        >
          Clear all {count} pinned miner(s)?
        </DialogTitle>
        <DialogActions sx={{ p: 0 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{
              textTransform: 'none',
              fontSize: '0.8rem',
              color: (t) => alpha(t.palette.text.primary, 0.7),
              border: '1px solid',
              borderColor: 'border.light',
              borderRadius: 2,
              px: 2,
              '&:hover': {
                color: 'text.primary',
                borderColor: 'border.medium',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClear}
            sx={{
              textTransform: 'none',
              fontSize: '0.8rem',
              color: 'common.white',
              backgroundColor: 'error.main',
              borderRadius: 2,
              px: 2,
              '&:hover': {
                backgroundColor: 'error.dark',
              },
            }}
          >
            Clear {noun.plural}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
};

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  px: 1.5,
  py: 1.25,
  borderRadius: 1,
  transition: 'background 0.15s',
  '&:hover': { backgroundColor: 'surface.light' },
};

const primaryTextSx = {
  fontSize: '0.85rem',
  color: 'text.primary',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const secondaryTextSx = {
  fontSize: '0.7rem',
  color: 'text.secondary',
  mt: 0.25,
};

interface WatchedItemRowProps {
  href: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  actions: React.ReactNode;
}

// LinkBox wraps only the navigable text area (not the whole row) so the
// star button — a real <button> — is a sibling of the <a>, not a descendant.
// Keeps middle-click / Cmd-click / "Open in new tab" working natively while
// avoiding invalid interactive-inside-anchor HTML.
const WatchedItemRow: React.FC<WatchedItemRowProps> = ({
  href,
  primary,
  secondary,
  actions,
}) => (
  <Box sx={rowSx}>
    <LinkBox
      href={href}
      linkState={{ backLabel: 'Back to Watchlist' }}
      sx={{ display: 'block', minWidth: 0, flex: 1 }}
    >
      <Typography sx={primaryTextSx}>{primary}</Typography>
      {secondary !== undefined && (
        <Typography sx={secondaryTextSx}>{secondary}</Typography>
      )}
    </LinkBox>
    <Stack direction="row" spacing={2} alignItems="center">
      {actions}
    </Stack>
  </Box>
);

interface StatusPillProps {
  label: string;
  color: string;
  background: string;
}

const StatusPill: React.FC<StatusPillProps> = ({
  label,
  color,
  background,
}) => (
  <Typography
    sx={{
      fontSize: '0.72rem',
      color,
      backgroundColor: background,
      px: 1,
      py: 0.25,
      borderRadius: 0.75,
    }}
  >
    {label}
  </Typography>
);

const MinersList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { data: allMinersStats, isLoading } = useAllMiners();
  const watchedSet = useMemo(() => new Set(itemKeys), [itemKeys]);

  const minerStats = useMemo(() => {
    const all = mapAllMinersToStats(allMinersStats ?? []);
    return all
      .filter((m) => watchedSet.has(m.githubId))
      .map((m) => ({
        ...m,
        // Watchlist cards should be enabled if miner is eligible for either
        // OSS contributions or Issue Discoveries.
        isEligible: Boolean(m.ossIsEligible || m.discoveriesIsEligible),
      }));
  }, [allMinersStats, watchedSet]);

  return (
    <Box sx={{ width: '100%' }}>
      <TopMinersTable
        miners={minerStats}
        isLoading={isLoading}
        getMinerHref={(m) =>
          `/miners/details?githubId=${encodeURIComponent(m.githubId)}`
        }
        linkState={{ backLabel: 'Back to Watchlist' }}
        variant="watchlist"
        showDualEligibilityBadges
      />
    </Box>
  );
};

const ReposList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { data: repos } = useReposAndWeights();
  const items = useMemo(() => {
    if (!repos) return [];
    const set = new Set(itemKeys.map((k) => k.toLowerCase()));
    return repos.filter((r) => set.has(r.fullName.toLowerCase()));
  }, [repos, itemKeys]);

  return (
    <Stack spacing={0.5} sx={{ width: '100%' }}>
      {items.map((repo) => (
        <WatchedItemRow
          key={repo.fullName}
          href={`/miners/repository?name=${encodeURIComponent(repo.fullName)}`}
          primary={repo.fullName}
          actions={
            <>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                weight {parseFloat(String(repo.weight)).toFixed(2)}
              </Typography>
              <WatchlistButton category="repos" itemKey={repo.fullName} />
            </>
          }
        />
      ))}
    </Stack>
  );
};

const BountiesList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { data: allIssues } = useIssues();
  const items = useMemo(() => {
    if (!allIssues) return [];
    // Stored keys and issue ids are compared as strings to avoid any
    // numeric coercion drift if issue ids ever become composite.
    const set = new Set(itemKeys);
    return allIssues.filter((issue) => set.has(String(issue.id)));
  }, [allIssues, itemKeys]);

  return (
    <Stack spacing={0.5} sx={{ width: '100%' }}>
      {items.map((issue) => {
        const meta = getIssueStatusMeta(issue.status);
        return (
          <WatchedItemRow
            key={issue.id}
            href={`/bounties/details?id=${issue.id}`}
            primary={
              issue.title || `${issue.repositoryFullName} #${issue.issueNumber}`
            }
            secondary={`${issue.repositoryFullName} #${issue.issueNumber}`}
            actions={
              <>
                <StatusPill
                  label={meta.text}
                  color={meta.color}
                  background={meta.bgColor}
                />
                <Typography
                  sx={{ fontSize: '0.75rem', color: 'status.success' }}
                >
                  {formatTokenAmount(issue.bountyAmount)} ل
                </Typography>
                <WatchlistButton
                  category="bounties"
                  itemKey={String(issue.id)}
                />
              </>
            }
          />
        );
      })}
    </Stack>
  );
};

const prStatusMeta = (pr: CommitLog) => {
  const merged = isMergedPr(pr);
  const closed = isClosedUnmergedPr(pr);
  const label = merged ? 'MERGED' : closed ? 'CLOSED' : 'OPEN';
  const color = merged
    ? STATUS_COLORS.merged
    : closed
      ? STATUS_COLORS.closed
      : STATUS_COLORS.open;
  return { label, color };
};

type PrSortKey = 'pr' | 'title' | 'repo' | 'author' | 'score';

const prCellSx = { py: 1.5 } as const;

const prColumns: DataTableColumn<CommitLog, PrSortKey>[] = [
  {
    key: 'pr',
    header: 'PR',
    width: '70px',
    sortKey: 'pr',
    cellSx: prCellSx,
    renderCell: (pr) => (
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
        #{pr.pullRequestNumber}
      </Typography>
    ),
  },
  {
    key: 'title',
    header: 'Title',
    width: '30%',
    sortKey: 'title',
    cellSx: prCellSx,
    renderCell: (pr) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {pr.pullRequestTitle}
      </Typography>
    ),
  },
  {
    key: 'repo',
    header: 'Repository',
    width: '20%',
    sortKey: 'repo',
    cellSx: prCellSx,
    renderCell: (pr) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {pr.repository}
      </Typography>
    ),
  },
  {
    key: 'author',
    header: 'Author',
    width: '14%',
    sortKey: 'author',
    cellSx: prCellSx,
    renderCell: (pr) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Avatar
          src={`https://avatars.githubusercontent.com/${pr.author}`}
          sx={{ width: 20, height: 20, flexShrink: 0 }}
        />
        <Typography
          sx={{
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {pr.author}
        </Typography>
      </Box>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '90px',
    align: 'center',
    cellSx: prCellSx,
    renderCell: (pr) => {
      const { label, color } = prStatusMeta(pr);
      return (
        <Chip
          variant="status"
          label={label}
          sx={{ color, borderColor: color }}
        />
      );
    },
  },
  {
    key: 'score',
    header: 'Score',
    width: '80px',
    align: 'right',
    sortKey: 'score',
    cellSx: prCellSx,
    renderCell: (pr) => (
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
        {parseFloat(pr.score || '0').toFixed(2)}
      </Typography>
    ),
  },
  {
    key: 'watch',
    header: '★',
    width: '52px',
    align: 'center',
    cellSx: { p: 0 },
    renderCell: (pr) => (
      <WatchlistButton
        category="prs"
        itemKey={serializePRKey(pr.repository, pr.pullRequestNumber)}
        size="small"
      />
    ),
  },
];

const getPrHref = (pr: CommitLog) =>
  `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`;

const PR_ROWS_OPTIONS = [10, 25, 50] as const;

const PRsList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { items } = useWatchedPRs(itemKeys);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PrStatusFilter>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<PrSortKey>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: PrSortKey) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(
        field === 'title' || field === 'author' || field === 'repo'
          ? 'asc'
          : 'desc',
      );
    }
    setPage(0);
  };

  const authorOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const pr of items) {
      if (pr.author) seen.add(pr.author);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const result = filterPrs(items, {
      statusFilter,
      author: authorFilter === 'all' ? null : authorFilter,
      searchQuery,
      includeNumber: true,
    });
    setPage(0);
    return result;
  }, [items, statusFilter, authorFilter, searchQuery]);

  const sorted = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const cmpStr = (a = '', b = '') => a.localeCompare(b) * dir;
    const cmpNum = (a = 0, b = 0) => (a - b) * dir;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case 'pr':
          return cmpNum(a.pullRequestNumber, b.pullRequestNumber);
        case 'title':
          return cmpStr(a.pullRequestTitle, b.pullRequestTitle);
        case 'repo':
          return cmpStr(a.repository, b.repository);
        case 'author':
          return cmpStr(a.author, b.author);
        case 'score':
          return cmpNum(parseFloat(a.score || '0'), parseFloat(b.score || '0'));
        default:
          return 0;
      }
    });
  }, [filtered, sortField, sortOrder]);

  const paged = useMemo(
    () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sorted, page, rowsPerPage],
  );

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        overflow: 'hidden',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        '& .MuiTableContainer-root': {
          flex: 1,
          overflowY: 'auto',
          ...scrollbarSx,
        },
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'border.light',
          flexWrap: 'wrap',
        }}
      >
        <FormControl size="small">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
            >
              State:
            </Typography>
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as PrStatusFilter)
              }
              sx={{
                color: 'text.primary',
                backgroundColor: 'background.default',
                fontSize: '0.8rem',
                height: '36px',
                borderRadius: 2,
                minWidth: '96px',
                '& fieldset': { borderColor: 'border.light' },
                '&:hover fieldset': { borderColor: 'border.medium' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                '& .MuiSelect-select': { py: 0.75, pr: '28px !important' },
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="merged">Merged</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </Box>
        </FormControl>
        <FormControl size="small">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
            >
              Author:
            </Typography>
            <Select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value as string)}
              sx={{
                color: 'text.primary',
                backgroundColor: 'background.default',
                fontSize: '0.8rem',
                height: '36px',
                borderRadius: 2,
                minWidth: '180px',
                maxWidth: '240px',
                '& fieldset': { borderColor: 'border.light' },
                '&:hover fieldset': { borderColor: 'border.medium' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                '& .MuiSelect-select': {
                  py: 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                },
              }}
              MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
              renderValue={(value) =>
                value === 'all' ? (
                  'All authors'
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      minWidth: 0,
                    }}
                  >
                    <Avatar
                      src={`https://avatars.githubusercontent.com/${value}`}
                      sx={{ width: 18, height: 18, flexShrink: 0 }}
                    />
                    <Box
                      component="span"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {value}
                    </Box>
                  </Box>
                )
              }
            >
              <MenuItem value="all">All authors</MenuItem>
              {authorOptions.map((author) => (
                <MenuItem
                  key={author}
                  value={author}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                  }}
                >
                  <Avatar
                    src={`https://avatars.githubusercontent.com/${author}`}
                    sx={{ width: 20, height: 20, flexShrink: 0 }}
                  />
                  <Box
                    component="span"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {author}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </Box>
        </FormControl>
        <FormControl size="small">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
            >
              Rows:
            </Typography>
            <Select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(e.target.value as number);
                setPage(0);
              }}
              sx={{
                color: 'text.primary',
                backgroundColor: 'background.default',
                fontSize: '0.8rem',
                height: '36px',
                borderRadius: 2,
                minWidth: '80px',
                '& fieldset': { borderColor: 'border.light' },
                '&:hover fieldset': { borderColor: 'border.medium' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                '& .MuiSelect-select': { py: 0.75 },
              }}
            >
              {PR_ROWS_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </FormControl>
        <TextField
          placeholder="Search PRs..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.tertiary', fontSize: '1rem' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            minWidth: '180px',
            '& .MuiOutlinedInput-root': {
              color: 'text.primary',
              backgroundColor: 'background.default',
              fontSize: '0.8rem',
              height: '36px',
              borderRadius: 2,
              '& fieldset': { borderColor: 'border.light' },
              '&:hover fieldset': { borderColor: 'border.medium' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      </Box>

      <DataTable<CommitLog, PrSortKey>
        columns={prColumns}
        rows={paged}
        getRowKey={(pr) => serializePRKey(pr.repository, pr.pullRequestNumber)}
        getRowHref={getPrHref}
        linkState={{ backLabel: 'Back to Watchlist' }}
        minWidth="750px"
        stickyHeader
        emptyLabel="No watched pull requests found."
        sort={{
          field: sortField,
          order: sortOrder,
          onChange: handleSort,
        }}
      />
      <TablePagination
        rowsPerPageOptions={[]}
        component="div"
        count={filtered.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_e, newPage) => setPage(newPage)}
        onRowsPerPageChange={() => {}}
        showFirstButton
        showLastButton
        sx={{
          borderTop: '1px solid',
          borderColor: 'border.light',
          color: 'text.secondary',
        }}
      />
    </Card>
  );
};

export default WatchlistPage;

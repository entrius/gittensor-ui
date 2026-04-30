import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQueries } from '@tanstack/react-query';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Collapse,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Switch,
  TablePagination,
  TextField,
  Tooltip,
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
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ReactECharts from 'echarts-for-react';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
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
import {
  useAllMiners,
  useReposAndWeights,
  useIssues,
  useAllPrs,
  useMinersIssues,
} from '../api';
import type {
  CommitLog,
  MinerIssue,
  Repository,
} from '../api/models/Dashboard';
import { mapAllMinersToStats } from '../utils/minerMapper';
import {
  useWatchlist,
  useWatchlistCounts,
  getWatchlistIssueMeta,
  serializePRKey,
  type WatchlistCategory,
} from '../hooks/useWatchlist';
import { useWatchedPRs, type WatchedPRSource } from '../hooks/useWatchedPRs';
import {
  isMergedPr,
  isClosedUnmergedPr,
  getPrStatusCounts,
} from '../utils/prStatus';
import { filterPrs, type PrStatusFilter } from '../utils/prTable';
import { getIssueStatusMeta } from '../utils/issueStatus';
import { formatTokenAmount } from '../utils/format';
import { compareByWatchlist } from '../utils/watchlistSort';
import theme, {
  CHART_COLORS,
  LABEL_COLORS,
  STATUS_COLORS,
  TEXT_OPACITY,
  UI_COLORS,
  scrollbarSx,
} from '../theme';
import FilterButton from '../components/FilterButton';
import { getRepositoryOwnerAvatarBackground } from '../components/leaderboard/types';

const TAB_ORDER: readonly WatchlistCategory[] = [
  'miners',
  'repos',
  'bounties',
  'prs',
  'issues',
] as const;

const TAB_LABELS: Record<WatchlistCategory, string> = {
  miners: 'Miners',
  repos: 'Repositories',
  bounties: 'Bounties',
  prs: 'Pull Requests',
  issues: 'Issues',
};

const TAB_NOUN: Record<WatchlistCategory, { single: string; plural: string }> =
  {
    miners: { single: 'miner', plural: 'miners' },
    repos: { single: 'repository', plural: 'repositories' },
    bounties: { single: 'bounty', plural: 'bounties' },
    prs: { single: 'pull request', plural: 'pull requests' },
    issues: { single: 'issue', plural: 'issues' },
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
    hint: 'Star a pull request, miner, or repository to populate this tab.',
  },
  issues: {
    label: 'leaderboard',
    path: '/top-miners',
    hint: 'Star miners to aggregate their issues here.',
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

  const tabHasContent =
    activeTab === 'prs'
      ? counts.prs + counts.miners + counts.repos > 0
      : activeTab === 'issues'
        ? counts.miners > 0
        : count > 0;
  const isEmpty = !tabHasContent;
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
              {activeTab === 'prs' &&
                ' Also shows PRs from watched miners and repositories.'}{' '}
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
                      <Box
                        sx={{
                          pr: counts[cat] > 0 ? 1.5 : 0,
                        }}
                      >
                        {TAB_LABELS[cat]}
                      </Box>
                    </Badge>
                  }
                />
              ))}
            </Tabs>
          </Box>

          {isEmpty ? (
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
          ) : activeTab === 'bounties' ? (
            <BountiesList itemKeys={ids} />
          ) : activeTab === 'issues' ? (
            <IssuesList minerIds={minerIds} />
          ) : (
            <PRsList itemKeys={ids} />
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

type WatchedRepoStats = Repository & {
  totalScore: number;
  totalPRs: number;
  uniqueMiners: Set<string>;
};

const isRepoActive = (repo: Repository): boolean => !repo.inactiveAt;

type RepoStatusFilter = 'all' | 'active' | 'inactive';

type RepoSortKey =
  | 'name'
  | 'weight'
  | 'status'
  | 'totalScore'
  | 'totalPRs'
  | 'contributors';

const repoCellSx = { py: 1.5 } as const;

const repoStatusMeta = (repo: Repository) => {
  const active = isRepoActive(repo);
  return {
    label: active ? 'ACTIVE' : 'INACTIVE',
    color: active ? STATUS_COLORS.success : STATUS_COLORS.closed,
  };
};

const getRepoHref = (repo: Repository) =>
  `/miners/repository?name=${encodeURIComponent(repo.fullName)}`;

const repoColumns: DataTableColumn<WatchedRepoStats, RepoSortKey>[] = [
  {
    key: 'name',
    header: 'Repository',
    width: '32%',
    sortKey: 'name',
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Avatar
          src={`https://avatars.githubusercontent.com/${repo.fullName.split('/')[0]}`}
          sx={{
            width: 20,
            height: 20,
            flexShrink: 0,
            backgroundColor: getRepositoryOwnerAvatarBackground(
              repo.fullName.split('/')[0] || '',
            ),
          }}
        />
        <Typography
          sx={{
            fontSize: '0.78rem',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {repo.fullName}
        </Typography>
      </Box>
    ),
  },
  {
    key: 'weight',
    header: 'Weight',
    width: '100px',
    align: 'right',
    sortKey: 'weight',
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
        {parseFloat(String(repo.weight)).toFixed(2)}
      </Typography>
    ),
  },
  {
    key: 'totalScore',
    header: 'Total Score',
    width: '110px',
    align: 'right',
    sortKey: 'totalScore',
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: repo.totalScore > 0 ? 'text.primary' : 'text.secondary',
        }}
      >
        {formatRepoMetric(repo.totalScore, 2)}
      </Typography>
    ),
  },
  {
    key: 'totalPRs',
    header: 'PRs',
    width: '70px',
    align: 'right',
    sortKey: 'totalPRs',
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: repo.totalPRs > 0 ? 'text.primary' : 'text.secondary',
        }}
      >
        {formatRepoMetric(repo.totalPRs)}
      </Typography>
    ),
  },
  {
    key: 'contributors',
    header: 'Contributors',
    width: '110px',
    align: 'right',
    sortKey: 'contributors',
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: repo.uniqueMiners.size > 0 ? 'text.primary' : 'text.secondary',
        }}
      >
        {formatRepoMetric(repo.uniqueMiners.size)}
      </Typography>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '110px',
    align: 'center',
    sortKey: 'status',
    cellSx: repoCellSx,
    renderCell: (repo) => {
      const { label, color } = repoStatusMeta(repo);
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
    key: 'watch',
    header: '\u2605',
    width: '52px',
    align: 'center',
    cellSx: { p: 0 },
    renderCell: (repo) => (
      <WatchlistButton category="repos" itemKey={repo.fullName} size="small" />
    ),
  },
];

type ReposViewMode = 'list' | 'cards';

const ReposViewModeToggle: React.FC<{
  viewMode: ReposViewMode;
  onChange: (mode: ReposViewMode) => void;
}> = ({ viewMode, onChange }) => {
  const options: {
    value: ReposViewMode;
    label: string;
    Icon: typeof ViewListIcon;
  }[] = [
    { value: 'list', label: 'List view', Icon: ViewListIcon },
    { value: 'cards', label: 'Card view', Icon: ViewModuleIcon },
  ];

  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        overflow: 'hidden',
      })}
      role="group"
      aria-label="Toggle view mode"
    >
      {options.map(({ value, label, Icon }) => {
        const isActive = viewMode === value;
        return (
          <Tooltip key={value} title={label} placement="top" arrow>
            <IconButton
              onClick={() => onChange(value)}
              size="small"
              aria-label={label}
              aria-pressed={isActive}
              sx={(theme) => ({
                borderRadius: 0,
                padding: '6px 10px',
                color: isActive
                  ? theme.palette.text.primary
                  : theme.palette.text.tertiary,
                backgroundColor: isActive
                  ? theme.palette.surface.light
                  : 'transparent',
                '&:hover': {
                  backgroundColor: theme.palette.surface.light,
                  color: theme.palette.text.primary,
                },
              })}
            >
              <Icon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
};

const formatRepoMetric = (value: number, decimals = 0): string =>
  value > 0 ? (decimals > 0 ? value.toFixed(decimals) : String(value)) : '-';

const RepoMetricCell: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      minWidth: 0,
    }}
  >
    <Typography
      sx={(theme) => ({
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.65rem',
        color: theme.palette.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      })}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: value === '-' ? 'text.secondary' : 'text.primary',
        lineHeight: 1.2,
      }}
    >
      {value}
    </Typography>
  </Box>
);

const RepoCard: React.FC<{ repo: WatchedRepoStats; maxWeight: number }> = ({
  repo,
  maxWeight,
}) => {
  const { label, color } = repoStatusMeta(repo);
  const owner = repo.fullName.split('/')[0] || '';
  const weight = parseFloat(String(repo.weight)) || 0;
  const isInactive = !!repo.inactiveAt;
  const weightPct =
    maxWeight > 0 ? Math.max(0, Math.min(100, (weight / maxWeight) * 100)) : 0;

  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        p: 2,
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        backgroundColor: theme.palette.surface.transparent,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: isInactive ? 0.5 : 1,
        '&:hover': {
          backgroundColor: theme.palette.surface.light,
          borderColor: theme.palette.border.medium,
        },
      })}
    >
      {/* Header: avatar + full name + status pill + star */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Avatar
          src={`https://avatars.githubusercontent.com/${owner}`}
          alt={owner}
          sx={(theme) => ({
            width: 28,
            height: 28,
            flexShrink: 0,
            border: '1px solid',
            borderColor: theme.palette.border.medium,
            backgroundColor: getRepositoryOwnerAvatarBackground(owner),
          })}
        />
        <LinkBox
          href={getRepoHref(repo)}
          linkState={{ backLabel: 'Back to Watchlist' }}
          sx={{ flex: 1, minWidth: 0, display: 'block' }}
        >
          <Tooltip title={repo.fullName} placement="top" arrow>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {repo.fullName}
            </Typography>
          </Tooltip>
        </LinkBox>
        <Typography
          component="span"
          sx={(theme) => ({
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            px: 0.75,
            py: 0.25,
            borderRadius: '4px',
            flexShrink: 0,
            color,
            backgroundColor: alpha(
              isInactive
                ? theme.palette.status.closed
                : theme.palette.status.success,
              0.12,
            ),
          })}
        >
          {label === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Typography>
        <WatchlistButton
          category="repos"
          itemKey={repo.fullName}
          size="small"
        />
      </Box>

      {/* Weight + progress bar */}
      <Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Typography
            sx={(theme) => ({
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.65rem',
              color: theme.palette.text.tertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            })}
          >
            Weight
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            {weight.toFixed(2)}
          </Typography>
        </Box>
        <Box
          aria-hidden="true"
          sx={(theme) => ({
            position: 'relative',
            height: 4,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.text.primary, 0.08),
            overflow: 'hidden',
          })}
        >
          <Box
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              width: `${weightPct}%`,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            })}
          />
        </Box>
      </Box>

      {/* Metrics grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 0.6fr 1fr',
          gap: 1.5,
          pt: 0.5,
        }}
      >
        <RepoMetricCell
          label="Total Score"
          value={formatRepoMetric(repo.totalScore, 2)}
        />
        <RepoMetricCell label="PRs" value={formatRepoMetric(repo.totalPRs)} />
        <RepoMetricCell
          label="Contributors"
          value={formatRepoMetric(repo.uniqueMiners.size)}
        />
      </Box>
    </Card>
  );
};

const REPO_ROWS_OPTIONS = [10, 25, 50] as const;

const ReposList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { data: repos } = useReposAndWeights();
  const { data: allPrs } = useAllPrs();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RepoStatusFilter>('all');
  const [viewMode, setViewMode] = useState<ReposViewMode>('list');
  const [showChart, setShowChart] = useState(false);
  const [useLogScale, setUseLogScale] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<RepoSortKey>('weight');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: RepoSortKey) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const items = useMemo<WatchedRepoStats[]>(() => {
    if (!repos) return [];
    const set = new Set(itemKeys.map((k) => k.toLowerCase()));

    const prStatsMap = new Map<
      string,
      { totalScore: number; totalPRs: number; uniqueMiners: Set<string> }
    >();
    if (allPrs) {
      allPrs.forEach((pr: CommitLog) => {
        if (!pr?.repository) return;
        if (!pr.mergedAt) return;
        const key = pr.repository.toLowerCase();
        const cur = prStatsMap.get(key) || {
          totalScore: 0,
          totalPRs: 0,
          uniqueMiners: new Set<string>(),
        };
        cur.totalScore += parseFloat(pr.score || '0');
        cur.totalPRs += 1;
        if (pr.author) cur.uniqueMiners.add(pr.author);
        prStatsMap.set(key, cur);
      });
    }

    return repos
      .filter((r) => set.has(r.fullName.toLowerCase()))
      .map((r) => {
        const s = prStatsMap.get(r.fullName.toLowerCase());
        return {
          ...r,
          totalScore: s?.totalScore || 0,
          totalPRs: s?.totalPRs || 0,
          uniqueMiners: s?.uniqueMiners || new Set<string>(),
        };
      });
  }, [repos, allPrs, itemKeys]);

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter(isRepoActive).length,
      inactive: items.filter((r) => !isRepoActive(r)).length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter === 'active') result = result.filter(isRepoActive);
    else if (statusFilter === 'inactive')
      result = result.filter((r) => !isRepoActive(r));

    const q = searchQuery.trim().toLowerCase();
    if (q) result = result.filter((r) => r.fullName.toLowerCase().includes(q));

    setPage(0);
    return result;
  }, [items, statusFilter, searchQuery]);

  const sorted = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const cmpStr = (a = '', b = '') => a.localeCompare(b) * dir;
    const cmpNum = (a = 0, b = 0) => (a - b) * dir;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case 'name':
          return cmpStr(a.fullName, b.fullName);
        case 'weight':
          return cmpNum(
            parseFloat(String(a.weight)),
            parseFloat(String(b.weight)),
          );
        case 'status':
          return cmpNum(isRepoActive(a) ? 1 : 0, isRepoActive(b) ? 1 : 0);
        case 'totalScore':
          return cmpNum(a.totalScore, b.totalScore);
        case 'totalPRs':
          return cmpNum(a.totalPRs, b.totalPRs);
        case 'contributors':
          return cmpNum(a.uniqueMiners.size, b.uniqueMiners.size);
        default:
          return 0;
      }
    });
  }, [filtered, sortField, sortOrder]);

  const paged = useMemo(
    () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sorted, page, rowsPerPage],
  );

  const maxWeight = useMemo(
    () =>
      items.reduce((m, r) => Math.max(m, parseFloat(String(r.weight)) || 0), 0),
    [items],
  );

  const chartOption = useMemo(() => {
    const white = UI_COLORS.white;
    const borderSubtle = alpha(white, 0.08);
    const textColor = alpha(white, 0.85);
    const gridColor = borderSubtle;
    const tooltipLabelColor = alpha(white, TEXT_OPACITY.secondary);
    const primaryColor = UI_COLORS.white;

    const chartData = paged.map((repo) => ({
      name: repo.fullName.split('/')[1] || repo.fullName,
      repository: repo.fullName,
      value: parseFloat(String(repo.weight)) || 0,
    }));

    const barGradient = {
      type: 'linear' as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: alpha(CHART_COLORS.open, 0.8) },
        { offset: 0.5, color: alpha(CHART_COLORS.open, 0.6) },
        { offset: 1, color: alpha(CHART_COLORS.open, 0.4) },
      ],
    };

    const seriesData = chartData.map((item) => ({
      value: item.value,
      repository: item.repository,
      itemStyle: {
        color: barGradient,
        borderRadius: [6, 6, 0, 0],
        shadowColor: alpha(CHART_COLORS.open, 0.2),
        shadowBlur: 12,
      },
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Repository Weights',
        subtext: 'Values match the current sort and page',
        left: 'center',
        top: 20,
        textStyle: { color: primaryColor, fontSize: 18, fontWeight: 600 },
        subtextStyle: {
          color: alpha(white, TEXT_OPACITY.tertiary),
          fontSize: 12,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: { color: borderSubtle },
        },
        backgroundColor: UI_COLORS.surfaceTooltip,
        borderColor: alpha(white, 0.15),
        borderWidth: 1,
        textStyle: { color: primaryColor, fontSize: 12 },
        padding: [12, 16],
        formatter: (params: unknown) => {
          if (!Array.isArray(params)) return '';
          const data = params[0] as { dataIndex: number };
          const item = seriesData[data.dataIndex];
          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">
                ${item.repository}
              </div>
              <div style="color: ${tooltipLabelColor};">Weight: <span style="color: ${primaryColor}; font-weight: 600;">${item.value.toFixed(2)}</span></div>
            </div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '18%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: chartData.map((item) => item.name),
        axisLabel: {
          color: textColor,
          fontSize: 11,
          interval: 0,
          rotate: 45,
          margin: 12,
          formatter: (label: string) =>
            label.length > 15 ? `${label.substring(0, 12)}...` : label,
        },
        axisLine: { lineStyle: { color: gridColor, width: 1 } },
        axisTick: { show: false },
      },
      yAxis: {
        type: useLogScale ? 'log' : 'value',
        min: useLogScale ? 0.01 : 0,
        logBase: 10,
        name: 'Weight',
        nameTextStyle: { color: textColor, fontSize: 12 },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          formatter: (value: number) => value.toFixed(2),
        },
        splitLine: {
          lineStyle: { color: gridColor, type: 'dashed', opacity: 0.5 },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          data: seriesData,
          type: 'bar',
          barWidth: '60%',
        },
      ],
    };
  }, [paged, useLogScale]);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        overflow: 'hidden',
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
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <FilterButton
            label="All"
            count={counts.all}
            color={STATUS_COLORS.neutral}
            isActive={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <FilterButton
            label="Active"
            count={counts.active}
            color={STATUS_COLORS.success}
            isActive={statusFilter === 'active'}
            onClick={() => setStatusFilter('active')}
          />
          <FilterButton
            label="Inactive"
            count={counts.inactive}
            color={STATUS_COLORS.closed}
            isActive={statusFilter === 'inactive'}
            onClick={() => setStatusFilter('inactive')}
          />
        </Box>
        <Tooltip title={showChart ? 'Hide Chart' : 'Show Chart'}>
          <IconButton
            onClick={() => setShowChart((v) => !v)}
            size="small"
            sx={{
              color: showChart ? 'text.primary' : 'text.tertiary',
              border: '1px solid',
              borderColor: 'border.light',
              borderRadius: 2,
              padding: '6px',
              '&:hover': {
                backgroundColor: 'surface.light',
                borderColor: 'border.medium',
              },
            }}
          >
            {showChart ? (
              <TableChartIcon fontSize="small" />
            ) : (
              <BarChartIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        {showChart && (
          <FormControlLabel
            control={
              <Switch
                checked={useLogScale}
                onChange={(e) => setUseLogScale(e.target.checked)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'primary.main',
                  },
                  '& .MuiSwitch-track': { backgroundColor: 'border.medium' },
                }}
              />
            }
            label={
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', color: 'text.secondary' }}
              >
                Log Scale
              </Typography>
            }
          />
        )}
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
              {REPO_ROWS_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </FormControl>
        <TextField
          placeholder="Search repositories..."
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
            width: '220px',
            '& .MuiOutlinedInput-root': {
              color: 'text.primary',
              fontFamily: '"JetBrains Mono", monospace',
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
        <Box sx={{ ml: 'auto' }}>
          <ReposViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        </Box>
      </Box>

      {viewMode === 'cards' && (
        <Box
          sx={{
            px: 2,
            pb: 2,
            pt: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'border.light',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
          >
            Sort:
          </Typography>
          <Select
            size="small"
            value={sortField}
            onChange={(e) => {
              const next = e.target.value as RepoSortKey;
              setSortField(next);
              setSortOrder(next === 'name' ? 'asc' : 'desc');
              setPage(0);
            }}
            sx={{
              color: 'text.primary',
              backgroundColor: 'background.default',
              fontSize: '0.8rem',
              height: '36px',
              borderRadius: 2,
              minWidth: '140px',
              '& fieldset': { borderColor: 'border.light' },
              '&:hover fieldset': { borderColor: 'border.medium' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              '& .MuiSelect-select': { py: 0.75 },
            }}
          >
            <MenuItem value="weight">Weight</MenuItem>
            <MenuItem value="totalScore">Total Score</MenuItem>
            <MenuItem value="totalPRs">PRs</MenuItem>
            <MenuItem value="contributors">Contributors</MenuItem>
            <MenuItem value="name">Repository</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </Select>
          <Tooltip title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}>
            <IconButton
              onClick={() => {
                setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                setPage(0);
              }}
              size="small"
              aria-label={
                sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'
              }
              sx={{
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'border.light',
                borderRadius: 2,
                padding: '6px',
                '&:hover': {
                  backgroundColor: 'surface.light',
                  borderColor: 'border.medium',
                },
              }}
            >
              {sortOrder === 'asc' ? (
                <ArrowUpwardIcon fontSize="small" />
              ) : (
                <ArrowDownwardIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Collapse in={showChart}>
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'border.light',
            height: '500px',
            backgroundColor: 'surface.subtle',
          }}
        >
          {showChart && paged.length > 0 && (
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
              notMerge
            />
          )}
        </Box>
      </Collapse>

      {/* Content */}
      {viewMode === 'list' ? (
        <DataTable<WatchedRepoStats, RepoSortKey>
          columns={repoColumns}
          rows={paged}
          getRowKey={(repo) => repo.fullName}
          getRowHref={getRepoHref}
          linkState={{ backLabel: 'Back to Watchlist' }}
          minWidth="900px"
          stickyHeader
          emptyLabel="No watched repositories found."
          sort={{
            field: sortField,
            order: sortOrder,
            onChange: handleSort,
          }}
        />
      ) : (
        <Box
          sx={{
            p: 2,
            overflowY: 'auto',
            ...scrollbarSx,
          }}
        >
          {paged.length === 0 ? (
            <Typography
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                py: 4,
                fontSize: '0.85rem',
              }}
            >
              No watched repositories found.
            </Typography>
          ) : (
            <Grid container spacing={2} alignItems="stretch">
              {paged.map((repo) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={repo.fullName}
                  sx={{ display: 'flex' }}
                >
                  <Box sx={{ width: '100%' }}>
                    <RepoCard repo={repo} maxWeight={maxWeight} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
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

type PrSortKey = 'pr' | 'title' | 'repo' | 'author' | 'score' | 'watch';

const prCellSx = { py: 1.5 } as const;

const SOURCE_META: Record<
  WatchedPRSource,
  { label: string; tooltip: string; Icon: typeof StarIcon; color: string }
> = {
  starred: {
    label: 'Starred',
    tooltip: 'You starred this issue',
    Icon: StarIcon,
    color: '#facc15',
  },
  miner: {
    label: 'Miner',
    tooltip: 'From a watched miner',
    Icon: PersonIcon,
    color: '#60a5fa',
  },
  repo: {
    label: 'Repo',
    tooltip: 'From a watched repository',
    Icon: FolderIcon,
    color: '#a78bfa',
  },
};

const SOURCE_RENDER_ORDER: WatchedPRSource[] = ['starred', 'miner', 'repo'];

const WatchedSourceBadges: React.FC<{ sources: WatchedPRSource[] }> = ({
  sources,
}) => {
  if (sources.length === 0) return null;
  const present = new Set(sources);
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      role="list"
      aria-label="Reasons this PR is in your watchlist"
    >
      {SOURCE_RENDER_ORDER.filter((s) => present.has(s)).map((s) => {
        const { label, tooltip, Icon, color } = SOURCE_META[s];
        return (
          <Tooltip key={s} title={tooltip} placement="top" arrow>
            <Box
              role="listitem"
              aria-label={label}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: 1,
                backgroundColor: alpha(color, 0.14),
                border: '1px solid',
                borderColor: alpha(color, 0.35),
                color,
              }}
            >
              <Icon sx={{ fontSize: '0.85rem' }} />
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
};

const buildPrColumns = (
  sourcesByKey: Map<string, WatchedPRSource[]>,
): DataTableColumn<CommitLog, PrSortKey>[] => [
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
    key: 'source',
    header: 'Why',
    width: '92px',
    align: 'center',
    cellSx: prCellSx,
    renderCell: (pr) => (
      <WatchedSourceBadges
        sources={
          sourcesByKey.get(
            serializePRKey(pr.repository, pr.pullRequestNumber),
          ) ?? []
        }
      />
    ),
  },
  {
    key: 'watch',
    header: '★',
    width: '52px',
    align: 'center',
    sortKey: 'watch',
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

type PRsViewMode = 'list' | 'cards';

const PRsViewModeToggle: React.FC<{
  viewMode: PRsViewMode;
  onChange: (mode: PRsViewMode) => void;
}> = ({ viewMode, onChange }) => {
  const options: {
    value: PRsViewMode;
    label: string;
    Icon: typeof ViewListIcon;
  }[] = [
    { value: 'list', label: 'List view', Icon: ViewListIcon },
    { value: 'cards', label: 'Card view', Icon: ViewModuleIcon },
  ];

  return (
    <Box
      sx={(t) => ({
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 2,
        border: '1px solid',
        borderColor: t.palette.border.light,
        overflow: 'hidden',
      })}
      role="group"
      aria-label="Toggle view mode"
    >
      {options.map(({ value, label, Icon }) => {
        const isActive = viewMode === value;
        return (
          <Tooltip key={value} title={label} placement="top" arrow>
            <IconButton
              onClick={() => onChange(value)}
              size="small"
              aria-label={label}
              aria-pressed={isActive}
              sx={(t) => ({
                borderRadius: 0,
                padding: '6px 10px',
                color: isActive
                  ? t.palette.text.primary
                  : t.palette.text.tertiary,
                backgroundColor: isActive
                  ? t.palette.surface.light
                  : 'transparent',
                '&:hover': {
                  backgroundColor: t.palette.surface.light,
                  color: t.palette.text.primary,
                },
              })}
            >
              <Icon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
};

const getPrHref = (pr: CommitLog) =>
  `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`;

const PRCard: React.FC<{
  pr: CommitLog;
  sources?: WatchedPRSource[];
}> = ({ pr, sources = [] }) => {
  const { label, color } = prStatusMeta(pr);
  const key = serializePRKey(pr.repository, pr.pullRequestNumber);
  return (
    <Card
      elevation={0}
      sx={(t) => ({
        p: 1,
        backgroundColor: t.palette.background.default,
        backdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: alpha(color, 0.3),
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        boxShadow: `0 2px 8px ${alpha(t.palette.background.default, 0.1)}`,
        '&:hover': {
          backgroundColor: t.palette.surface.elevated,
          borderColor: alpha(color, 0.5),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px -6px ${alpha(t.palette.background.default, 0.6)}`,
        },
      })}
    >
      {/* Row 1: repo + status + star */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ minWidth: 0 }}
        >
          <Avatar
            src={`https://avatars.githubusercontent.com/${pr.repository.split('/')[0]}`}
            sx={{
              width: 20,
              height: 20,
              flexShrink: 0,
              border: '1px solid',
              borderColor: 'border.medium',
            }}
          />
          <Typography
            sx={{
              fontSize: '0.72rem',
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {pr.repository}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ flexShrink: 0 }}
        >
          <Chip
            variant="status"
            label={label}
            size="small"
            sx={{
              color,
              borderColor: alpha(color, 0.3),
              backgroundColor: alpha(color, 0.08),
            }}
          />
          <WatchedSourceBadges sources={sources} />
          <WatchlistButton category="prs" itemKey={key} size="small" />
        </Stack>
      </Box>

      {/* Row 2: title (linkable) */}
      <LinkBox
        href={getPrHref(pr)}
        linkState={{ backLabel: 'Back to Watchlist' }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}
      >
        <Typography
          sx={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          #{pr.pullRequestNumber} {pr.pullRequestTitle}
        </Typography>

        {/* Row 3: footer stats */}
        <Box
          sx={(t) => ({
            mt: 'auto',
            backgroundColor: alpha(t.palette.background.default, 0.2),
            borderRadius: 1.5,
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          })}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar
              src={`https://avatars.githubusercontent.com/${pr.author}`}
              sx={{ width: 18, height: 18 }}
            />
            <Typography
              sx={{
                fontSize: '0.72rem',
                color: 'text.secondary',
              }}
            >
              {pr.author}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: 'diff.additions',
                  fontWeight: 600,
                }}
              >
                +{pr.additions}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: 'text.tertiary',
                }}
              >
                /
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: 'diff.deletions',
                  fontWeight: 600,
                }}
              >
                -{pr.deletions}
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              {parseFloat(pr.score || '0').toFixed(2)}
            </Typography>
          </Stack>
        </Box>
      </LinkBox>
    </Card>
  );
};

const PR_ROWS_OPTIONS_LIST = [10, 25, 50] as const;
const PR_ROWS_OPTIONS_CARDS = [12, 24, 48] as const;

const PRsList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { items, sourcesByKey, isLoading } = useWatchedPRs(itemKeys);
  const prColumns = useMemo(() => buildPrColumns(sourcesByKey), [sourcesByKey]);
  const { isWatched } = useWatchlist('prs');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PrStatusFilter>('all');
  const [viewMode, setViewMode] = useState<PRsViewMode>('list');
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

  const counts = useMemo(() => getPrStatusCounts(items), [items]);

  const filtered = useMemo(() => {
    const result = filterPrs(items, {
      statusFilter,
      searchQuery,
      includeNumber: true,
    });
    setPage(0);
    return result;
  }, [items, statusFilter, searchQuery]);

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
        case 'watch': {
          const key = (pr: CommitLog) =>
            serializePRKey(pr.repository, pr.pullRequestNumber);
          return compareByWatchlist(a, b, key, isWatched) * dir;
        }
        default:
          return 0;
      }
    });
  }, [filtered, sortField, sortOrder, isWatched]);

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
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <FilterButton
            label="All"
            count={counts.all}
            color={STATUS_COLORS.neutral}
            isActive={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <FilterButton
            label="Open"
            count={counts.open}
            color={STATUS_COLORS.open}
            isActive={statusFilter === 'open'}
            onClick={() => setStatusFilter('open')}
          />
          <FilterButton
            label="Merged"
            count={counts.merged}
            color={STATUS_COLORS.merged}
            isActive={statusFilter === 'merged'}
            onClick={() => setStatusFilter('merged')}
          />
          <FilterButton
            label="Closed"
            count={counts.closed}
            color={STATUS_COLORS.closed}
            isActive={statusFilter === 'closed'}
            onClick={() => setStatusFilter('closed')}
          />
        </Box>
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
              {(viewMode === 'cards'
                ? PR_ROWS_OPTIONS_CARDS
                : PR_ROWS_OPTIONS_LIST
              ).map((n) => (
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
            width: '220px',
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
        <Box sx={{ ml: 'auto' }}>
          <PRsViewModeToggle
            viewMode={viewMode}
            onChange={(next) => {
              setViewMode(next);
              setRowsPerPage(
                next === 'cards'
                  ? PR_ROWS_OPTIONS_CARDS[0]
                  : PR_ROWS_OPTIONS_LIST[0],
              );
              setPage(0);
            }}
          />
        </Box>
      </Box>

      {/* Content */}
      {viewMode === 'list' ? (
        <DataTable<CommitLog, PrSortKey>
          columns={prColumns}
          rows={paged}
          getRowKey={(pr) =>
            serializePRKey(pr.repository, pr.pullRequestNumber)
          }
          getRowHref={getPrHref}
          linkState={{ backLabel: 'Back to Watchlist' }}
          minWidth="750px"
          stickyHeader
          isLoading={isLoading && items.length === 0}
          emptyLabel="No watched pull requests found."
          sort={{
            field: sortField,
            order: sortOrder,
            onChange: handleSort,
          }}
        />
      ) : (
        <Box
          sx={{
            p: 2,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            ...scrollbarSx,
          }}
        >
          {isLoading && paged.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : paged.length === 0 ? (
            <Typography
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                py: 4,
                fontSize: '0.85rem',
              }}
            >
              No watched pull requests found.
            </Typography>
          ) : (
            <Grid container spacing={2} alignItems="stretch">
              {paged.map((pr) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={serializePRKey(pr.repository, pr.pullRequestNumber)}
                  sx={{ display: 'flex' }}
                >
                  <Box sx={{ width: '100%' }}>
                    <PRCard
                      pr={pr}
                      sources={sourcesByKey.get(
                        serializePRKey(pr.repository, pr.pullRequestNumber),
                      )}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
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

// ---------------------------------------------------------------------------
// IssuesList — mirrors PRsList shell (toolbar + DataTable + card grid +
// pagination) but for issues authored by every starred miner. Source: mirror
// API `/miners/{githubId}/issues`, fanned out via `useMinersIssues`.
// ---------------------------------------------------------------------------

type IssueStatusFilter = 'all' | 'open' | 'resolved' | 'closed';
type IssueSortKey = 'issue' | 'title' | 'repo' | 'author' | 'date';

const ISSUE_STATUS_FILTERS: readonly IssueStatusFilter[] = [
  'all',
  'open',
  'resolved',
  'closed',
];
/** UI labels — `resolved` is "Solved" to match MinerOpenDiscoveryIssuesByRepo. */
const ISSUE_FILTER_LABELS: Record<IssueStatusFilter, string> = {
  all: 'All',
  open: 'Open',
  resolved: 'Solved',
  closed: 'Closed',
};
const ISSUE_ROWS_OPTIONS = [10, 25, 50] as const;
const issueCellSx = { py: 1.5 } as const;

// Same buckets as MinerOpenDiscoveryIssuesByRepo (`isOpenIssue` / `isSolvedIssue` /
// `isClosedIssue`): open = not closed; solved = closed + linked PR; else closed.
const minerWatchlistIssueClosed = (issue: MinerIssue): boolean => {
  if ((issue.state ?? '').toUpperCase() === 'CLOSED') return true;
  const ca = issue.closed_at;
  return ca != null && String(ca).trim() !== '';
};

const minerWatchlistIssueLinkedPr = (issue: MinerIssue): number | null => {
  const n = issue.solving_pr?.pr_number ?? issue.solved_by_pr;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

const issueState = (issue: MinerIssue): Exclude<IssueStatusFilter, 'all'> => {
  if (!minerWatchlistIssueClosed(issue)) return 'open';
  if (minerWatchlistIssueLinkedPr(issue) != null) return 'resolved';
  return 'closed';
};

const issueStatusMeta = (issue: MinerIssue) => {
  const s = issueState(issue);
  if (s === 'resolved')
    return { label: 'SOLVED', color: STATUS_COLORS.merged };
  if (s === 'closed') return { label: 'CLOSED', color: STATUS_COLORS.closed };
  return { label: 'OPEN', color: STATUS_COLORS.open };
};

const issueDate = (issue: MinerIssue): string =>
  issue.updated_at || issue.closed_at || issue.created_at || '';

const issueKey = (issue: MinerIssue) =>
  `${issue.repo_full_name}#${issue.issue_number}`;

const parseIssueKey = (
  key: string,
): { repoFullName: string; issueNumber: number } | null => {
  const idx = key.lastIndexOf('#');
  if (idx <= 0 || idx >= key.length - 1) return null;
  const repoFullName = key.slice(0, idx);
  const issueNumber = Number(key.slice(idx + 1));
  if (!Number.isFinite(issueNumber)) return null;
  return { repoFullName, issueNumber };
};

const issueStatusColor = (s: IssueStatusFilter): string => {
  switch (s) {
    case 'all':
      return STATUS_COLORS.neutral;
    case 'open':
      return STATUS_COLORS.open;
    case 'resolved':
      return STATUS_COLORS.merged;
    case 'closed':
      return STATUS_COLORS.closed;
  }
};

const filterIssues = (
  items: MinerIssue[],
  opts: { statusFilter: IssueStatusFilter; searchQuery: string },
): MinerIssue[] => {
  const q = opts.searchQuery.trim().toLowerCase();
  return items.filter((i) => {
    if (opts.statusFilter !== 'all' && issueState(i) !== opts.statusFilter)
      return false;
    if (!q) return true;
    return (
      (i.title || '').toLowerCase().includes(q) ||
      i.repo_full_name.toLowerCase().includes(q) ||
      String(i.issue_number).includes(q)
    );
  });
};

const getIssueCounts = (items: MinerIssue[]) => {
  const c: Record<IssueStatusFilter, number> = {
    all: items.length,
    open: 0,
    resolved: 0,
    closed: 0,
  };
  items.forEach((i) => (c[issueState(i)] += 1));
  return c;
};

const buildIssueColumns = (
  sourcesByKey: Map<string, WatchedPRSource[]>,
): DataTableColumn<MinerIssue, IssueSortKey>[] => [
  {
    key: 'issue',
    header: 'Issue',
    width: '70px',
    sortKey: 'issue',
    cellSx: issueCellSx,
    renderCell: (i) => (
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
        #{i.issue_number}
      </Typography>
    ),
  },
  {
    key: 'title',
    header: 'Title',
    width: '34%',
    sortKey: 'title',
    cellSx: issueCellSx,
    renderCell: (i) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {i.title || '—'}
      </Typography>
    ),
  },
  {
    key: 'repo',
    header: 'Repository',
    width: '24%',
    sortKey: 'repo',
    cellSx: issueCellSx,
    renderCell: (i) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {i.repo_full_name}
      </Typography>
    ),
  },
  {
    key: 'author',
    header: 'Author',
    width: '14%',
    sortKey: 'author',
    cellSx: issueCellSx,
    renderCell: (i) => {
      const login = i.author_login || i.author_github_id;
      if (!login)
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
      return (
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
        >
          <Avatar
            src={`https://avatars.githubusercontent.com/${login}`}
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
            {login}
          </Typography>
        </Box>
      );
    },
  },
  {
    key: 'pr',
    header: 'PR',
    width: '70px',
    align: 'center',
    cellSx: issueCellSx,
    renderCell: (i) => {
      const prNumber = i.solving_pr?.pr_number ?? i.solved_by_pr ?? null;
      if (!prNumber)
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
      return (
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
          #{prNumber}
        </Typography>
      );
    },
  },
  {
    key: 'labels',
    header: 'Labels',
    width: '18%',
    cellSx: issueCellSx,
    renderCell: (i) => {
      const labels = i.labels ?? [];
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
            const known =
              name in LABEL_COLORS
                ? LABEL_COLORS[name as keyof typeof LABEL_COLORS]
                : null;
            return (
              <Chip
                key={l.name}
                label={l.name}
                size="small"
                sx={(t) => ({
                  fontSize: '0.65rem',
                  height: 18,
                  textTransform: 'lowercase',
                  color: known ?? t.palette.text.primary,
                  backgroundColor: alpha(known ?? t.palette.text.primary, 0.12),
                  border: '1px solid',
                  borderColor: alpha(known ?? t.palette.text.primary, 0.3),
                })}
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
    width: '120px',
    align: 'right',
    sortKey: 'date',
    cellSx: issueCellSx,
    renderCell: (i) => {
      const d = issueDate(i);
      return (
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: (t) => alpha(t.palette.text.primary, 0.6),
          }}
        >
          {d ? new Date(d).toLocaleDateString() : '-'}
        </Typography>
      );
    },
  },
  {
    key: 'source',
    header: 'Why',
    width: '92px',
    align: 'center',
    cellSx: issueCellSx,
    renderCell: (i) => (
      <WatchedSourceBadges sources={sourcesByKey.get(issueKey(i)) ?? []} />
    ),
  },
  {
    key: 'watch',
    header: '★',
    width: '52px',
    align: 'center',
    cellSx: { p: 0 },
    renderCell: (i) => (
      <WatchlistButton category="issues" itemKey={issueKey(i)} size="small" />
    ),
  },
];

const getIssueHref = (issue: MinerIssue): string =>
  `https://github.com/${issue.repo_full_name}/issues/${issue.issue_number}`;

const IssueCard: React.FC<{ issue: MinerIssue }> = ({ issue }) => {
  const { label, color } = issueStatusMeta(issue);
  const prNumber = issue.solving_pr?.pr_number ?? issue.solved_by_pr ?? null;
  return (
    <Card
      elevation={0}
      sx={(t) => ({
        p: 1,
        backgroundColor: t.palette.background.default,
        backdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: alpha(color, 0.3),
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        boxShadow: `0 2px 8px ${alpha(t.palette.background.default, 0.1)}`,
        '&:hover': {
          backgroundColor: t.palette.surface.elevated,
          borderColor: alpha(color, 0.5),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px -6px ${alpha(t.palette.background.default, 0.6)}`,
        },
      })}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ minWidth: 0 }}
        >
          <Avatar
            src={`https://avatars.githubusercontent.com/${issue.repo_full_name.split('/')[0]}`}
            sx={{
              width: 20,
              height: 20,
              flexShrink: 0,
              border: '1px solid',
              borderColor: 'border.medium',
            }}
          />
          <Typography
            sx={{
              fontSize: '0.72rem',
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {issue.repo_full_name}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ flexShrink: 0 }}
        >
          <Chip
            variant="status"
            label={label}
            size="small"
            sx={{
              color,
              borderColor: alpha(color, 0.3),
              backgroundColor: alpha(color, 0.08),
            }}
          />
          <WatchlistButton
            category="issues"
            itemKey={issueKey(issue)}
            size="small"
          />
        </Stack>
      </Box>

      <LinkBox
        href={getIssueHref(issue)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}
      >
        <Typography
          sx={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          #{issue.issue_number} {issue.title}
        </Typography>

        <Box
          sx={(t) => ({
            mt: 'auto',
            backgroundColor: alpha(t.palette.background.default, 0.2),
            borderRadius: 1.5,
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          })}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ minWidth: 0 }}
          >
            {issue.author_login && (
              <Avatar
                src={`https://avatars.githubusercontent.com/${issue.author_login}`}
                sx={{ width: 18, height: 18, flexShrink: 0 }}
              />
            )}
            <Typography
              sx={{
                fontSize: '0.72rem',
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {issue.author_login || '—'}
            </Typography>
          </Stack>
          {prNumber ? (
            <Typography
              sx={{
                fontSize: '0.72rem',
                color: 'primary.main',
                fontWeight: 500,
              }}
            >
              PR #{prNumber}
            </Typography>
          ) : (
            <Typography
              sx={{
                fontSize: '0.72rem',
                color: (t) => alpha(t.palette.text.primary, 0.4),
              }}
            >
              No PR
            </Typography>
          )}
        </Box>
      </LinkBox>
    </Card>
  );
};

const IssuesList: React.FC<{ minerIds: string[] }> = ({ minerIds }) => {
  const issueQueries = useMinersIssues(minerIds, minerIds.length > 0);

  const { ids: starredIssueIds } = useWatchlist('issues');
  const { ids: watchedRepoIds } = useWatchlist('repos');
  const starredSet = useMemo(() => new Set(starredIssueIds), [starredIssueIds]);
  const watchedRepoSet = useMemo(
    () => new Set(watchedRepoIds.map((r) => r.toLowerCase())),
    [watchedRepoIds],
  );
  const watchedMinerSet = useMemo(() => new Set(minerIds), [minerIds]);
  const apiBaseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  const storedIssueMetaByKey = useMemo(() => {
    const map = new Map<
      string,
      { state: 'OPEN' | 'CLOSED'; stateReason: string | null; solvedByPr: number | null }
    >();
    starredIssueIds.forEach((key) => {
      const meta = getWatchlistIssueMeta(key);
      if (!meta) return;
      const isSolved = meta.status === 'solved';
      const isClosed = meta.status === 'closed' || isSolved;
      map.set(key, {
        state: isClosed ? 'CLOSED' : 'OPEN',
        stateReason: null,
        solvedByPr: isSolved ? meta.prNumber ?? null : null,
      });
    });
    return map;
  }, [starredIssueIds]);

  const starredParsedKeys = useMemo(
    () =>
      starredIssueIds
        .map((key) => ({ key, parsed: parseIssueKey(key) }))
        .filter(
          (
            entry,
          ): entry is {
            key: string;
            parsed: { repoFullName: string; issueNumber: number };
          } => entry.parsed !== null,
        ),
    [starredIssueIds],
  );
  const starredRepos = useMemo(
    () =>
      Array.from(
        new Set(starredParsedKeys.map((entry) => entry.parsed.repoFullName)),
      ),
    [starredParsedKeys],
  );
  const starredRepoIssueQueries = useQueries({
    queries: starredRepos.map((repoFullName) => ({
      queryKey: ['watchlistRepoIssuesFallback', repoFullName],
      queryFn: async () => {
        const requestUrl = apiBaseUrl
          ? `${apiBaseUrl}/repos/${encodeURIComponent(repoFullName)}/issues`
          : `/repos/${encodeURIComponent(repoFullName)}/issues`;
        const { data } = await axios.get(requestUrl);
        return Array.isArray(data) ? data : [];
      },
      retry: false,
      staleTime: 5 * 60 * 1000,
      enabled: true,
    })),
  });
  const starredIssueMetaByKey = useMemo(() => {
    const map = new Map<
      string,
      { state: 'OPEN' | 'CLOSED'; stateReason: string | null; solvedByPr: number | null }
    >();
    starredRepoIssueQueries.forEach((q) => {
      (q.data ?? []).forEach((issue: unknown) => {
        if (!issue || typeof issue !== 'object') return;
        const entry = issue as {
          repositoryFullName?: string;
          number?: number;
          closedAt?: string | null;
          prNumber?: number | null;
          state_reason?: string | null;
          stateReason?: string | null;
        };
        if (
          typeof entry.repositoryFullName !== 'string' ||
          typeof entry.number !== 'number'
        ) {
          return;
        }
        const isClosed = Boolean(entry.closedAt);
        const rawReason = entry.state_reason ?? entry.stateReason ?? null;
        const stateReason =
          typeof rawReason === 'string' && rawReason.trim() !== ''
            ? rawReason.trim()
            : null;
        const hasLinkedPr = typeof entry.prNumber === 'number';
        map.set(`${entry.repositoryFullName}#${entry.number}`, {
          state: isClosed ? 'CLOSED' : 'OPEN',
          stateReason,
          solvedByPr: hasLinkedPr ? entry.prNumber ?? null : null,
        });
      });
    });
    return map;
  }, [starredRepoIssueQueries]);

  // Flatten + dedupe issues across all watched miners.
  const mirroredItems = useMemo<MinerIssue[]>(() => {
    const map = new Map<string, MinerIssue>();
    issueQueries.forEach((q) => {
      (q.data ?? []).forEach((issue) => {
        const key = issueKey(issue);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, issue);
          return;
        }
        // Prefer the most-recently-updated record.
        if (issueDate(issue) > issueDate(existing)) map.set(key, issue);
      });
    });
    return Array.from(map.values());
  }, [issueQueries]);

  const mirroredIssueKeys = useMemo(() => {
    const keys = new Set<string>();
    mirroredItems.forEach((issue) => keys.add(issueKey(issue)));
    return keys;
  }, [mirroredItems]);

  // Starred issues should always render, even when miner mirror feeds
  // do not contain them. Build a minimal row from the serialized key.
  const starredFallbackItems = useMemo<MinerIssue[]>(
    () =>
      starredIssueIds
        .filter((key) => !mirroredIssueKeys.has(key))
        .map((key) => {
          const parsed = parseIssueKey(key);
          if (!parsed) return null;
          const meta = storedIssueMetaByKey.get(key) ?? starredIssueMetaByKey.get(key);
          return {
            repo_full_name: parsed.repoFullName,
            issue_number: parsed.issueNumber,
            title: `${parsed.repoFullName} #${parsed.issueNumber}`,
            state: meta?.state ?? 'OPEN',
            state_reason: meta?.stateReason ?? null,
            author_github_id: null,
            author_login: null,
            created_at: null,
            closed_at: meta?.state === 'CLOSED' ? '' : null,
            updated_at: null,
            solved_by_pr: meta?.solvedByPr ?? null,
            labels: [],
          } as MinerIssue;
        })
        .filter((issue): issue is MinerIssue => issue !== null),
    [starredIssueIds, mirroredIssueKeys, starredIssueMetaByKey],
  );

  const items = useMemo<MinerIssue[]>(() => {
    const map = new Map<string, MinerIssue>();
    [...mirroredItems, ...starredFallbackItems].forEach((issue) => {
      const key = issueKey(issue);
      const existing = map.get(key);
      if (!existing || issueDate(issue) > issueDate(existing)) {
        map.set(key, issue);
      }
    });
    return Array.from(map.values());
  }, [mirroredItems, starredFallbackItems]);

  const sourcesByKey = useMemo(() => {
    const map = new Map<string, WatchedPRSource[]>();
    items.forEach((issue) => {
      const key = issueKey(issue);
      const sources: WatchedPRSource[] = [];
      if (starredSet.has(key)) sources.push('starred');
      if (issue.author_github_id && watchedMinerSet.has(issue.author_github_id)) {
        sources.push('miner');
      }
      if (watchedRepoSet.has(issue.repo_full_name.toLowerCase())) {
        sources.push('repo');
      }
      map.set(key, sources);
    });
    return map;
  }, [items, starredSet, watchedMinerSet, watchedRepoSet]);

  const issueColumns = useMemo(
    () => buildIssueColumns(sourcesByKey),
    [sourcesByKey],
  );

  const isLoading =
    issueQueries.some((q) => q.isLoading) ||
    starredRepoIssueQueries.some((q) => q.isLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>('all');
  const [viewMode, setViewMode] = useState<PRsViewMode>('list');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<IssueSortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: IssueSortKey) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(0);
  };

  const counts = useMemo(() => getIssueCounts(items), [items]);

  const filtered = useMemo(
    () => filterIssues(items, { statusFilter, searchQuery }),
    [items, statusFilter, searchQuery],
  );

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchQuery]);

  const sorted = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const cmpStr = (a = '', b = '') => a.localeCompare(b) * dir;
    const cmpNum = (a = 0, b = 0) => (a - b) * dir;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case 'issue':
          return cmpNum(a.issue_number, b.issue_number);
        case 'title':
          return cmpStr(a.title, b.title);
        case 'repo':
          return cmpStr(a.repo_full_name, b.repo_full_name);
        case 'author':
          return cmpStr(a.author_login ?? '', b.author_login ?? '');
        case 'date':
          return cmpStr(issueDate(a), issueDate(b));
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
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'border.light',
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {ISSUE_STATUS_FILTERS.map((s) => (
            <FilterButton
              key={s}
              label={ISSUE_FILTER_LABELS[s]}
              count={counts[s]}
              color={issueStatusColor(s)}
              isActive={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </Box>
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
              {ISSUE_ROWS_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </FormControl>
        <TextField
          placeholder="Search issues..."
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
            width: '220px',
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
        <Box sx={{ ml: 'auto' }}>
          <PRsViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        </Box>
      </Box>

      {viewMode === 'list' ? (
        <DataTable<MinerIssue, IssueSortKey>
          columns={issueColumns}
          rows={paged}
          getRowKey={(i) => issueKey(i)}
          getRowHref={getIssueHref}
          minWidth="750px"
          stickyHeader
          isLoading={isLoading && items.length === 0}
          emptyLabel="No issues found for the watched miners."
          sort={{
            field: sortField,
            order: sortOrder,
            onChange: handleSort,
          }}
        />
      ) : (
        <Box sx={{ p: 2, overflowY: 'auto', ...scrollbarSx }}>
          {isLoading && paged.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : paged.length === 0 ? (
            <Typography
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                py: 4,
                fontSize: '0.85rem',
              }}
            >
              No issues found for the watched miners.
            </Typography>
          ) : (
            <Grid container spacing={2} alignItems="stretch">
              {paged.map((i) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={issueKey(i)}
                  sx={{ display: 'flex' }}
                >
                  <Box sx={{ width: '100%' }}>
                    <IssueCard issue={i} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
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

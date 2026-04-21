import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Collapse,
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ReactECharts from 'echarts-for-react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopMinersTable, SEO, WatchlistButton } from '../components';
import {
  DataTable,
  type DataTableColumn,
} from '../components/common/DataTable';
import { LinkBox } from '../components/common/linkBehavior';
import { useAllMiners, useAllPrs, useReposAndWeights, useIssues } from '../api';
import type { Repository } from '../api/models/Dashboard';
import { mapAllMinersToStats } from '../utils/minerMapper';
import {
  useWatchlist,
  useWatchlistCounts,
  serializePRKey,
  type WatchlistCategory,
} from '../hooks/useWatchlist';
import { isMergedPr, isClosedUnmergedPr } from '../utils/prStatus';
import { getIssueStatusMeta } from '../utils/issueStatus';
import { formatTokenAmount } from '../utils/format';
import {
  CHART_COLORS,
  STATUS_COLORS,
  TEXT_OPACITY,
  UI_COLORS,
  scrollbarSx,
} from '../theme';
import { getRepositoryOwnerAvatarBackground } from '../components/leaderboard/types';
import FilterButton from '../components/FilterButton';

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
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 1.5 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
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
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                fontSize: '0.83rem',
                fontWeight: 500,
                textTransform: 'none',
                color: 'text.secondary',
                '&.Mui-selected': { color: 'primary.main' },
              },
            }}
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
                maxWidth: 480,
                color: (t) => alpha(t.palette.text.primary, 0.5),
              }}
            >
              {discovery.hint} Pinned items appear here across reloads and tabs.
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
        ) : (
          <PRsList itemKeys={ids} />
        )}
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          Clear all {count} pinned {count === 1 ? noun.single : noun.plural}?
        </DialogTitle>
        <DialogActions>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClear}
            color="error"
            sx={{ textTransform: 'none' }}
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

const isRepoActive = (repo: Repository): boolean => !repo.inactiveAt;

type RepoStatusFilter = 'all' | 'active' | 'inactive';

type RepoSortKey = 'name' | 'weight' | 'status';

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

const repoColumns: DataTableColumn<Repository, RepoSortKey>[] = [
  {
    key: 'name',
    header: 'Repository',
    width: '50%',
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
    width: '120px',
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

const RepoCard: React.FC<{ repo: Repository }> = ({ repo }) => {
  const { label, color } = repoStatusMeta(repo);
  const owner = repo.fullName.split('/')[0] || '';
  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        p: 1,
        backgroundColor: theme.palette.background.default,
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
        boxShadow: `0 2px 8px ${alpha(theme.palette.background.default, 0.1)}`,
        '&:hover': {
          backgroundColor: theme.palette.surface.elevated,
          borderColor: alpha(color, 0.5),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px -6px ${alpha(theme.palette.background.default, 0.6)}`,
        },
      })}
    >
      {/* Row 1: owner avatar + status + star */}
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
            src={`https://avatars.githubusercontent.com/${owner}`}
            sx={{
              width: 20,
              height: 20,
              flexShrink: 0,
              border: '1px solid',
              borderColor: 'border.medium',
              backgroundColor: getRepositoryOwnerAvatarBackground(owner),
            }}
          />
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {owner}
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
            category="repos"
            itemKey={repo.fullName}
            size="small"
          />
        </Stack>
      </Box>

      {/* Row 2: full name (linkable) */}
      <LinkBox
        href={getRepoHref(repo)}
        linkState={{ backLabel: 'Back to Watchlist' }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}
      >
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
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
          {repo.fullName}
        </Typography>

        {/* Row 3: footer stats */}
        <Box
          sx={(theme) => ({
            mt: 'auto',
            backgroundColor: alpha(theme.palette.background.default, 0.2),
            borderRadius: 1.5,
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          })}
        >
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.65rem',
              color: 'text.tertiary',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Weight
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            {parseFloat(String(repo.weight)).toFixed(2)}
          </Typography>
        </Box>
      </LinkBox>
    </Card>
  );
};

const REPO_ROWS_OPTIONS = [10, 25, 50] as const;

const ReposList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { data: repos } = useReposAndWeights();
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

  const items = useMemo(() => {
    if (!repos) return [];
    const set = new Set(itemKeys.map((k) => k.toLowerCase()));
    return repos.filter((r) => set.has(r.fullName.toLowerCase()));
  }, [repos, itemKeys]);

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
        default:
          return 0;
      }
    });
  }, [filtered, sortField, sortOrder]);

  const paged = useMemo(
    () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sorted, page, rowsPerPage],
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
        <DataTable<Repository, RepoSortKey>
          columns={repoColumns}
          rows={paged}
          getRowKey={(repo) => repo.fullName}
          getRowHref={getRepoHref}
          linkState={{ backLabel: 'Back to Watchlist' }}
          minWidth="600px"
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
                    <RepoCard repo={repo} />
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

const PRsList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { data: allPrs } = useAllPrs();
  const items = useMemo(() => {
    if (!allPrs) return [];
    const set = new Set(itemKeys);
    return allPrs.filter((pr) =>
      set.has(serializePRKey(pr.repository, pr.pullRequestNumber)),
    );
  }, [allPrs, itemKeys]);

  return (
    <Stack spacing={0.5} sx={{ width: '100%' }}>
      {items.map((pr) => {
        const key = serializePRKey(pr.repository, pr.pullRequestNumber);
        const merged = isMergedPr(pr);
        const closed = isClosedUnmergedPr(pr);
        const statusLabel = merged ? 'Merged' : closed ? 'Closed' : 'Open';
        const statusColor = merged
          ? STATUS_COLORS.merged
          : closed
            ? STATUS_COLORS.closed
            : STATUS_COLORS.open;
        return (
          <WatchedItemRow
            key={key}
            href={`/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`}
            primary={`#${pr.pullRequestNumber} ${pr.pullRequestTitle}`}
            secondary={`${pr.repository} · ${pr.author}`}
            actions={
              <>
                <StatusPill
                  label={statusLabel}
                  color={statusColor}
                  background={alpha(statusColor, 0.12)}
                />
                <Typography
                  sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                >
                  {parseFloat(pr.score || '0').toFixed(2)}
                </Typography>
                <WatchlistButton category="prs" itemKey={key} />
              </>
            }
          />
        );
      })}
    </Stack>
  );
};

export default WatchlistPage;

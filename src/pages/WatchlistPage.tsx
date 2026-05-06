import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Collapse,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Popover,
  Switch,
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
  Portal,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ReactECharts from 'echarts-for-react';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Page } from '../components/layout';
import { useTwitterStickySidebar } from '../hooks/useTwitterStickySidebar';
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
import type { IssueBounty } from '../api/models/Issues';
import { usePrices } from '../hooks/usePrices';
import { BountyCard } from '../components/issues/BountyCard';
import { mapAllMinersToStats } from '../utils/minerMapper';
import {
  useWatchlist,
  useWatchlistCounts,
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
import { formatDate, formatTokenAmount } from '../utils/format';
import { compareByWatchlist } from '../utils/watchlistSort';
import { getRepositoryOwnerAvatarSrc } from '../utils/avatar';
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

/**
 * Embeddable watchlist content — renders the description, sub-tabs,
 * tab content, and clear-confirmation dialog WITHOUT a Page wrapper
 * or sidebar. Used by the unified MinersPage timeline.
 */
const VIEW_STORAGE_KEY_WATCHLIST = 'watchlist:viewMode';

const useWatchlistViewMode = () => {
  const [mode, setMode] = useState<'list' | 'cards'>(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY_WATCHLIST);
      return stored === 'cards' || stored === 'list' ? stored : 'cards';
    } catch {
      return 'cards';
    }
  });

  const setStoredMode = useCallback((newMode: 'list' | 'cards') => {
    setMode(newMode);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY_WATCHLIST, newMode);
    } catch {
      // ignore
    }
  }, []);

  return [mode, setStoredMode] as const;
};

export const WatchlistContent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = tabFromParam(searchParams.get('tab'));

  const counts = useWatchlistCounts();
  const { ids, count, clear } = useWatchlist(activeTab);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { ids: minerIds } = useWatchlist('miners');

  const tabHasContent =
    activeTab === 'prs'
      ? counts.prs + counts.miners + counts.repos > 0
      : activeTab === 'issues'
        ? counts.miners > 0
        : count > 0;
  const isEmpty = !tabHasContent;
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
    <>
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'border.light',
          position: 'sticky',
          top: 64,
          zIndex: 50,
          backgroundColor: (t) => alpha(t.palette.background.default, 0.85),
          backdropFilter: 'blur(12px)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={(t) => ({
            minHeight: 52,
            '& .MuiTab-root': {
              minHeight: 52,
              fontSize: '0.95rem',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: '0.01em',
              color: alpha(t.palette.text.primary, 0.45),
              transition: 'color 0.2s, background-color 0.2s',
              '&:hover': {
                backgroundColor: alpha(t.palette.text.primary, 0.04),
                color: alpha(t.palette.text.primary, 0.7),
              },
              '&.Mui-selected': {
                color: t.palette.text.primary,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: t.palette.primary.main,
              height: 3,
              borderRadius: '3px 3px 0 0',
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
      ) : activeTab === 'issues' ? (
        <IssuesList minerIds={minerIds} />
      ) : (
        <PRsList itemKeys={ids} />
      )}

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
          Clear all {count} pinned {count === 1 ? noun.single : noun.plural}?
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
    </>
  );
};

const WatchlistPage: React.FC = () => {
  const { ids: minerIds } = useWatchlist('miners');
  const { data: allMinersData } = useAllMiners();

  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const sidebarWidth =
    isMobile || isTablet ? '100%' : isLargeScreen ? '340px' : '300px';

  const stickySidebarRef = useTwitterStickySidebar();

  const minerStats = useMemo(() => {
    const watchedSet = new Set(minerIds);
    return mapAllMinersToStats(allMinersData ?? [])
      .filter((m) => watchedSet.has(m.githubId))
      .map((m) => ({
        ...m,
        isEligible: Boolean(m.ossIsEligible || m.discoveriesIsEligible),
      }));
  }, [allMinersData, minerIds]);

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
          flexDirection: isLargeScreen ? 'row' : 'column',
          alignItems: isLargeScreen ? 'flex-start' : 'stretch',
          gap: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 1.5 },
            minWidth: 0,
            pr: isLargeScreen ? 1 : 0,
            // Prevent the sidebar from driving page scroll when main content
            // is short — the main column always fills at least the viewport.
            minHeight: isLargeScreen ? 'calc(100vh - 88px)' : 'auto',
          }}
        >
          <WatchlistContent />
        </Box>

        <Box
          ref={isLargeScreen ? stickySidebarRef : undefined}
          sx={{
            width: isLargeScreen ? sidebarWidth : '100%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            position: isLargeScreen ? 'sticky' : 'static',
            top: isLargeScreen ? 88 : 'auto',
            // Cap sidebar height to viewport so it doesn't push the page
            // taller than the main content. The twitter-style sticky hook
            // handles the scroll-tracking within this constraint.
            ...(isLargeScreen && {
              maxHeight: 'calc(100vh - 88px)',
              overflowY: 'auto',
              // Hide the scrollbar visually (no visible scrollbar on right)
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }),
          }}
        >
          <ActivitySidebarCards
            miners={minerStats}
            defaultFilter="all"
            insertAfterFirstCard={
              <Box
                id="tabs-options-portal"
                sx={{
                  display: 'none',
                  '@media (min-width: 1536px)': {
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'border.light',
                    backgroundColor: 'background.default',
                  },
                }}
              />
            }
          />
        </Box>
      </Box>
    </Page>
  );
};

/* ─── OptionsLabel: section header inside popovers ─── */
const OptionsLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Typography
    sx={{
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.65rem',
      fontWeight: 600,
      color: 'text.secondary',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      mb: 1,
    }}
  >
    {children}
  </Typography>
);

/* ─── WatchlistPortal: sidebar panel on xl, popover button otherwise ─── */
const WatchlistPortal: React.FC<WatchlistOptionsButtonProps> = (props) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));

  useEffect(() => {
    setTarget(document.getElementById('tabs-options-portal'));
  }, []);

  if (target && isLargeScreen) {
    return (
      <Portal container={target}>
        <WatchlistOptionsSidebarPanel {...props} />
      </Portal>
    );
  }

  return (
    <Box
      sx={{
        p: 1.5,
        display: 'flex',
        justifyContent: 'flex-end',
        borderBottom: '1px solid',
        borderColor: 'border.light',
      }}
    >
      <WatchlistOptionsButton {...props} />
    </Box>
  );
};

/* ─── WatchlistOptionsSidebarPanel: expanded controls for the sidebar ─── */
const WatchlistOptionsSidebarPanel: React.FC<
  Omit<WatchlistOptionsButtonProps, 'hasActiveFilter'> & {
    hasActiveFilter: boolean;
  }
> = (props) => {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        sx={(t) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: 0,
          background: 'none',
          cursor: 'pointer',
          p: 0,
          color: t.palette.text.primary,
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <TuneOutlinedIcon
            sx={{ fontSize: '1rem', color: 'text.secondary' }}
          />
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Filters
          </Typography>
          {props.hasActiveFilter && (
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'status.info',
              }}
            />
          )}
        </Box>
        <KeyboardArrowDownIcon
          sx={{
            fontSize: '1.1rem',
            color: 'text.secondary',
            transform: open ? 'rotate(-180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </Box>
      <Collapse in={open}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <WatchlistOptionsSidebarPanelContent {...props} />
        </Box>
      </Collapse>
    </Box>
  );
};

const WatchlistOptionsSidebarPanelContent: React.FC<
  Omit<WatchlistOptionsButtonProps, 'hasActiveFilter'>
> = ({
  filterContent,
  extraContent,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  viewModeToggle,
}) => (
  <>
    {/* Filter */}
    <Box>
      <OptionsLabel>Filter</OptionsLabel>
      {filterContent}
    </Box>

    {/* Search */}
    <Box>
      <OptionsLabel>Search</OptionsLabel>
      <TextField
        placeholder={searchPlaceholder}
        size="small"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.tertiary', fontSize: '1rem' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          width: '100%',
          '& .MuiOutlinedInput-root': {
            color: 'text.primary',
            backgroundColor: 'background.default',
            fontSize: '0.8rem',
            height: '34px',
            borderRadius: 2,
            '& fieldset': { borderColor: 'border.light' },
            '&:hover fieldset': { borderColor: 'border.medium' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
          },
        }}
      />
    </Box>

    {/* View mode */}
    <Box>
      <OptionsLabel>View</OptionsLabel>
      {viewModeToggle}
    </Box>

    {/* Extra content (e.g. chart controls) */}
    {extraContent}
  </>
);

/* ─── WatchlistOptionsButton: reusable compact popover for all watchlist list toolbars ─── */
interface WatchlistOptionsButtonProps {
  filterContent: React.ReactNode;
  extraContent?: React.ReactNode;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (v: string) => void;
  viewMode: string;
  onViewModeChange: (v: any) => void;
  viewModeToggle: React.ReactNode;
  hasActiveFilter: boolean;
}

const WatchlistOptionsButton: React.FC<WatchlistOptionsButtonProps> = ({
  filterContent,
  extraContent,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  viewModeToggle,
  hasActiveFilter,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Options" arrow>
        <Box
          component="button"
          type="button"
          onClick={(e) =>
            setAnchorEl((prev) => (prev ? null : e.currentTarget))
          }
          sx={(t) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            minHeight: 32,
            borderRadius: 2,
            border: `1px solid ${t.palette.border.light}`,
            backgroundColor: open
              ? alpha(t.palette.text.primary, 0.06)
              : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              backgroundColor: alpha(t.palette.text.primary, 0.04),
              borderColor: t.palette.border.medium,
            },
          })}
        >
          <TuneOutlinedIcon
            sx={{ fontSize: '1rem', color: 'text.secondary' }}
          />
          <Typography
            component="span"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'text.secondary',
            }}
          >
            Options
          </Typography>
          {hasActiveFilter && (
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'status.info',
              }}
            />
          )}
        </Box>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: (t) => ({
              mt: 1,
              p: 2.5,
              minWidth: 280,
              borderRadius: 3,
              border: `1px solid ${t.palette.border.light}`,
              backgroundColor: t.palette.background.default,
              backgroundImage: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }),
          },
        }}
      >
        {/* Filter */}
        <Box>
          <OptionsLabel>Filter</OptionsLabel>
          {filterContent}
        </Box>

        {/* Search */}
        <Box>
          <OptionsLabel>Search</OptionsLabel>
          <TextField
            placeholder={searchPlaceholder}
            size="small"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ color: 'text.tertiary', fontSize: '1rem' }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              width: '100%',
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

        {/* View mode */}
        <Box>
          <OptionsLabel>View</OptionsLabel>
          {viewModeToggle}
        </Box>

        {/* Extra content (e.g. chart controls) */}
        {extraContent}
      </Popover>
    </>
  );
};

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
          src={getRepositoryOwnerAvatarSrc(repo.fullName.split('/')[0])}
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
          src={getRepositoryOwnerAvatarSrc(owner)}
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

const ROWS_PER_PAGE = 50;

const ReposList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { data: repos } = useReposAndWeights();
  const { data: allPrs } = useAllPrs();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RepoStatusFilter>('all');
  const [viewMode, setViewMode] = useWatchlistViewMode();
  const [showChart, setShowChart] = useState(false);
  const [useLogScale, setUseLogScale] = useState(false);
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [sortField, setSortField] = useState<RepoSortKey>('weight');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchQuery, sortField, sortOrder, viewMode]);

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
    () => sorted.slice(0, (page + 1) * ROWS_PER_PAGE),
    [sorted, page],
  );

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setPage((p) => p + 1);
            setIsLoadingMore(false);
          }, 400);
        }
      },
      { root: null, rootMargin: '0px 0px 400px 0px', threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [page, filtered.length]);

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
      <WatchlistPortal
        filterContent={
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
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
        }
        extraContent={
          <>
            <Box>
              <OptionsLabel>Chart</OptionsLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          '& .MuiSwitch-track': {
                            backgroundColor: 'border.medium',
                          },
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
              </Box>
            </Box>
          </>
        }
        searchValue={searchQuery}
        searchPlaceholder="Search repositories..."
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewModeToggle={
          <ReposViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        }
        hasActiveFilter={statusFilter !== 'all'}
      />

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
      {filtered.length > (page + 1) * ROWS_PER_PAGE && (
        <Box
          ref={observerTarget}
          sx={{
            height: 60,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isLoadingMore && (
            <>
              <CircularProgress size={20} sx={{ color: 'text.secondary' }} />
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.85rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  ml: 1.5,
                }}
              >
                Loading more...
              </Typography>
            </>
          )}
        </Box>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// BountiesList — mirrors PRsList shell (toolbar + DataTable + card grid +
// load-more sentinel) for watched bounties. Reuses the shared `BountyCard`
// for card view so the watchlist matches the standalone /bounties page.
// ---------------------------------------------------------------------------

type BountyStatusFilter = 'all' | 'available' | 'pending' | 'history';
type BountySortKey = 'issue' | 'repo' | 'bounty' | 'status' | 'date';

const BOUNTY_STATUS_FILTERS: readonly BountyStatusFilter[] = [
  'all',
  'available',
  'pending',
  'history',
];

const bountyKey = (issue: IssueBounty) => String(issue.id);

const getBountyHref = (issue: IssueBounty) =>
  `/bounties/details?id=${issue.id}`;

const bountyDate = (issue: IssueBounty): string =>
  issue.completedAt ||
  issue.closedAt ||
  issue.updatedAt ||
  issue.createdAt ||
  '';

// Group raw API status into the filter buckets used on the standalone
// /bounties page so this tab reads consistently across the app.
const bountyStatusGroup = (
  issue: IssueBounty,
): Exclude<BountyStatusFilter, 'all'> => {
  if (issue.status === 'active') return 'available';
  if (issue.status === 'registered') return 'pending';
  return 'history';
};

const bountyStatusColor = (s: BountyStatusFilter): string => {
  switch (s) {
    case 'all':
      return STATUS_COLORS.neutral;
    case 'available':
      return STATUS_COLORS.success;
    case 'pending':
      return STATUS_COLORS.warning;
    case 'history':
      return STATUS_COLORS.merged;
  }
};

const filterBounties = (
  items: IssueBounty[],
  opts: { statusFilter: BountyStatusFilter; searchQuery: string },
): IssueBounty[] => {
  const q = opts.searchQuery.trim().toLowerCase();
  return items.filter((i) => {
    if (
      opts.statusFilter !== 'all' &&
      bountyStatusGroup(i) !== opts.statusFilter
    )
      return false;
    if (!q) return true;
    return (
      i.repositoryFullName.toLowerCase().includes(q) ||
      (i.title || '').toLowerCase().includes(q) ||
      String(i.issueNumber).includes(q)
    );
  });
};

const getBountyCounts = (items: IssueBounty[]) => {
  const c: Record<BountyStatusFilter, number> = {
    all: items.length,
    available: 0,
    pending: 0,
    history: 0,
  };
  items.forEach((i) => (c[bountyStatusGroup(i)] += 1));
  return c;
};

const bountyCellSx = { py: 1.5 } as const;

const buildBountyColumns = (): DataTableColumn<
  IssueBounty,
  BountySortKey
>[] => [
  {
    key: 'issue',
    header: 'Issue',
    width: '90px',
    sortKey: 'issue',
    cellSx: bountyCellSx,
    renderCell: (i) => (
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
        #{i.issueNumber}
      </Typography>
    ),
  },
  {
    key: 'title',
    header: 'Title',
    width: '32%',
    cellSx: bountyCellSx,
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
    cellSx: bountyCellSx,
    renderCell: (i) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Avatar
          src={getRepositoryOwnerAvatarSrc(i.repositoryFullName.split('/')[0])}
          sx={{ width: 20, height: 20, flexShrink: 0 }}
        />
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {i.repositoryFullName}
        </Typography>
      </Box>
    ),
  },
  {
    key: 'bounty',
    header: 'Bounty',
    width: '130px',
    align: 'right',
    sortKey: 'bounty',
    cellSx: bountyCellSx,
    renderCell: (i) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'status.success',
        }}
      >
        {formatTokenAmount(i.targetBounty || i.bountyAmount)} ل
      </Typography>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '110px',
    align: 'center',
    sortKey: 'status',
    cellSx: bountyCellSx,
    renderCell: (i) => {
      const meta = getIssueStatusMeta(i.status);
      return (
        <Chip
          variant="status"
          label={meta.text}
          sx={{ color: meta.color, borderColor: meta.color }}
        />
      );
    },
  },
  {
    key: 'date',
    header: 'Updated',
    width: '120px',
    sortKey: 'date',
    cellSx: bountyCellSx,
    renderCell: (i) => (
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
        {formatDate(bountyDate(i))}
      </Typography>
    ),
  },
  {
    key: 'watch',
    header: '★',
    width: '52px',
    align: 'center',
    cellSx: { p: 0 },
    renderCell: (i) => (
      <WatchlistButton
        category="bounties"
        itemKey={bountyKey(i)}
        size="small"
      />
    ),
  },
];

const BountiesList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { data: allIssues, isLoading } = useIssues();
  const { taoPrice, alphaPrice } = usePrices();
  const bountyColumns = useMemo(() => buildBountyColumns(), []);

  const items = useMemo<IssueBounty[]>(() => {
    if (!allIssues) return [];
    // Stored keys and issue ids are compared as strings to avoid any
    // numeric coercion drift if issue ids ever become composite.
    const set = new Set(itemKeys);
    return allIssues.filter((issue) => set.has(String(issue.id)));
  }, [allIssues, itemKeys]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BountyStatusFilter>('all');
  const [viewMode, setViewMode] = useWatchlistViewMode();
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [sortField, setSortField] = useState<BountySortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchQuery, sortField, sortOrder, viewMode]);

  const handleSort = (field: BountySortKey) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'repo' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const counts = useMemo(() => getBountyCounts(items), [items]);

  const filtered = useMemo(
    () => filterBounties(items, { statusFilter, searchQuery }),
    [items, statusFilter, searchQuery],
  );

  const sorted = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const cmpStr = (a = '', b = '') => a.localeCompare(b) * dir;
    const cmpNum = (a = 0, b = 0) => (a - b) * dir;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case 'issue':
          return cmpNum(a.issueNumber, b.issueNumber);
        case 'repo':
          return cmpStr(a.repositoryFullName, b.repositoryFullName);
        case 'bounty':
          return cmpNum(
            parseFloat(a.targetBounty || a.bountyAmount || '0'),
            parseFloat(b.targetBounty || b.bountyAmount || '0'),
          );
        case 'status':
          return cmpStr(a.status, b.status);
        case 'date':
          return cmpStr(bountyDate(a), bountyDate(b));
        default:
          return 0;
      }
    });
  }, [filtered, sortField, sortOrder]);

  const paged = useMemo(
    () => sorted.slice(0, (page + 1) * ROWS_PER_PAGE),
    [sorted, page],
  );

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setPage((p) => p + 1);
            setIsLoadingMore(false);
          }, 400);
        }
      },
      { root: null, rootMargin: '0px 0px 400px 0px', threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [page, filtered.length]);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <WatchlistPortal
        filterContent={
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {BOUNTY_STATUS_FILTERS.map((s) => (
              <FilterButton
                key={s}
                label={s[0].toUpperCase() + s.slice(1)}
                count={counts[s]}
                color={bountyStatusColor(s)}
                isActive={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </Box>
        }
        searchValue={searchQuery}
        searchPlaceholder="Search bounties..."
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={(next) => {
          setViewMode(next);
          setPage(0);
        }}
        viewModeToggle={
          <PRsViewModeToggle
            viewMode={viewMode}
            onChange={(next) => {
              setViewMode(next);
              setPage(0);
            }}
          />
        }
        hasActiveFilter={statusFilter !== 'all'}
      />

      {viewMode === 'list' ? (
        <DataTable<IssueBounty, BountySortKey>
          columns={bountyColumns}
          rows={paged}
          getRowKey={bountyKey}
          getRowHref={getBountyHref}
          linkState={{ backLabel: 'Back to Watchlist' }}
          minWidth="900px"
          stickyHeader
          isLoading={isLoading && items.length === 0}
          emptyLabel="No watched bounties found."
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
              No watched bounties found.
            </Typography>
          ) : (
            <Grid container spacing={2} alignItems="stretch">
              {paged.map((issue) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={bountyKey(issue)}
                  sx={{ display: 'flex' }}
                >
                  <Box sx={{ width: '100%' }}>
                    <BountyCard
                      issue={issue}
                      href={getBountyHref(issue)}
                      linkState={{ backLabel: 'Back to Watchlist' }}
                      taoPrice={taoPrice}
                      alphaPrice={alphaPrice}
                      compact
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
      {filtered.length > (page + 1) * ROWS_PER_PAGE && (
        <Box
          ref={observerTarget}
          sx={{
            height: 60,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isLoadingMore && (
            <>
              <CircularProgress size={20} sx={{ color: 'text.secondary' }} />
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.85rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  ml: 1.5,
                }}
              >
                Loading more...
              </Typography>
            </>
          )}
        </Box>
      )}
    </Card>
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

type PrSortKey =
  | 'pr'
  | 'title'
  | 'repo'
  | 'author'
  | 'date'
  | 'score'
  | 'watch';

/** Return the most relevant date for a PR: mergedAt > closedAt > prCreatedAt. */
const prLastActionDate = (pr: CommitLog): string =>
  pr.mergedAt || pr.closedAt || pr.prCreatedAt || '';

const prCellSx = { py: 1.5 } as const;

const SOURCE_META: Record<
  WatchedPRSource,
  { label: string; tooltip: string; Icon: typeof StarIcon; color: string }
> = {
  starred: {
    label: 'Starred',
    tooltip: 'You starred this pull request',
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
    key: 'date',
    header: 'Date',
    width: '100px',
    align: 'right',
    sortKey: 'date',
    cellSx: prCellSx,
    renderCell: (pr) => {
      const raw = prLastActionDate(pr);
      if (!raw) return null;
      const d = new Date(raw);
      return (
        <Typography
          sx={{
            fontSize: '0.72rem',
            color: 'text.secondary',
            whiteSpace: 'nowrap',
          }}
        >
          {d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Typography>
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
            src={getRepositoryOwnerAvatarSrc(pr.repository.split('/')[0])}
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

const PRsList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const { items, sourcesByKey, isLoading } = useWatchedPRs(itemKeys);
  const prColumns = useMemo(() => buildPrColumns(sourcesByKey), [sourcesByKey]);
  const { isWatched } = useWatchlist('prs');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PrStatusFilter>('all');
  const [viewMode, setViewMode] = useWatchlistViewMode();
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [sortField, setSortField] = useState<PrSortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchQuery, sortField, sortOrder, viewMode, isWatched]);

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
    return filterPrs(items, {
      statusFilter,
      searchQuery,
      includeNumber: true,
    });
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
        case 'date': {
          const da = new Date(prLastActionDate(a)).getTime() || 0;
          const db = new Date(prLastActionDate(b)).getTime() || 0;
          return cmpNum(da, db);
        }
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
    () => sorted.slice(0, (page + 1) * ROWS_PER_PAGE),
    [sorted, page],
  );

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setPage((p) => p + 1);
            setIsLoadingMore(false);
          }, 400);
        }
      },
      { root: null, rootMargin: '0px 0px 400px 0px', threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [page, filtered.length]);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Compact Options trigger */}
      <WatchlistPortal
        filterContent={
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
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
        }
        searchValue={searchQuery}
        searchPlaceholder="Search PRs..."
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={(next) => {
          setViewMode(next);
          setPage(0);
        }}
        viewModeToggle={
          <PRsViewModeToggle
            viewMode={viewMode}
            onChange={(next) => {
              setViewMode(next);
              setPage(0);
            }}
          />
        }
        hasActiveFilter={statusFilter !== 'all'}
      />

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
      {filtered.length > (page + 1) * ROWS_PER_PAGE && (
        <Box
          ref={observerTarget}
          sx={{
            height: 60,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isLoadingMore && (
            <>
              <CircularProgress size={20} sx={{ color: 'text.secondary' }} />
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.85rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  ml: 1.5,
                }}
              >
                Loading more...
              </Typography>
            </>
          )}
        </Box>
      )}
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
const issueCellSx = { py: 1.5 } as const;

const issueState = (issue: MinerIssue): Exclude<IssueStatusFilter, 'all'> => {
  if ((issue.state_reason ?? '').toLowerCase() === 'completed')
    return 'resolved';
  return issue.state === 'CLOSED' ? 'closed' : 'open';
};

const issueStatusMeta = (issue: MinerIssue) => {
  const s = issueState(issue);
  if (s === 'resolved')
    return { label: 'RESOLVED', color: STATUS_COLORS.merged };
  if (s === 'closed') return { label: 'CLOSED', color: STATUS_COLORS.closed };
  return { label: 'OPEN', color: STATUS_COLORS.open };
};

const issueDate = (issue: MinerIssue): string =>
  issue.updated_at || issue.closed_at || issue.created_at || '';

const issueKey = (issue: MinerIssue) =>
  `${issue.repo_full_name}#${issue.issue_number}`;

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

const IssueCard: React.FC<{
  issue: MinerIssue;
  sources?: WatchedPRSource[];
}> = ({ issue, sources = [] }) => {
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
            src={getRepositoryOwnerAvatarSrc(
              issue.repo_full_name.split('/')[0],
            )}
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
          <WatchedSourceBadges sources={sources} />
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
  const isLoading = issueQueries.some((q) => q.isLoading);

  const { ids: starredIssueIds } = useWatchlist('issues');
  const { ids: watchedRepoIds } = useWatchlist('repos');
  const starredSet = useMemo(() => new Set(starredIssueIds), [starredIssueIds]);
  const watchedRepoSet = useMemo(
    () => new Set(watchedRepoIds.map((r) => r.toLowerCase())),
    [watchedRepoIds],
  );
  const watchedMinerSet = useMemo(() => new Set(minerIds), [minerIds]);

  const sourcesByKey = useMemo(() => {
    const map = new Map<string, WatchedPRSource[]>();
    issueQueries.forEach((q) => {
      (q.data ?? []).forEach((issue) => {
        const key = issueKey(issue);
        if (map.has(key)) return;
        const sources: WatchedPRSource[] = [];
        if (starredSet.has(key)) sources.push('starred');
        if (
          issue.author_github_id &&
          watchedMinerSet.has(issue.author_github_id)
        ) {
          sources.push('miner');
        }
        if (watchedRepoSet.has(issue.repo_full_name.toLowerCase())) {
          sources.push('repo');
        }
        map.set(key, sources);
      });
    });
    return map;
  }, [issueQueries, starredSet, watchedMinerSet, watchedRepoSet]);

  const issueColumns = useMemo(
    () => buildIssueColumns(sourcesByKey),
    [sourcesByKey],
  );

  // Flatten + dedupe issues across all watched miners.
  const items = useMemo<MinerIssue[]>(() => {
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

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>('all');
  const [viewMode, setViewMode] = useWatchlistViewMode();
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [sortField, setSortField] = useState<IssueSortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchQuery, sortField, sortOrder, viewMode]);

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
    () => sorted.slice(0, (page + 1) * ROWS_PER_PAGE),
    [sorted, page],
  );

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setPage((p) => p + 1);
            setIsLoadingMore(false);
          }, 400);
        }
      },
      { root: null, rootMargin: '0px 0px 400px 0px', threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [page, filtered.length]);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Compact Options trigger */}
      <WatchlistPortal
        filterContent={
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {ISSUE_STATUS_FILTERS.map((s) => (
              <FilterButton
                key={s}
                label={s[0].toUpperCase() + s.slice(1)}
                count={counts[s]}
                color={issueStatusColor(s)}
                isActive={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </Box>
        }
        searchValue={searchQuery}
        searchPlaceholder="Search issues..."
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewModeToggle={
          <PRsViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        }
        hasActiveFilter={statusFilter !== 'all'}
      />

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
                    <IssueCard
                      issue={i}
                      sources={sourcesByKey.get(issueKey(i))}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
      {filtered.length > (page + 1) * ROWS_PER_PAGE && (
        <Box
          ref={observerTarget}
          sx={{
            height: 60,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isLoadingMore && (
            <>
              <CircularProgress size={20} sx={{ color: 'text.secondary' }} />
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.85rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  ml: 1.5,
                }}
              >
                Loading more...
              </Typography>
            </>
          )}
        </Box>
      )}
    </Card>
  );
};

export default WatchlistPage;

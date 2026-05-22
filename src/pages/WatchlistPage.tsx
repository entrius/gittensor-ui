import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  MenuItem,
  Popover,
  Select,
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
  useTheme,
  Portal,
  TablePagination,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ReactECharts from 'echarts-for-react';
import type { TooltipComponentFormatterCallbackParams } from 'echarts';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Page } from '../components/layout';
import { useTwitterStickySidebar } from '../hooks/useTwitterStickySidebar';
import { useSessionStoredState } from '../hooks/useSessionStoredState';
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
import { ClearSearchAdornment } from '../components/common/ClearSearchAdornment';
import { LinkBox } from '../components/common/linkBehavior';
import {
  useAllMiners,
  useReposAndWeights,
  useIssues,
  useAllPrs,
  useMinersIssues,
  MINER_ISSUES_FULL_HISTORY_SINCE_ISO,
} from '../api';
import { useFiltersPanelOpenInUrl } from '../hooks/useFiltersPanelUrlState';
import type {
  CommitLog,
  MinerIssue,
  Repository,
} from '../api/models/Dashboard';
import type { IssueBounty } from '../api/models/Issues';
import { usePrices } from '../hooks/usePrices';
import { DebouncedSearchInput } from '../components/common/DebouncedSearchInput';
import { WatchlistTokenSearchField } from '../components/common/WatchlistTokenSearch';
import {
  useWatchlistFiltersSearchSlot,
  WatchlistFiltersSearchProvider,
} from '../contexts/WatchlistFiltersSearchContext';
import { matchesAllSearchTerms } from '../utils/watchlistSearch';
import { BountyCard } from '../components/issues/BountyCard';
import { mapAllMinersToStats } from '../utils/minerMapper';
import {
  buildRepoDiscoveryRollupFromMiners,
  isOutsideScoringWindow,
} from '../utils/ExplorerUtils';
import {
  comparePRsByWatchlist,
  serializePRKey,
  useWatchlist,
  useWatchlistCounts,
  type WatchlistCategory,
} from '../hooks/useWatchlist';
import { useWatchedPRs, type WatchedPRSource } from '../hooks/useWatchedPRs';
import { usePrSourceFilter } from '../hooks/usePrSourceFilter';
import {
  isMergedPr,
  isClosedUnmergedPr,
  getPrStatusCounts,
} from '../utils/prStatus';
import { filterPrs, type PrStatusFilter } from '../utils/prTable';
import { getIssueStatusMeta } from '../utils/issueStatus';
import { formatDate, formatTokenAmount, formatWeight } from '../utils/format';
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
import {
  FONTS,
  getRepositoryOwnerAvatarBackground,
  type RepoStats,
} from '../components/leaderboard/types';
import { RepositoryCard } from '../components/leaderboard/RepositoryCard';
import {
  echartsAxisTooltipChrome,
  echartsFontFamily,
} from '../utils/echarts/gittensorChartTheme';

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
    label: 'repositories',
    path: '/repositories',
    hint: 'Open a repository and star miners you want to track.',
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
    label: 'repositories',
    path: '/repositories',
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
          top: 60,
          zIndex: 50,
          backgroundColor: (t) => alpha(t.palette.background.default, 0.85),
          backdropFilter: 'blur(12px)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={(t) => ({
            maxWidth: '100%',
            minWidth: 0,
            minHeight: 52,
            '& .MuiTabs-scroller': {
              overscrollBehaviorX: 'contain',
            },
            '& .MuiTabs-flexContainer': {
              minWidth: '100%',
            },
            '& .MuiTabs-scrollButtons': {
              color: t.palette.text.primary,
              width: 32,
              '&.Mui-disabled': {
                opacity: 0.25,
              },
            },
            '& .MuiTab-root': {
              minHeight: 52,
              fontSize: '0.95rem',
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: '0.01em',
              flex: '1 0 auto',
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
  // Resolve the sidebar portal target synchronously. A tab switch remounts
  // this component; without the lazy initializer `target` is null on the
  // first render, so the options flash inline at the top of the content
  // before the effect moves them into the sidebar.
  const [target, setTarget] = useState<HTMLElement | null>(() =>
    document.getElementById('tabs-options-portal'),
  );
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));

  // On the very first page load the portal node is committed after this
  // component's first render — pick it up before paint to avoid a flash.
  useLayoutEffect(() => {
    setTarget(document.getElementById('tabs-options-portal'));
  }, []);

  if (target && isLargeScreen) {
    return (
      <Portal container={target} key={props.portalKey ?? 'watchlist-filters'}>
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
  const [open, setOpen] = useFiltersPanelOpenInUrl();

  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(!open)}
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

const WatchlistSidebarSearch: React.FC<
  Pick<
    WatchlistOptionsButtonProps,
    | 'onTokenSearchChange'
    | 'searchPlaceholder'
    | 'searchValue'
    | 'onSearchChange'
  >
> = ({
  onTokenSearchChange,
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
}) => {
  const searchSlot = useWatchlistFiltersSearchSlot();
  if (searchSlot) {
    return <>{searchSlot}</>;
  }

  if (onTokenSearchChange) {
    return (
      <WatchlistTokenSearchField
        onQueryChange={onTokenSearchChange}
        placeholder={searchPlaceholder}
      />
    );
  }

  return (
    <TextField
      placeholder={searchPlaceholder}
      size="small"
      value={searchValue}
      onChange={(e) => onSearchChange?.(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: 'text.tertiary', fontSize: '1rem' }} />
          </InputAdornment>
        ),
        endAdornment: (
          <ClearSearchAdornment
            visible={Boolean(searchValue)}
            onClear={() => onSearchChange?.('')}
          />
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
  );
};

const WatchlistOptionsSidebarPanelContent: React.FC<
  Omit<WatchlistOptionsButtonProps, 'hasActiveFilter'>
> = ({
  filterContent,
  sortContent,
  extraContent,
  onTokenSearchChange,
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

    {sortContent != null ? (
      <Box>
        <OptionsLabel>Sort</OptionsLabel>
        {sortContent}
      </Box>
    ) : null}

    {/* Search */}
    <Box>
      <OptionsLabel>Search</OptionsLabel>
      <WatchlistSidebarSearch
        onTokenSearchChange={onTokenSearchChange}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
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
  /** Shown under Filter when set (e.g. repositories card view). */
  sortContent?: React.ReactNode;
  extraContent?: React.ReactNode;
  /** Forces a fresh portal mount when switching watchlist tabs. */
  portalKey?: string;
  /** Enter pins terms as chips below the field; multiple terms use AND. */
  onTokenSearchChange?: (query: string) => void;
  searchValue?: string;
  searchPlaceholder: string;
  onSearchChange?: (v: string) => void;
  viewMode: string;
  onViewModeChange: (v: any) => void;
  viewModeToggle: React.ReactNode;
  hasActiveFilter: boolean;
}

const WatchlistOptionsButton: React.FC<WatchlistOptionsButtonProps> = ({
  filterContent,
  sortContent,
  extraContent,
  onTokenSearchChange,
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

        {sortContent != null ? (
          <Box>
            <OptionsLabel>Sort</OptionsLabel>
            {sortContent}
          </Box>
        ) : null}

        {/* Search */}
        <Box>
          <OptionsLabel>Search</OptionsLabel>
          <WatchlistSidebarSearch
            onTokenSearchChange={onTokenSearchChange}
            searchPlaceholder={searchPlaceholder}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
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
  const { remove } = useWatchlist('miners');
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

  const unresolvedIds = useMemo(() => {
    if (isLoading || !allMinersStats) return [];
    const known = new Set(allMinersStats.map((m) => m.githubId));
    return itemKeys.filter((id) => !known.has(id));
  }, [allMinersStats, isLoading, itemKeys]);

  const handleRemoveUnresolved = useCallback(() => {
    unresolvedIds.forEach((id) => remove(id));
  }, [unresolvedIds, remove]);

  return (
    <Box
      sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      {unresolvedIds.length > 0 && (
        <Card
          sx={(theme) => ({
            p: 1.5,
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            flexDirection: { xs: 'column', sm: 'row' },
            backgroundColor: alpha(theme.palette.status.warningOrange, 0.08),
            border: `1px solid ${alpha(theme.palette.status.warningOrange, 0.3)}`,
          })}
          elevation={0}
        >
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {unresolvedIds.length} watched{' '}
            {unresolvedIds.length === 1 ? 'miner' : 'miners'} could not be
            loaded (the account may not be tracked by Gittensor).
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={handleRemoveUnresolved}
            sx={{ textTransform: 'none', flexShrink: 0 }}
          >
            Remove unresolved
          </Button>
        </Card>
      )}
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
  // Hoisted from `config` for downstream sort/render code; populated when
  // constructing each row from the API Repository.
  weight: number | string;
  totalScore: number;
  totalPRs: number;
  uniqueMiners: Set<string>;
  discoveryScore: number;
  discoveryIssues: number;
  discoveryContributors: Set<string>;
};

const isPrStatusFilterStored = (v: unknown): v is PrStatusFilter =>
  v === 'all' || v === 'open' || v === 'merged' || v === 'closed';

type RepoSortKey =
  | 'name'
  | 'weight'
  | 'totalScore'
  | 'totalPRs'
  | 'contributors'
  | 'discoveryScore'
  | 'discoveryIssues'
  | 'discoveryContributors';

/** Card-view sort chips (Leaderboard-style); list view sorts via column headers. */
const WATCHLIST_REPO_CARD_SORT_OPTIONS: Array<{
  value: RepoSortKey;
  label: string;
}> = [
  { value: 'weight', label: 'Weight' },
  { value: 'totalScore', label: 'OSS score' },
  { value: 'totalPRs', label: 'PRs' },
  { value: 'contributors', label: 'OSS contributors' },
  { value: 'discoveryScore', label: 'Issue score' },
  { value: 'discoveryIssues', label: 'Issues' },
  { value: 'discoveryContributors', label: 'Issue contributors' },
];

const WatchlistRepoCardSortPills: React.FC<{
  sortField: RepoSortKey;
  sortOrder: 'asc' | 'desc';
  onSortChange: (key: RepoSortKey) => void;
}> = ({ sortField, sortOrder, onSortChange }) => (
  <Box
    sx={{
      display: 'flex',
      gap: 0.5,
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    }}
  >
    {WATCHLIST_REPO_CARD_SORT_OPTIONS.map((opt) => {
      const isActive = sortField === opt.value;
      return (
        <Box
          key={opt.value}
          component="button"
          type="button"
          onClick={() => onSortChange(opt.value)}
          sx={(t) => ({
            px: 1.5,
            minHeight: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            borderRadius: 2,
            cursor: 'pointer',
            font: 'inherit',
            backgroundColor: isActive
              ? alpha(t.palette.text.primary, 0.1)
              : 'transparent',
            color: isActive ? t.palette.text.primary : STATUS_COLORS.open,
            border: '1px solid',
            borderColor: isActive ? t.palette.border.medium : 'transparent',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: t.palette.surface.light,
              color: t.palette.text.primary,
            },
            '&:focus-visible': {
              outline: `2px solid ${t.palette.status.info}`,
              outlineOffset: 2,
            },
          })}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {opt.label}
          </Typography>
          {isActive && (
            <Typography
              component="span"
              sx={{ fontSize: '0.7rem', opacity: 0.7 }}
            >
              {sortOrder === 'asc' ? '▲' : '▼'}
            </Typography>
          )}
        </Box>
      );
    })}
  </Box>
);

const repoCellSx = { py: 1.5 } as const;

/** Narrow stacked header for metric columns (avoids cramped TableSortLabel overlap). */
const repoHeaderStack = (
  lines: [string, string],
): NonNullable<DataTableColumn<WatchedRepoStats, RepoSortKey>['header']> => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 0.125,
      lineHeight: 1.15,
      width: '100%',
      boxSizing: 'border-box',
      pr: 0.25,
    }}
  >
    <Box component="span">{lines[0]}</Box>
    <Box component="span">{lines[1]}</Box>
  </Box>
);

const getRepoHref = (repo: Repository) =>
  `/miners/repository?name=${encodeURIComponent(repo.fullName)}`;

const repoColumns: DataTableColumn<WatchedRepoStats, RepoSortKey>[] = [
  {
    key: 'name',
    header: 'Repository',
    width: '20%',
    sortKey: 'name',
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Avatar
          src={getRepositoryOwnerAvatarSrc(repo.fullName.split('/')[0])}
          alt={repo.fullName}
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
    width: '78px',
    align: 'right',
    sortKey: 'weight',
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
        {formatWeight(repo.config?.emissionShare)}
      </Typography>
    ),
  },
  {
    key: 'totalScore',
    header: repoHeaderStack(['OSS', 'score']),
    width: '86px',
    align: 'right',
    sortKey: 'totalScore',
    headerSx: {
      verticalAlign: 'bottom',
      whiteSpace: 'normal',
      py: 1,
      minWidth: 86,
      overflow: 'visible',
    },
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
    width: '52px',
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
    header: repoHeaderStack(['OSS', 'contributors']),
    width: '80px',
    align: 'right',
    sortKey: 'contributors',
    headerSx: {
      verticalAlign: 'bottom',
      whiteSpace: 'normal',
      py: 1,
      minWidth: 80,
      overflow: 'visible',
      textOverflow: 'clip',
    },
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
    key: 'discoveryScore',
    header: repoHeaderStack(['Issue', 'score']),
    width: '76px',
    align: 'right',
    sortKey: 'discoveryScore',
    headerSx: {
      verticalAlign: 'bottom',
      whiteSpace: 'normal',
      py: 1,
      minWidth: 76,
      overflow: 'visible',
    },
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: repo.discoveryScore > 0 ? 'text.primary' : 'text.secondary',
        }}
      >
        {formatRepoMetric(repo.discoveryScore, 2)}
      </Typography>
    ),
  },
  {
    key: 'discoveryIssues',
    header: 'Issues',
    width: '62px',
    align: 'right',
    sortKey: 'discoveryIssues',
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: repo.discoveryIssues > 0 ? 'text.primary' : 'text.secondary',
        }}
      >
        {formatRepoMetric(repo.discoveryIssues)}
      </Typography>
    ),
  },
  {
    key: 'discoveryContributors',
    header: repoHeaderStack(['Issue', 'contributors']),
    width: '92px',
    align: 'right',
    sortKey: 'discoveryContributors',
    headerSx: {
      verticalAlign: 'bottom',
      whiteSpace: 'normal',
      py: 1,
      minWidth: 92,
      overflow: 'visible',
    },
    cellSx: repoCellSx,
    renderCell: (repo) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color:
            repo.discoveryContributors.size > 0
              ? 'text.primary'
              : 'text.secondary',
        }}
      >
        {formatRepoMetric(repo.discoveryContributors.size)}
      </Typography>
    ),
  },
  {
    key: 'watch',
    header: '\u2605',
    width: '42px',
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

/** Adapt a watched repo row to the shared {@link RepositoryCard} `RepoStats` shape. */
const watchedRepoToStats = (
  repo: WatchedRepoStats,
  rank: number,
): RepoStats => ({
  repository: repo.fullName,
  totalScore: repo.totalScore,
  totalPRs: repo.totalPRs,
  uniqueMiners: repo.uniqueMiners,
  weight: parseFloat(String(repo.config?.emissionShare ?? 0)) || 0,
  rank,
  mirrorEnabled: repo.config?.mirrorEnabled,
  discoveryScore: repo.discoveryScore,
  discoveryIssues: repo.discoveryIssues,
  discoveryContributors: repo.discoveryContributors,
  issueDiscoveryShare:
    parseFloat(String(repo.config?.issueDiscoveryShare ?? 0)) || 0,
  trustedLabelPipeline: repo.config?.trustedLabelPipeline,
  labelMultipliers: repo.config?.labelMultipliers,
});

const ROWS_PER_PAGE = 60; // If we set this to 50, tile mode displays 2 cards with an empty slot in the last row.

const WatchlistStackedPagination: React.FC<{
  count: number;
  page: number;
  onPageChange: (nextPage: number) => void;
}> = ({ count, page, onPageChange }) => (
  <TablePagination
    rowsPerPageOptions={[]}
    component="div"
    count={count}
    rowsPerPage={ROWS_PER_PAGE}
    page={page}
    onPageChange={(_event, newPage) => onPageChange(newPage)}
    onRowsPerPageChange={(e: React.ChangeEvent<HTMLInputElement>) => {
      void e;
    }}
    showFirstButton
    showLastButton
    sx={{
      borderTop: '1px solid',
      borderColor: 'border.light',
      color: 'text.secondary',
      '.MuiTablePagination-displayedRows': {},
    }}
  />
);

/** Sidebar is beside main content only at `xl+`; below that, paginate tables so stacked sidebars stay reachable. */
const useWatchlistSidebarFixedRight = () =>
  useMediaQuery(theme.breakpoints.up('xl'));

const ReposList: React.FC<{ itemKeys: string[] }> = ({ itemKeys }) => {
  const theme = useTheme();
  const { data: repos } = useReposAndWeights();
  const { data: allPrs } = useAllPrs();
  const { data: allMiners } = useAllMiners();
  const sidebarFixedRight = useWatchlistSidebarFixedRight();
  const [searchQuery, setSearchQuery] = useState('');
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
  }, [sidebarFixedRight]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, sortField, sortOrder, viewMode]);

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
    const discoveryByRepo = buildRepoDiscoveryRollupFromMiners(
      allPrs,
      allMiners,
    );
    if (allPrs) {
      allPrs.forEach((pr: CommitLog) => {
        if (!pr?.repository) return;
        if (!isMergedPr(pr)) return;
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
        const key = r.fullName.toLowerCase();
        const s = prStatsMap.get(key);
        const d = discoveryByRepo.get(key);
        return {
          ...r,
          weight: r.config?.emissionShare ?? 0,
          totalScore: s?.totalScore || 0,
          totalPRs: s?.totalPRs || 0,
          uniqueMiners: s?.uniqueMiners || new Set<string>(),
          discoveryScore: d?.discoveryScore ?? 0,
          discoveryIssues: d?.discoveryIssues ?? 0,
          discoveryContributors: d?.discoveryContributors ?? new Set<string>(),
        };
      });
  }, [repos, allPrs, allMiners, itemKeys]);

  const counts = useMemo(() => ({ all: items.length }), [items]);

  const filtered = useMemo(() => {
    let result = items;
    const q = searchQuery.trim().toLowerCase();
    if (q) result = result.filter((r) => r.fullName.toLowerCase().includes(q));
    return result;
  }, [items, searchQuery]);

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
            parseFloat(String(a.config?.emissionShare ?? 0)),
            parseFloat(String(b.config?.emissionShare ?? 0)),
          );
        case 'totalScore':
          return cmpNum(a.totalScore, b.totalScore);
        case 'totalPRs':
          return cmpNum(a.totalPRs, b.totalPRs);
        case 'contributors':
          return cmpNum(a.uniqueMiners.size, b.uniqueMiners.size);
        case 'discoveryScore':
          return cmpNum(a.discoveryScore, b.discoveryScore);
        case 'discoveryIssues':
          return cmpNum(a.discoveryIssues, b.discoveryIssues);
        case 'discoveryContributors':
          return cmpNum(
            a.discoveryContributors.size,
            b.discoveryContributors.size,
          );
        default:
          return 0;
      }
    });
  }, [filtered, sortField, sortOrder]);

  const repoRankByKey = useMemo(() => {
    const m = new Map<string, number>();
    sorted.forEach((r, i) => m.set(r.fullName.toLowerCase(), i + 1));
    return m;
  }, [sorted]);

  const paged = useMemo(() => {
    if (sidebarFixedRight) {
      return sorted.slice(0, (page + 1) * ROWS_PER_PAGE);
    }
    const start = page * ROWS_PER_PAGE;
    return sorted.slice(start, start + ROWS_PER_PAGE);
  }, [sorted, page, sidebarFixedRight]);

  useEffect(() => {
    if (!sidebarFixedRight) return;
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
  }, [sidebarFixedRight, page, filtered.length]);

  const maxWeight = useMemo(
    () =>
      items.reduce(
        (m, r) => Math.max(m, parseFloat(String(r.config?.emissionShare ?? 0))),
        0,
      ),
    [items],
  );

  const chartOption = useMemo(() => {
    const white = UI_COLORS.white;
    const borderSubtle = alpha(white, 0.08);
    const textColor = alpha(white, 0.85);
    const gridColor = borderSubtle;
    const tooltipBorderColor = alpha(theme.palette.text.primary, 0.14);
    const tooltipLabelColor = alpha(white, TEXT_OPACITY.secondary);
    const primaryColor = theme.palette.text.primary;
    const chartFont = echartsFontFamily(theme);

    const chartData = paged.map((repo) => {
      const weight = parseFloat(String(repo.config?.weight ?? 0));
      const ossScore = repo.totalScore || 0;
      const prs = repo.totalPRs || 0;
      const contributors = repo.uniqueMiners?.size || 0;
      const discoveryScore = repo.discoveryScore || 0;
      const discoveryIssues = repo.discoveryIssues || 0;
      const discoveryContributors = repo.discoveryContributors?.size || 0;
      return {
        name: repo.fullName.split('/')[1] || repo.fullName,
        repository: repo.fullName,
        value: weight,
        rank: repoRankByKey.get(repo.fullName.toLowerCase()) ?? 1,
        ossScore,
        prs,
        contributors,
        discoveryScore,
        discoveryIssues,
        discoveryContributors,
        weight,
      };
    });

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
      rank: item.rank,
      weight: item.weight,
      prs: item.prs,
      contributors: item.contributors,
      ossScore: item.ossScore,
      discoveryScore: item.discoveryScore,
      discoveryIssues: item.discoveryIssues,
      discoveryContributors: item.discoveryContributors,
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
        ...echartsAxisTooltipChrome(theme),
        textStyle: {
          color: primaryColor,
          fontFamily: chartFont,
          fontSize: 12,
        },
        padding: [12, 16],
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          if (!Array.isArray(params)) return '';
          const data = params[0];
          const item = seriesData[data.dataIndex];
          if (!item) return '';

          const statRow = (label: string, value: string) => `
                <span style="color: ${tooltipLabelColor}; min-width: 0;">${label}</span>
                <span style="color: ${primaryColor}; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap;">${value}</span>`;

          return `
            <div style="font-family: ${chartFont}; display: grid; grid-template-columns: minmax(0, max-content); width: max-content; max-width: min(420px, 92vw); box-sizing: border-box;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; line-height: 1.35;">
                #${item.rank} ${item.repository}
              </div>
              <div style="margin-top: 0; padding-top: 8px; border-top: 1px solid ${tooltipBorderColor}; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 10px; row-gap: 6px; align-items: baseline; min-width: 0;">
                ${statRow('OSS score:', item.ossScore.toFixed(2))}
                ${statRow('PRs:', String(item.prs))}
                ${statRow('OSS contributors:', String(item.contributors))}
                ${statRow('Issue score:', item.discoveryScore.toFixed(2))}
                ${statRow('Issues:', String(item.discoveryIssues))}
                ${statRow('Issue contributors:', String(item.discoveryContributors))}
                ${statRow('Weight:', formatWeight(item.weight))}
              </div>
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
          formatter: (value: number) => formatWeight(value),
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
  }, [paged, useLogScale, theme, repoRankByKey]);

  return (
    <Box sx={{ width: '100%' }}>
      <DebouncedSearchInput onDebouncedChange={setSearchQuery}>
        {({ draftValue, setDraftValue }) => (
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
                  isActive
                  onClick={() => {}}
                />
              </Box>
            }
            sortContent={
              viewMode === 'cards' ? (
                <WatchlistRepoCardSortPills
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSortChange={handleSort}
                />
              ) : undefined
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
            searchValue={draftValue}
            searchPlaceholder="Search repositories..."
            onSearchChange={setDraftValue}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            viewModeToggle={
              <ReposViewModeToggle viewMode={viewMode} onChange={setViewMode} />
            }
            hasActiveFilter={false}
          />
        )}
      </DebouncedSearchInput>

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
          minWidth="1180px"
          stickyHeader
          emptyLabel="No watched repositories found."
          sort={{
            field: sortField,
            order: sortOrder,
            onChange: handleSort,
          }}
          pagination={
            !sidebarFixedRight ? (
              <WatchlistStackedPagination
                count={filtered.length}
                page={page}
                onPageChange={setPage}
              />
            ) : undefined
          }
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
                    <RepositoryCard
                      repo={watchedRepoToStats(
                        repo,
                        repoRankByKey.get(repo.fullName.toLowerCase()) ?? 0,
                      )}
                      maxWeight={maxWeight}
                      href={getRepoHref(repo)}
                      linkState={{ backLabel: 'Back to Watchlist' }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
      {sidebarFixedRight && filtered.length > (page + 1) * ROWS_PER_PAGE && (
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
      {!sidebarFixedRight && viewMode !== 'list' ? (
        <WatchlistStackedPagination
          count={filtered.length}
          page={page}
          onPageChange={setPage}
        />
      ) : null}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// BountiesList — mirrors PRsList shell (toolbar + DataTable + card grid +
// load-more sentinel) for watched bounties. Reuses the shared `BountyCard`
// for card view so the watchlist matches the standalone /bounties page.
// ---------------------------------------------------------------------------

type BountyStatusFilter = 'all' | 'available' | 'pending' | 'history';
/** Aligns with `IssuesList` / `/bounties` sort dropdown keys per filter tab. */
type BountySortKey =
  | 'id'
  | 'repository'
  | 'issue'
  | 'bounty'
  | 'funding'
  | 'status'
  | 'solver'
  | 'date';

const BOUNTY_SORT_LABELS: Record<BountySortKey, string> = {
  id: 'ID',
  repository: 'Repository',
  issue: 'Issue',
  bounty: 'Bounty',
  funding: 'Funding',
  status: 'Status',
  solver: 'Solver',
  date: 'Date',
};

const bountyVisibleSortKeysForFilter = (
  statusFilter: BountyStatusFilter,
): BountySortKey[] => {
  const common: BountySortKey[] = ['id', 'repository', 'issue'];
  if (statusFilter === 'pending')
    return [...common, 'bounty', 'funding', 'status'];
  if (statusFilter === 'history')
    return [...common, 'bounty', 'solver', 'status', 'date'];
  return [...common, 'bounty', 'status'];
};

const parseBountyAmount = (value: string | null | undefined): number => {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

const getBountySortValue = (
  issue: IssueBounty,
  key: BountySortKey,
): number | string => {
  switch (key) {
    case 'id':
      return issue.id;
    case 'funding': {
      const target = parseBountyAmount(issue.targetBounty);
      return target > 0 ? parseBountyAmount(issue.bountyAmount) / target : 0;
    }
    case 'solver':
      return (issue.solverHotkey ?? '').toLowerCase();
    case 'date':
      return new Date(
        issue.completedAt || issue.updatedAt || issue.createdAt || 0,
      ).getTime();
    case 'repository':
      return (issue.repositoryFullName || '').toLowerCase();
    case 'issue':
      return `${(issue.title || '').toLowerCase()}::${String(issue.issueNumber).padStart(10, '0')}`;
    case 'bounty':
      return parseBountyAmount(issue.targetBounty);
    case 'status':
      return getIssueStatusMeta(issue.status).text;
  }
};

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
    key: 'id',
    header: 'ID',
    width: '56px',
    sortKey: 'id',
    cellSx: bountyCellSx,
    renderCell: (i) => (
      <Typography
        sx={{
          fontSize: '0.75rem',
          color: (t) => alpha(t.palette.text.primary, 0.65),
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        #{i.id}
      </Typography>
    ),
  },
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
    sortKey: 'repository',
    cellSx: bountyCellSx,
    renderCell: (i) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Avatar
          src={getRepositoryOwnerAvatarSrc(i.repositoryFullName.split('/')[0])}
          alt={i.repositoryFullName}
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
  const sidebarFixedRight = useWatchlistSidebarFixedRight();
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

  const [sortField, setSortField] = useState<BountySortKey>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const bountyVisibleSortKeys = useMemo(
    () => bountyVisibleSortKeysForFilter(statusFilter),
    [statusFilter],
  );

  const getDefaultSortDirection = useCallback(
    (key: BountySortKey): 'asc' | 'desc' =>
      key === 'id' || key === 'bounty' || key === 'date' ? 'desc' : 'asc',
    [],
  );

  useEffect(() => {
    if (!bountyVisibleSortKeys.includes(sortField)) {
      setSortField('id');
      setSortOrder('desc');
    }
  }, [sortField, bountyVisibleSortKeys]);

  useEffect(() => {
    setPage(0);
  }, [sidebarFixedRight]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchQuery, sortField, sortOrder, viewMode]);

  const handleSort = useCallback(
    (field: BountySortKey) => {
      if (!bountyVisibleSortKeys.includes(field)) return;
      if (sortField === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder(getDefaultSortDirection(field));
      }
      setPage(0);
    },
    [sortField, bountyVisibleSortKeys, getDefaultSortDirection],
  );

  const counts = useMemo(() => getBountyCounts(items), [items]);

  const filtered = useMemo(
    () => filterBounties(items, { statusFilter, searchQuery }),
    [items, statusFilter, searchQuery],
  );

  const sorted = useMemo(() => {
    const directionFactor = sortOrder === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, {
      sensitivity: 'base',
      numeric: true,
    });
    const decorated = filtered.map((row) => ({
      row,
      value: getBountySortValue(row, sortField),
    }));
    decorated.sort((a, b) => {
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return (a.value - b.value) * directionFactor;
      }
      return (
        collator.compare(String(a.value), String(b.value)) * directionFactor
      );
    });
    return decorated.map((d) => d.row);
  }, [filtered, sortField, sortOrder]);

  const totalBountyPages = Math.max(
    1,
    Math.ceil(filtered.length / ROWS_PER_PAGE),
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalBountyPages - 1));
  }, [totalBountyPages]);

  const paged = useMemo(() => {
    if (sidebarFixedRight) {
      return sorted.slice(0, (page + 1) * ROWS_PER_PAGE);
    }
    const start = page * ROWS_PER_PAGE;
    return sorted.slice(start, start + ROWS_PER_PAGE);
  }, [sorted, page, sidebarFixedRight]);

  useEffect(() => {
    if (!sidebarFixedRight) return;
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
  }, [sidebarFixedRight, page, filtered.length]);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <DebouncedSearchInput onDebouncedChange={setSearchQuery}>
        {({ draftValue, setDraftValue }) => (
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
            sortContent={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Select
                  size="small"
                  value={
                    bountyVisibleSortKeys.includes(sortField) ? sortField : 'id'
                  }
                  onChange={(e) => {
                    const key = e.target.value as BountySortKey;
                    setSortField(key);
                    setSortOrder(getDefaultSortDirection(key));
                    setPage(0);
                  }}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    borderRadius: 2,
                    backgroundColor: 'background.default',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'border.light',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'border.medium',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '& .MuiSelect-select': {
                      py: 0.75,
                      fontSize: '0.8rem',
                      color: 'text.primary',
                    },
                  }}
                >
                  {bountyVisibleSortKeys.map((key) => (
                    <MenuItem key={key} value={key}>
                      {BOUNTY_SORT_LABELS[key]}
                    </MenuItem>
                  ))}
                </Select>
                <Tooltip
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  arrow
                >
                  <IconButton
                    size="small"
                    onClick={() =>
                      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                    }
                    sx={{
                      flexShrink: 0,
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
                    <ArrowUpwardIcon
                      fontSize="small"
                      sx={{
                        transform:
                          sortOrder === 'desc' ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </Box>
            }
            searchValue={draftValue}
            searchPlaceholder="Search bounties..."
            onSearchChange={setDraftValue}
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
        )}
      </DebouncedSearchInput>

      {viewMode === 'list' ? (
        <DataTable<IssueBounty, BountySortKey>
          columns={bountyColumns}
          rows={paged}
          getRowKey={bountyKey}
          getRowHref={getBountyHref}
          linkState={{ backLabel: 'Back to Watchlist' }}
          minWidth="980px"
          stickyHeader
          isLoading={isLoading && items.length === 0}
          emptyLabel="No watched bounties found."
          sort={{
            field: sortField,
            order: sortOrder,
            onChange: handleSort,
          }}
          pagination={
            !sidebarFixedRight ? (
              <WatchlistStackedPagination
                count={filtered.length}
                page={page}
                onPageChange={setPage}
              />
            ) : undefined
          }
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
      {sidebarFixedRight && filtered.length > (page + 1) * ROWS_PER_PAGE && (
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
      {!sidebarFixedRight && viewMode !== 'list' ? (
        <WatchlistStackedPagination
          count={filtered.length}
          page={page}
          onPageChange={setPage}
        />
      ) : null}
    </Box>
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
          src={getRepositoryOwnerAvatarSrc(pr.author)}
          alt={pr.author}
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
  const isStale = !!pr.mergedAt && isOutsideScoringWindow(pr.mergedAt);
  return (
    <Card
      elevation={0}
      sx={(t) => ({
        p: 1,
        backgroundColor: t.palette.background.default,
        backdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: alpha(color, 0.3),
        ...(isStale && { opacity: 0.4, filter: 'grayscale(0.5)' }),
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
            alt={pr.repository}
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
              src={getRepositoryOwnerAvatarSrc(pr.author)}
              alt={pr.author}
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
  const sidebarFixedRight = useWatchlistSidebarFixedRight();
  const {
    active: activeSources,
    toggle: toggleSource,
    isAllOn: sourcesAllOn,
  } = usePrSourceFilter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useSessionStoredState<PrStatusFilter>(
    'watchlist:prs:statusFilter',
    'all',
    isPrStatusFilterStored,
  );
  const [viewMode, setViewMode] = useWatchlistViewMode();
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [sortField, setSortField] = useState<PrSortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setPage(0);
  }, [sidebarFixedRight]);

  useEffect(() => {
    setPage(0);
  }, [
    statusFilter,
    searchQuery,
    sortField,
    sortOrder,
    viewMode,
    isWatched,
    activeSources,
  ]);

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

  const scopedItems = useMemo(() => {
    if (sourcesAllOn) return items;
    return items.filter((pr) =>
      sourcesByKey
        .get(serializePRKey(pr.repository, pr.pullRequestNumber))
        ?.some((s) => activeSources.has(s)),
    );
  }, [items, sourcesByKey, activeSources, sourcesAllOn]);

  const sourceCounts = useMemo(() => {
    const counts = { starred: 0, miner: 0, repo: 0 };
    for (const pr of items) {
      const sources = sourcesByKey.get(
        serializePRKey(pr.repository, pr.pullRequestNumber),
      );
      if (!sources) continue;
      for (const s of sources) counts[s] += 1;
    }
    return counts;
  }, [items, sourcesByKey]);

  const counts = useMemo(() => getPrStatusCounts(scopedItems), [scopedItems]);

  const filtered = useMemo(() => {
    return filterPrs(scopedItems, {
      statusFilter,
      searchQuery,
      includeNumber: true,
    });
  }, [scopedItems, statusFilter, searchQuery]);

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
        case 'watch':
          return comparePRsByWatchlist(a, b, isWatched) * dir;
        default:
          return 0;
      }
    });
  }, [filtered, sortField, sortOrder, isWatched]);

  const totalPrPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPrPages - 1));
  }, [totalPrPages]);

  const paged = useMemo(() => {
    if (sidebarFixedRight) {
      return sorted.slice(0, (page + 1) * ROWS_PER_PAGE);
    }
    const start = page * ROWS_PER_PAGE;
    return sorted.slice(start, start + ROWS_PER_PAGE);
  }, [sorted, page, sidebarFixedRight]);

  useEffect(() => {
    if (!sidebarFixedRight) return;
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
  }, [sidebarFixedRight, page, filtered.length]);

  const tokenSearch = (
    <WatchlistTokenSearchField
      onQueryChange={setSearchQuery}
      placeholder="Search PRs..."
    />
  );

  return (
    <WatchlistFiltersSearchProvider value={tokenSearch}>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <WatchlistPortal
          portalKey="watchlist-prs-filters"
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
              <Box
                sx={{
                  width: '1px',
                  height: 20,
                  backgroundColor: 'border.light',
                  mx: 0.5,
                }}
              />
              <FilterButton
                label="Starred"
                count={sourceCounts.starred}
                color={SOURCE_META.starred.color}
                isActive={activeSources.has('starred')}
                onClick={() => toggleSource('starred')}
              />
              <FilterButton
                label="Miner"
                count={sourceCounts.miner}
                color={SOURCE_META.miner.color}
                isActive={activeSources.has('miner')}
                onClick={() => toggleSource('miner')}
              />
              <FilterButton
                label="Repo"
                count={sourceCounts.repo}
                color={SOURCE_META.repo.color}
                isActive={activeSources.has('repo')}
                onClick={() => toggleSource('repo')}
              />
            </Box>
          }
          onTokenSearchChange={setSearchQuery}
          searchPlaceholder="Search PRs..."
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
          hasActiveFilter={
            statusFilter !== 'all' ||
            !sourcesAllOn ||
            Boolean(searchQuery.trim())
          }
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
            getRowSx={(pr) =>
              pr.mergedAt && isOutsideScoringWindow(pr.mergedAt)
                ? { opacity: 0.4, filter: 'grayscale(0.5)' }
                : {}
            }
            sort={{
              field: sortField,
              order: sortOrder,
              onChange: handleSort,
            }}
            pagination={
              !sidebarFixedRight ? (
                <WatchlistStackedPagination
                  count={filtered.length}
                  page={page}
                  onPageChange={setPage}
                />
              ) : undefined
            }
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
        {sidebarFixedRight && filtered.length > (page + 1) * ROWS_PER_PAGE && (
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
        {!sidebarFixedRight && viewMode !== 'list' ? (
          <WatchlistStackedPagination
            count={filtered.length}
            page={page}
            onPageChange={setPage}
          />
        ) : null}
      </Box>
    </WatchlistFiltersSearchProvider>
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

const issueCellSx = { py: 1.5 } as const;

/** Synthetic starred rows (mirror missing) carry this marker on `state_reason`. */
const WATCHLIST_ISSUE_PENDING_MIRROR_MARKER =
  '__gittensor_watchlist_pending_mirror__';

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
  if (issue.state_reason === WATCHLIST_ISSUE_PENDING_MIRROR_MARKER)
    return 'open';
  if (!minerWatchlistIssueClosed(issue)) return 'open';
  if (minerWatchlistIssueLinkedPr(issue) != null) return 'resolved';
  return 'closed';
};

const issueStatusMeta = (issue: MinerIssue) => {
  if (issue.state_reason === WATCHLIST_ISSUE_PENDING_MIRROR_MARKER) {
    return { label: '—', color: STATUS_COLORS.neutral };
  }
  const s = issueState(issue);
  if (s === 'resolved') return { label: 'SOLVED', color: STATUS_COLORS.merged };
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
  return items.filter((i) => {
    if (opts.statusFilter !== 'all' && issueState(i) !== opts.statusFilter)
      return false;
    if (!opts.searchQuery.trim()) return true;
    const haystack = [
      i.title,
      i.repo_full_name,
      i.author_login,
      String(i.issue_number),
      `#${i.issue_number}`,
    ]
      .filter(Boolean)
      .join(' ');
    return matchesAllSearchTerms(haystack, opts.searchQuery);
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
            src={getRepositoryOwnerAvatarSrc(login)}
            alt={login}
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
          {formatDate(d)}
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
  const isStale = !!issue.closed_at && isOutsideScoringWindow(issue.closed_at);
  return (
    <Card
      elevation={0}
      sx={(t) => ({
        p: 1,
        backgroundColor: t.palette.background.default,
        backdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: alpha(color, 0.3),
        ...(isStale && { opacity: 0.4, filter: 'grayscale(0.5)' }),
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
            alt={issue.repo_full_name}
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
                src={getRepositoryOwnerAvatarSrc(issue.author_login)}
                alt={issue.author_login}
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
  const issueQueries = useMinersIssues(
    minerIds,
    minerIds.length > 0,
    MINER_ISSUES_FULL_HISTORY_SINCE_ISO,
  );
  const sidebarFixedRight = useWatchlistSidebarFixedRight();

  const { ids: starredIssueIds } = useWatchlist('issues');
  const { ids: watchedRepoIds } = useWatchlist('repos');
  const starredSet = useMemo(() => new Set(starredIssueIds), [starredIssueIds]);
  const watchedRepoSet = useMemo(
    () => new Set(watchedRepoIds.map((r) => r.toLowerCase())),
    [watchedRepoIds],
  );
  const watchedMinerSet = useMemo(() => new Set(minerIds), [minerIds]);

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
          return {
            repo_full_name: parsed.repoFullName,
            issue_number: parsed.issueNumber,
            title: `${parsed.repoFullName} #${parsed.issueNumber}`,
            state: 'OPEN',
            state_reason: WATCHLIST_ISSUE_PENDING_MIRROR_MARKER,
            author_github_id: null,
            author_login: null,
            created_at: null,
            closed_at: null,
            updated_at: null,
            solved_by_pr: null,
            labels: [],
          } as MinerIssue;
        })
        .filter((issue): issue is MinerIssue => issue !== null),
    [starredIssueIds, mirroredIssueKeys],
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
    return map;
  }, [items, starredSet, watchedMinerSet, watchedRepoSet]);

  const issueColumns = useMemo(
    () => buildIssueColumns(sourcesByKey),
    [sourcesByKey],
  );

  const isLoading = issueQueries.some((q) => q.isLoading);

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
  }, [sidebarFixedRight]);

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

  const totalIssuePages = Math.max(
    1,
    Math.ceil(filtered.length / ROWS_PER_PAGE),
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalIssuePages - 1));
  }, [totalIssuePages]);

  const paged = useMemo(() => {
    if (sidebarFixedRight) {
      return sorted.slice(0, (page + 1) * ROWS_PER_PAGE);
    }
    const start = page * ROWS_PER_PAGE;
    return sorted.slice(start, start + ROWS_PER_PAGE);
  }, [sorted, page, sidebarFixedRight]);

  useEffect(() => {
    if (!sidebarFixedRight) return;
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
  }, [sidebarFixedRight, page, filtered.length]);

  const tokenSearch = (
    <WatchlistTokenSearchField
      onQueryChange={setSearchQuery}
      placeholder="Search issues..."
    />
  );

  return (
    <WatchlistFiltersSearchProvider value={tokenSearch}>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <WatchlistPortal
          portalKey="watchlist-issues-filters"
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
                  label={ISSUE_FILTER_LABELS[s]}
                  count={counts[s]}
                  color={issueStatusColor(s)}
                  isActive={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                />
              ))}
            </Box>
          }
          onTokenSearchChange={setSearchQuery}
          searchPlaceholder="Search issues..."
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
          hasActiveFilter={
            statusFilter !== 'all' || Boolean(searchQuery.trim())
          }
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
            getRowSx={(issue) =>
              issue.closed_at && isOutsideScoringWindow(issue.closed_at)
                ? { opacity: 0.4, filter: 'grayscale(0.5)' }
                : {}
            }
            sort={{
              field: sortField,
              order: sortOrder,
              onChange: handleSort,
            }}
            pagination={
              !sidebarFixedRight ? (
                <WatchlistStackedPagination
                  count={filtered.length}
                  page={page}
                  onPageChange={setPage}
                />
              ) : undefined
            }
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
        {sidebarFixedRight && filtered.length > (page + 1) * ROWS_PER_PAGE && (
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
        {!sidebarFixedRight && viewMode !== 'list' ? (
          <WatchlistStackedPagination
            count={filtered.length}
            page={page}
            onPageChange={setPage}
          />
        ) : null}
      </Box>
    </WatchlistFiltersSearchProvider>
  );
};

export default WatchlistPage;

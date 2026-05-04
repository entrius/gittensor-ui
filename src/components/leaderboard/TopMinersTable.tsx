import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Collapse,
  Grid,
  Tooltip,
  Popover,
  Portal,
  useMediaQuery,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { MinerCard } from './MinerCard';
import { MinersList } from './MinersList';
import { SectionCard } from './SectionCard';
import { SearchInput } from '../common/SearchInput';
import theme, { STATUS_COLORS } from '../../theme';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import { useWatchlist } from '../../hooks/useWatchlist';
import { type SortOrder } from '../../utils/ExplorerUtils';
import { compareByWatchlist } from '../../utils/watchlistSort';
import {
  type MinerStats,
  type SortOption,
  type LeaderboardVariant,
  FONTS,
} from './types';

type ViewMode = 'cards' | 'list';

// Re-export MinerStats for backward compatibility
export type { MinerStats } from './types';

const MINERS_PAGE_SIZE = 60;
const ELIGIBLE_QUERY_PARAM = 'eligible';
/** Watchlist: separate URL params so OSS and discovery eligibility filters are independent. */
const OSS_ELIGIBLE_QUERY_PARAM = 'ossElig';
const DISC_ELIGIBLE_QUERY_PARAM = 'discElig';
const VIEW_QUERY_PARAM = 'view';
const SEARCH_QUERY_PARAM = 'search';
const VISIBLE_QUERY_PARAM = 'visible';
const VIEW_STORAGE_KEY_LEADERBOARD = 'leaderboard:viewMode';
const VIEW_STORAGE_KEY_WATCHLIST = 'watchlist:viewMode';

const readStoredViewMode = (
  variant: 'watchlist' | 'oss' | 'discoveries' = 'oss',
): ViewMode => {
  const key =
    variant === 'watchlist'
      ? VIEW_STORAGE_KEY_WATCHLIST
      : VIEW_STORAGE_KEY_LEADERBOARD;
  const defaultValue = 'cards';
  try {
    const stored = window.localStorage.getItem(key);
    return stored === 'list' || stored === 'cards' ? stored : defaultValue;
  } catch {
    return defaultValue;
  }
};

const writeStoredViewMode = (
  mode: ViewMode,
  variant: 'watchlist' | 'oss' | 'discoveries' = 'oss',
) => {
  const key =
    variant === 'watchlist'
      ? VIEW_STORAGE_KEY_WATCHLIST
      : VIEW_STORAGE_KEY_LEADERBOARD;
  try {
    window.localStorage.setItem(key, mode);
  } catch {
    // localStorage unavailable (private mode, quota) — preference won't persist
  }
};

interface TopMinersTableProps {
  miners: MinerStats[];
  isLoading?: boolean;
  getMinerHref: (miner: MinerStats) => string;
  linkState?: Record<string, unknown>;
  variant?: LeaderboardVariant;
  showDualEligibilityBadges?: boolean;
}

const getAllowedSortOptions = (variant: LeaderboardVariant): SortOption[] => {
  if (variant === 'discoveries')
    return ['totalScore', 'usdPerDay', 'totalIssues', 'credibility', 'watch'];
  if (variant === 'watchlist')
    return [
      'totalScore',
      'usdPerDay',
      'totalPRs',
      'totalIssues',
      'issueDiscoveryScore',
      'credibility',
      'watch',
    ];
  return ['totalScore', 'usdPerDay', 'totalPRs', 'credibility', 'watch'];
};

type EligibilityFilter = 'all' | 'eligible' | 'ineligible';

type TopMinersUrlFilters = {
  view: ViewMode;
  search: string;
  /** OSS Contributions / Discoveries: single toggle. Inactive on watchlist (always `all`). */
  eligible: EligibilityFilter;
  /** Watchlist OSS column. Inactive on other variants (always `all`). */
  eligibleOss: EligibilityFilter;
  /** Watchlist Discovery column. Inactive on other variants (always `all`). */
  eligibleDiscovery: EligibilityFilter;
};

const eligibleUrlField = (
  paramKey: string,
  defaultValue: EligibilityFilter,
) => ({
  paramKey,
  parse: (raw: string | null): EligibilityFilter =>
    raw === 'true'
      ? 'eligible'
      : raw === 'false'
        ? 'ineligible'
        : raw === 'all'
          ? 'all'
          : defaultValue,
  serialize: (value: EligibilityFilter): string | null => {
    if (value === defaultValue) return null;
    return value === 'eligible'
      ? 'true'
      : value === 'ineligible'
        ? 'false'
        : 'all';
  },
});

/** URL-inert slot: keeps a stable filter key for the data-table hook when a variant does not use it. */
const inactiveEligibilitySlot = (paramKey: string) => ({
  paramKey,
  parse: (_raw: string | null): EligibilityFilter => 'all',
  serialize: (_value: EligibilityFilter): string | null => null,
});

const passesOssEligibility = (
  miner: MinerStats,
  filter: EligibilityFilter,
): boolean =>
  filter === 'all' ||
  (filter === 'eligible' ? Boolean(miner.ossIsEligible) : !miner.ossIsEligible);

const passesDiscoveryEligibility = (
  miner: MinerStats,
  filter: EligibilityFilter,
): boolean => {
  const ok = Boolean(miner.discoveriesIsEligible ?? miner.isIssueEligible);
  return filter === 'all' || (filter === 'eligible' ? ok : !ok);
};

const passesSingleProgramEligibility = (
  miner: MinerStats,
  filter: EligibilityFilter,
): boolean =>
  filter === 'all' ||
  (filter === 'eligible' ? Boolean(miner.isEligible) : !miner.isEligible);

const compareMiners = (
  a: MinerStats,
  b: MinerStats,
  option: SortOption,
  isWatched: (key: string) => boolean,
): number => {
  switch (option) {
    case 'totalScore':
      return a.totalScore - b.totalScore;
    case 'usdPerDay':
      return (a.usdPerDay ?? 0) - (b.usdPerDay ?? 0);
    case 'totalPRs':
      return a.totalPRs - b.totalPRs;
    case 'totalIssues':
      return (a.totalIssues ?? 0) - (b.totalIssues ?? 0);
    case 'issueDiscoveryScore':
      return (
        Number(a.issueDiscoveryScore ?? 0) - Number(b.issueDiscoveryScore ?? 0)
      );
    case 'credibility':
      return (a.credibility ?? 0) - (b.credibility ?? 0);
    case 'watch':
      return compareByWatchlist(a, b, (m) => m.githubId, isWatched);
    default:
      return 0;
  }
};

const TopMinersTable: React.FC<TopMinersTableProps> = ({
  miners,
  isLoading,
  getMinerHref,
  linkState,
  variant = 'oss',
  showDualEligibilityBadges = false,
}) => {
  const allowedSortKeys = useMemo(
    () => getAllowedSortOptions(variant),
    [variant],
  );

  const { isWatched } = useWatchlist('miners');

  // Stable filter configs — values are destructured below.
  // `view` always writes the URL param (never returns null) — otherwise
  // toggling back to 'cards' when the URL already has no `view` param
  // produces a no-op `setSearchParams` call that doesn't trigger a
  // re-render, so the UI stays stuck on the stale localStorage-sourced
  // value until a manual refresh. Writing the param explicitly forces
  // React to re-render through the URL change.
  const filtersConfig = useMemo(
    () => ({
      view: {
        paramKey: VIEW_QUERY_PARAM,
        parse: (raw: string | null): ViewMode =>
          raw === 'list'
            ? 'list'
            : raw === 'cards'
              ? 'cards'
              : readStoredViewMode(variant),
        serialize: (value: ViewMode): string => value,
        resetPageOnChange: false,
      },
      search: {
        paramKey: SEARCH_QUERY_PARAM,
        parse: (raw: string | null): string => raw ?? '',
        serialize: (value: string): string | null => value.trim() || null,
      },
      eligible:
        variant === 'watchlist'
          ? inactiveEligibilitySlot('minersEligibleUnusedLegacy')
          : eligibleUrlField(ELIGIBLE_QUERY_PARAM, 'eligible'),
      eligibleOss:
        variant === 'watchlist'
          ? eligibleUrlField(OSS_ELIGIBLE_QUERY_PARAM, 'all')
          : inactiveEligibilitySlot('minersEligibleOssUnused'),
      eligibleDiscovery:
        variant === 'watchlist'
          ? eligibleUrlField(DISC_ELIGIBLE_QUERY_PARAM, 'all')
          : inactiveEligibilitySlot('minersEligibleDiscUnused'),
    }),
    [variant],
  );

  const {
    sortField: sortOption,
    sortOrder: sortDirection,
    setSort: handleSortChange,
    page: storedVisibleCount,
    setPage: setVisibleCount,
    filters,
    setFilter,
  } = useDataTableParams<SortOption, TopMinersUrlFilters>({
    sortKeys: allowedSortKeys,
    defaultSortKey: 'totalScore',
    // Reuse the hook's `page` slot for our "show more" count — setSort and
    // filter changes reset it, which is the behavior we want.
    paramKeys: { page: VISIBLE_QUERY_PARAM },
    filters: filtersConfig,
  });

  const viewMode = filters.view;
  const searchQuery = filters.search;
  const eligibleOssFilter: EligibilityFilter =
    variant === 'watchlist' ? filters.eligibleOss : filters.eligible;
  const eligibleDiscoveryFilter: EligibilityFilter =
    variant === 'watchlist' ? filters.eligibleDiscovery : 'all';

  // `page` is 0 when no visible param is set — clamp to the initial batch.
  const visibleCount =
    storedVisibleCount < MINERS_PAGE_SIZE
      ? MINERS_PAGE_SIZE
      : storedVisibleCount;

  const handleViewModeChange = useCallback(
    (nextMode: ViewMode) => {
      // Persist the user's choice BEFORE updating the URL. When the serializer
      // returns null ('cards' is the default), the URL param is dropped and
      // the next render's parse falls back to localStorage — we need the new
      // value to be stored by that point.
      writeStoredViewMode(nextMode, variant);
      setFilter('view', nextMode);
    },
    [setFilter, variant],
  );

  const handleSearchChange = useCallback(
    (next: string) => setFilter('search', next),
    [setFilter],
  );

  const handleEligibleOssChange = useCallback(
    (next: EligibilityFilter) => {
      if (variant === 'watchlist') {
        setFilter('eligibleOss', next);
      } else {
        setFilter('eligible', next);
      }
    },
    [setFilter, variant],
  );

  const handleEligibleDiscoveryChange = useCallback(
    (next: EligibilityFilter) => setFilter('eligibleDiscovery', next),
    [setFilter],
  );

  // Rank is computed on the full sorted leaderboard so each miner keeps their
  // true position regardless of filters. Filtering (search / eligibility) then
  // only hides rows without renumbering the ones that remain. Sort direction
  // is included so the list view's asc/desc toggle ranks consistently.
  const rankedMiners = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...miners]
      .sort((a, b) => compareMiners(a, b, sortOption, isWatched) * dir)
      .map((miner, index) => ({ ...miner, rank: index + 1 }));
  }, [miners, sortOption, sortDirection, isWatched]);

  const filteredMiners = useMemo(() => {
    let result = rankedMiners;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.githubId?.toLowerCase().includes(lowerQuery) ||
          m.author?.toLowerCase().includes(lowerQuery),
      );
    }

    result = result.filter((m) => {
      if (variant === 'watchlist') {
        return (
          passesOssEligibility(m, eligibleOssFilter) &&
          passesDiscoveryEligibility(m, eligibleDiscoveryFilter)
        );
      }
      return passesSingleProgramEligibility(m, eligibleOssFilter);
    });

    return result;
  }, [
    rankedMiners,
    searchQuery,
    variant,
    eligibleOssFilter,
    eligibleDiscoveryFilter,
  ]);

  useEffect(() => {
    if (visibleCount <= filteredMiners.length) return;
    setVisibleCount(0);
  }, [filteredMiners.length, visibleCount, setVisibleCount]);

  const visibleMiners = useMemo(
    () => filteredMiners.slice(0, visibleCount),
    [filteredMiners, visibleCount],
  );

  const remainingMiners = Math.max(
    0,
    filteredMiners.length - visibleMiners.length,
  );

  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('tabs-options-portal'));
  }, []);

  const usePortal = Boolean(portalTarget && isLargeScreen);

  useEffect(() => {
    if (!observerTarget.current || remainingMiners <= 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const nextVisibleCount = Math.min(
            visibleCount + MINERS_PAGE_SIZE,
            filteredMiners.length,
          );
          setVisibleCount(
            nextVisibleCount > MINERS_PAGE_SIZE ? nextVisibleCount : 0,
          );
        }
      },
      { root: null, rootMargin: '0px 0px 800px 0px', threshold: 0 },
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [remainingMiners, visibleCount, filteredMiners.length, setVisibleCount]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', px: { xs: 0, md: 1 }, py: 0 }}>
      {/* Header Card — two-row toolbar */}
      <SectionCard
        sx={{
          mb: 2,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: (theme: Theme) =>
            alpha(theme.palette.background.default, 0.65),
          backdropFilter: 'blur(12px)',
          borderBottom: (theme: Theme) =>
            `1px solid ${theme.palette.border.light}`,
          boxShadow: 'none',
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Row 1: Title + Search */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontSize: '1.25rem', fontWeight: 600, flexShrink: 0 }}
            >
              Miners ({filteredMiners.length})
            </Typography>
            <Box
              sx={{ flex: 1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}
            >
              <SearchInput
                value={searchQuery}
                onChange={handleSearchChange}
                width="100%"
                placeholder="Search miners..."
              />
            </Box>
          </Box>

          {/* Row 2: Sort tabs + Eligibility toggle */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 1,
            }}
          >
            <SortButtons
              sortOption={sortOption}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              variant={variant}
            />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                width: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'nowrap',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                {variant === 'watchlist' ? (
                  <WatchlistEligibilityBar
                    ossValue={eligibleOssFilter}
                    discoveryValue={eligibleDiscoveryFilter}
                    onOssChange={handleEligibleOssChange}
                    onDiscoveryChange={handleEligibleDiscoveryChange}
                  />
                ) : (
                  <EligibilityToggle
                    value={eligibleOssFilter}
                    onChange={handleEligibleOssChange}
                  />
                )}
                <ViewModeToggle
                  viewMode={viewMode}
                  onChange={handleViewModeChange}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </SectionCard>

      <Box sx={{ pt: 2 }}>
        {/* On large screens: render controls expanded in the sidebar */}
        {usePortal ? (
          <Portal container={portalTarget}>
            <ToolbarSidebarPanel
              sortOption={sortOption}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              variant={variant}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              eligibleOssFilter={eligibleOssFilter}
              eligibleDiscoveryFilter={eligibleDiscoveryFilter}
              onEligibleOssChange={handleEligibleOssChange}
              onEligibleDiscoveryChange={handleEligibleDiscoveryChange}
            />
          </Portal>
        ) : (
          <Box
            sx={{
              mb: 1.5,
              px: 2,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <ToolbarPopover
              sortOption={sortOption}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              variant={variant}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              eligibleOssFilter={eligibleOssFilter}
              eligibleDiscoveryFilter={eligibleDiscoveryFilter}
              onEligibleOssChange={handleEligibleOssChange}
              onEligibleDiscoveryChange={handleEligibleDiscoveryChange}
            />
          </Box>
        )}

        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {filteredMiners.length > 0 && viewMode === 'cards' && (
            <Grid container spacing={2}>
              {visibleMiners.map((miner) => (
                <Grid item xs={12} sm={12} md={6} lg={4} xl={4} key={miner.id}>
                  <MinerCard
                    miner={miner}
                    variant={variant}
                    href={getMinerHref(miner)}
                    linkState={linkState}
                    showDualEligibilityBadges={showDualEligibilityBadges}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {filteredMiners.length > 0 && viewMode === 'list' && (
            <MinersList
              miners={visibleMiners}
              variant={variant}
              sortOption={sortOption}
              sortDirection={sortDirection}
              onSort={handleSortChange}
              getHref={getMinerHref}
              linkState={linkState}
            />
          )}

          {remainingMiners > 0 && (
            <Box ref={observerTarget} sx={{ height: 20, width: '100%' }} />
          )}

          {filteredMiners.length === 0 && (
            <Box
              sx={(theme) => ({
                py: 8,
                textAlign: 'center',
                color: theme.palette.text.secondary,
              })}
            >
              <Typography sx={{ fontFamily: FONTS.mono }}>
                No miners found matching your filters.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

interface SortButtonsProps {
  sortOption: SortOption;
  sortDirection: SortOrder;
  onSortChange: (option: SortOption) => void;
  variant: LeaderboardVariant;
}

type SortButtonOption = { label: string; value: SortOption };

const getSortButtonOptions = (
  variant: LeaderboardVariant,
): SortButtonOption[] => {
  const scoreLabel = variant === 'watchlist' ? 'OSS' : 'Score';
  const earnings = { label: 'Earnings', value: 'usdPerDay' as const };
  const prs = { label: 'PRs', value: 'totalPRs' as const };
  const issues = { label: 'Issues', value: 'totalIssues' as const };
  const discovery = {
    label: 'Discovery',
    value: 'issueDiscoveryScore' as const,
  };
  const credibility = { label: 'Credibility', value: 'credibility' as const };
  const score = { label: scoreLabel, value: 'totalScore' as const };

  if (variant === 'watchlist') {
    return [score, discovery, earnings, prs, issues, credibility];
  }
  if (variant === 'discoveries') {
    return [score, earnings, issues, credibility];
  }
  return [score, earnings, prs, credibility];
};

const SortButtons: React.FC<SortButtonsProps> = ({
  sortOption,
  sortDirection,
  onSortChange,
  variant,
}) => (
  <Box
    sx={{
      display: 'flex',
      gap: 0.5,
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      width: '100%',
      minWidth: 0,
    }}
  >
    {getSortButtonOptions(variant).map((option) => {
      const isActive = sortOption === option.value;
      return (
        <Box
          key={option.value}
          onClick={() => onSortChange(option.value)}
          sx={(theme) => ({
            px: { xs: 0.75, sm: 1.5 },
            height: { xs: 30, sm: 32 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            borderRadius: 2,
            cursor: 'pointer',
            flex: 1,
            minWidth: 0,
            backgroundColor: isActive
              ? alpha(theme.palette.text.primary, 0.1)
              : 'transparent',
            color: isActive ? theme.palette.text.primary : STATUS_COLORS.open,
            border: '1px solid',
            borderColor: isActive ? theme.palette.border.medium : 'transparent',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: theme.palette.surface.light,
              color: theme.palette.text.primary,
            },
          })}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: { xs: '0.62rem', sm: '0.75rem' },
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {option.label}
          </Typography>
          {isActive && (
            <Typography
              component="span"
              sx={{ fontSize: '0.7rem', opacity: 0.7 }}
            >
              {sortDirection === 'asc' ? '▲' : '▼'}
            </Typography>
          )}
        </Box>
      );
    })}
  </Box>
);

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
}) => {
  const options: {
    value: ViewMode;
    label: string;
    Icon: typeof ViewListIcon;
  }[] = [
    { value: 'cards', label: 'Card view', Icon: ViewModuleIcon },
    { value: 'list', label: 'List view', Icon: ViewListIcon },
  ];

  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        height: 32,
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        backgroundColor: theme.palette.surface.subtle,
        overflow: 'hidden',
      })}
      role="group"
      aria-label="Toggle view mode"
    >
      {options.map(({ value, label, Icon }) => {
        const isActive = viewMode === value;
        return (
          <Tooltip key={value} title={label} placement="top" arrow>
            <Box
              component="button"
              type="button"
              onClick={() => onChange(value)}
              aria-label={label}
              aria-pressed={isActive}
              sx={(theme) => ({
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: '100%',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                backgroundColor: isActive
                  ? alpha(theme.palette.text.primary, 0.1)
                  : 'transparent',
                color: isActive
                  ? theme.palette.text.primary
                  : STATUS_COLORS.open,
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: theme.palette.surface.light,
                  color: theme.palette.text.primary,
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.status.info}`,
                  outlineOffset: -2,
                },
              })}
            >
              <Icon sx={{ fontSize: '1.05rem' }} />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

interface WatchlistEligibilityBarProps {
  ossValue: EligibilityFilter;
  discoveryValue: EligibilityFilter;
  onOssChange: (next: EligibilityFilter) => void;
  onDiscoveryChange: (next: EligibilityFilter) => void;
}

const WatchlistEligibilityBar: React.FC<WatchlistEligibilityBarProps> = ({
  ossValue,
  discoveryValue,
  onOssChange,
  onDiscoveryChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const popoverId = open ? 'watchlist-eligibility-popover' : undefined;
  const hasActiveFilter = ossValue !== 'all' || discoveryValue !== 'all';
  const ariaFilterSummary = `OSS ${ossValue}, Discovery ${discoveryValue}`;

  return (
    <>
      <Tooltip
        title="Eligibility filters — OSS and Discovery (both apply)"
        arrow
      >
        <Box
          component="button"
          type="button"
          id="watchlist-eligibility-trigger"
          aria-label={`Eligibility${hasActiveFilter ? ', filters applied' : ''}. ${ariaFilterSummary}.`}
          aria-describedby={popoverId}
          aria-controls={open ? popoverId : undefined}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={(e) => {
            setAnchorEl((prev) => (prev ? null : e.currentTarget));
          }}
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            pl: 1,
            pr: 0.75,
            py: 0.5,
            minHeight: 32,
            borderRadius: 2,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundColor: alpha(theme.palette.background.default, 0.45),
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.15s, border-color 0.15s',
            '&:hover': {
              backgroundColor: alpha(theme.palette.text.primary, 0.04),
              borderColor: theme.palette.border.medium,
            },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.status.info}`,
              outlineOffset: 2,
            },
          })}
        >
          <TuneOutlinedIcon
            sx={{
              fontSize: '1.1rem',
              color: 'text.secondary',
              flexShrink: 0,
            }}
          />
          <Typography
            component="span"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
          >
            Eligibility
            {hasActiveFilter ? (
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'status.info',
                  verticalAlign: 'middle',
                }}
                aria-hidden
              />
            ) : null}
          </Typography>
          <KeyboardArrowDownIcon
            sx={{
              fontSize: '1.15rem',
              color: 'text.secondary',
              flexShrink: 0,
              transform: open ? 'rotate(-180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          />
        </Box>
      </Tooltip>
      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: (theme) => ({
              mt: 0.75,
              boxSizing: 'border-box',
              width: 'fit-content',
              maxWidth: 'min(300px, calc(100vw - 24px))',
              minWidth: 0,
              overflowY: 'visible',
              overflowX: 'hidden',
              borderRadius: 2,
              border: `1px solid ${theme.palette.border.light}`,
              backgroundImage: 'none',
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.shadows[12],
            }),
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            boxSizing: 'border-box',
            maxWidth: '100%',
          }}
        >
          <Box sx={{ maxWidth: '100%' }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, fontFamily: FONTS.mono, mb: 0.5 }}
            >
              Eligibility
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                lineHeight: 1.5,
                maxWidth: '15rem',
              }}
            >
              Filter pinned miners by OSS track and Issue discovery eligibility.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Typography
              component="div"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'text.secondary',
                textTransform: 'uppercase',
              }}
            >
              OSS contributions
            </Typography>
            <EligibilityToggle value={ossValue} onChange={onOssChange} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Typography
              component="div"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'text.secondary',
                textTransform: 'uppercase',
              }}
            >
              Issue discovery
            </Typography>
            <EligibilityToggle
              value={discoveryValue}
              onChange={onDiscoveryChange}
            />
          </Box>
        </Box>
      </Popover>
    </>
  );
};

interface EligibilityToggleProps {
  value: EligibilityFilter;
  onChange: (next: EligibilityFilter) => void;
  /** Tighter pills for the dual watchlist bar. */
  compact?: boolean;
}

const ELIGIBILITY_OPTIONS: Array<{ value: EligibilityFilter; label: string }> =
  [
    { value: 'all', label: 'All' },
    { value: 'eligible', label: 'Eligible' },
    { value: 'ineligible', label: 'Ineligible' },
  ];

const EligibilityToggle: React.FC<EligibilityToggleProps> = ({
  value,
  onChange,
  compact = false,
}) => (
  <Box
    sx={(theme) => ({
      display: 'inline-flex',
      gap: compact ? 0.3 : 0.28,
      p: compact ? 0.3 : 0.35,
      borderRadius: 1.75,
      backgroundColor: theme.palette.surface.light,
      flexShrink: 0,
    })}
  >
    {ELIGIBILITY_OPTIONS.map((option) => {
      const isActive = value === option.value;
      return (
        <Box
          key={option.value}
          component="button"
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(option.value)}
          sx={(theme) => ({
            px: compact ? 0.9 : 1.2,
            height: compact ? 22 : 24,
            display: 'flex',
            alignItems: 'center',
            border: 0,
            borderRadius: 1.25,
            backgroundColor: isActive
              ? alpha(theme.palette.text.primary, 0.15)
              : 'transparent',
            color: isActive
              ? theme.palette.text.primary
              : theme.palette.text.tertiary,
            cursor: 'pointer',
            fontFamily: FONTS.mono,
            fontSize: compact ? '0.65rem' : '0.72rem',
            fontWeight: isActive ? 600 : 500,
            lineHeight: 1,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: alpha(theme.palette.text.primary, 0.1),
              color: theme.palette.text.primary,
            },
            '&:focus-visible': {
              outline: `1px solid ${theme.palette.border.medium}`,
              outlineOffset: 1,
            },
          })}
        >
          {option.label}
        </Box>
      );
    })}
  </Box>
);

/* ─── ToolbarSidebarPanel: all controls rendered inline for sidebar ── */

const sidebarLabelSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.65rem',
  fontWeight: 600,
  color: 'text.secondary',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  mb: 1,
} as const;

const ToolbarSidebarPanel: React.FC<ToolbarPopoverProps> = (props) => {
  const [open, setOpen] = useState(false);

  const defaultOssFilter = props.variant === 'watchlist' ? 'all' : 'eligible';
  const hasActiveFilter =
    props.eligibleOssFilter !== defaultOssFilter ||
    props.eligibleDiscoveryFilter !== 'all' ||
    props.viewMode !== 'cards';

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
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Filters
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
          <ToolbarSidebarPanelContent {...props} />
        </Box>
      </Collapse>
    </Box>
  );
};

const ToolbarSidebarPanelContent: React.FC<ToolbarPopoverProps> = ({
  sortOption,
  sortDirection,
  onSortChange,
  variant,
  viewMode,
  onViewModeChange,
  eligibleOssFilter,
  eligibleDiscoveryFilter,
  onEligibleOssChange,
  onEligibleDiscoveryChange,
}) => (
  <>
    {/* Sort */}
    <Box>
      <Typography sx={sidebarLabelSx}>Sort by</Typography>
      <SortButtons
        sortOption={sortOption}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
        variant={variant}
      />
    </Box>

    {/* Eligibility — always inline, no popovers */}
    <Box>
      <Typography sx={sidebarLabelSx}>Eligibility</Typography>
      {variant === 'watchlist' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Typography
              component="div"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'text.secondary',
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              OSS
            </Typography>
            <EligibilityToggle
              value={eligibleOssFilter}
              onChange={onEligibleOssChange}
              compact
            />
          </Box>
          <Box>
            <Typography
              component="div"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'text.secondary',
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              Discovery
            </Typography>
            <EligibilityToggle
              value={eligibleDiscoveryFilter}
              onChange={onEligibleDiscoveryChange}
              compact
            />
          </Box>
        </Box>
      ) : (
        <EligibilityToggle
          value={eligibleOssFilter}
          onChange={onEligibleOssChange}
        />
      )}
    </Box>

    {/* View mode */}
    <Box>
      <Typography sx={sidebarLabelSx}>View</Typography>
      <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
    </Box>
  </>
);

/* ─── ToolbarPopover: single icon → all controls ─────────────── */

interface ToolbarPopoverProps {
  sortOption: SortOption;
  sortDirection: SortOrder;
  onSortChange: (option: SortOption) => void;
  variant: LeaderboardVariant;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  eligibleOssFilter: EligibilityFilter;
  eligibleDiscoveryFilter: EligibilityFilter;
  onEligibleOssChange: (next: EligibilityFilter) => void;
  onEligibleDiscoveryChange: (next: EligibilityFilter) => void;
}

const ToolbarPopover: React.FC<ToolbarPopoverProps> = ({
  sortOption,
  sortDirection,
  onSortChange,
  variant,
  viewMode,
  onViewModeChange,
  eligibleOssFilter,
  eligibleDiscoveryFilter,
  onEligibleOssChange,
  onEligibleDiscoveryChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const defaultOssFilter = variant === 'watchlist' ? 'all' : 'eligible';
  const hasActiveFilter =
    eligibleOssFilter !== defaultOssFilter || eligibleDiscoveryFilter !== 'all';

  return (
    <>
      <Tooltip title="Sort & filter options" arrow>
        <Box
          component="button"
          type="button"
          onClick={(e) =>
            setAnchorEl((prev) => (prev ? null : e.currentTarget))
          }
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            minHeight: 32,
            borderRadius: 2,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundColor: open
              ? alpha(theme.palette.text.primary, 0.06)
              : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              backgroundColor: alpha(theme.palette.text.primary, 0.04),
              borderColor: theme.palette.border.medium,
            },
          })}
        >
          <TuneOutlinedIcon
            sx={{ fontSize: '1rem', color: 'text.secondary' }}
          />
          <Typography
            component="span"
            sx={{
              fontFamily: FONTS.mono,
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
            sx: (theme) => ({
              mt: 1,
              p: 2.5,
              minWidth: 280,
              borderRadius: 3,
              border: `1px solid ${theme.palette.border.light}`,
              backgroundColor: theme.palette.background.default,
              backgroundImage: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }),
          },
        }}
      >
        {/* Sort */}
        <Box>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: 1,
            }}
          >
            Sort by
          </Typography>
          <SortButtons
            sortOption={sortOption}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
            variant={variant}
          />
        </Box>

        {/* Eligibility */}
        <Box>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: 1,
            }}
          >
            Eligibility
          </Typography>
          {variant === 'watchlist' ? (
            <WatchlistEligibilityBar
              ossValue={eligibleOssFilter}
              discoveryValue={eligibleDiscoveryFilter}
              onOssChange={onEligibleOssChange}
              onDiscoveryChange={onEligibleDiscoveryChange}
            />
          ) : (
            <EligibilityToggle
              value={eligibleOssFilter}
              onChange={onEligibleOssChange}
            />
          )}
        </Box>

        {/* View mode */}
        <Box>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: 1,
            }}
          >
            View
          </Typography>
          <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
        </Box>
      </Popover>
    </>
  );
};

export default TopMinersTable;

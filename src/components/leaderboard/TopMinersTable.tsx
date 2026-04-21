import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  IconButton,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { SectionCard } from './SectionCard';
import { MinerCard } from './MinerCard';
import { MinersList } from './MinersList';
import { SearchInput } from '../common/SearchInput';
import { STATUS_COLORS } from '../../theme';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import { type SortOrder } from '../../utils/ExplorerUtils';
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
const VIEW_QUERY_PARAM = 'view';
const SEARCH_QUERY_PARAM = 'search';
const VISIBLE_QUERY_PARAM = 'visible';
const VIEW_STORAGE_KEY = 'leaderboard:viewMode';
// Sort state (`sort`, `dir`) is owned by `useDataTableParams`. We reuse the
// `page` param slot for our "show more" count via the paramKeys override.

const readStoredViewMode = (): ViewMode => {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'list'
      ? 'list'
      : 'cards';
  } catch {
    return 'cards';
  }
};

const writeStoredViewMode = (mode: ViewMode) => {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
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
    return ['totalScore', 'usdPerDay', 'totalIssues', 'credibility'];
  if (variant === 'watchlist')
    return [
      'totalScore',
      'usdPerDay',
      'totalPRs',
      'totalIssues',
      'credibility',
    ];
  return ['totalScore', 'usdPerDay', 'totalPRs', 'credibility'];
};

type EligibilityFilter = 'all' | 'eligible' | 'ineligible';

const compareMiners = (
  a: MinerStats,
  b: MinerStats,
  option: SortOption,
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
    case 'credibility':
      return (a.credibility ?? 0) - (b.credibility ?? 0);
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

  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSmUp) setMobileSearchOpen(false);
  }, [isSmUp]);

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
              : readStoredViewMode(),
        serialize: (value: ViewMode): string => value,
        resetPageOnChange: false,
      },
      eligible: {
        paramKey: ELIGIBLE_QUERY_PARAM,
        parse: (raw: string | null): EligibilityFilter =>
          raw === 'true' ? 'eligible' : raw === 'false' ? 'ineligible' : 'all',
        serialize: (value: EligibilityFilter): string | null =>
          value === 'all' ? null : value === 'eligible' ? 'true' : 'false',
      },
      search: {
        paramKey: SEARCH_QUERY_PARAM,
        parse: (raw: string | null): string => raw ?? '',
        serialize: (value: string): string | null => value.trim() || null,
      },
    }),
    [],
  );

  const {
    sortField: sortOption,
    sortOrder: sortDirection,
    setSort: handleSortChange,
    page: storedVisibleCount,
    setPage: setVisibleCount,
    filters: {
      view: viewMode,
      eligible: eligibilityFilter,
      search: searchQuery,
    },
    setFilter,
  } = useDataTableParams<
    SortOption,
    { view: ViewMode; eligible: EligibilityFilter; search: string }
  >({
    sortKeys: allowedSortKeys,
    defaultSortKey: 'totalScore',
    // Reuse the hook's `page` slot for our "show more" count — setSort and
    // filter changes reset it, which is the behavior we want.
    paramKeys: { page: VISIBLE_QUERY_PARAM },
    filters: filtersConfig,
  });

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
      writeStoredViewMode(nextMode);
      setFilter('view', nextMode);
    },
    [setFilter],
  );

  const handleEligibilityChange = useCallback(
    (nextFilter: EligibilityFilter) => setFilter('eligible', nextFilter),
    [setFilter],
  );

  const handleSearchChange = useCallback(
    (nextQuery: string) => {
      if (!nextQuery.trim() && !isSmUp) {
        setMobileSearchOpen(false);
      }
      setFilter('search', nextQuery);
    },
    [isSmUp, setFilter],
  );

  const minersAfterEligibilityOnly = useMemo(() => {
    if (eligibilityFilter === 'eligible') {
      return miners.filter((m) => m.isEligible);
    }
    if (eligibilityFilter === 'ineligible') {
      return miners.filter((m) => !m.isEligible);
    }
    return miners;
  }, [miners, eligibilityFilter]);

  const handleMobileSearchBlur = useCallback(() => {
    if (!isSmUp && !searchQuery.trim()) {
      setMobileSearchOpen(false);
    }
  }, [isSmUp, searchQuery]);

  const filteredMiners = useMemo(() => {
    let result = miners;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.githubId?.toLowerCase().includes(lowerQuery) ||
          m.author?.toLowerCase().includes(lowerQuery),
      );
    }

    if (eligibilityFilter === 'eligible') {
      result = result.filter((m) => m.isEligible);
    } else if (eligibilityFilter === 'ineligible') {
      result = result.filter((m) => !m.isEligible);
    }

    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
    return [...result]
      .sort((a, b) => compareMiners(a, b, sortOption) * directionMultiplier)
      .map((miner, index) => ({ ...miner, rank: index + 1 }));
  }, [miners, searchQuery, eligibilityFilter, sortOption, sortDirection]);

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

  const searchActive = searchQuery.trim().length > 0;
  const minersTitle = searchActive
    ? `Miners (${filteredMiners.length}/${minersAfterEligibilityOnly.length})`
    : `Miners (${filteredMiners.length})`;

  const showMobileSearchField = isSmUp || mobileSearchOpen || searchActive;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 0, sm: 2 } }}>
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
        <Box
          sx={{
            p: { xs: 1.25, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {/* Row 1: Title + Search */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              flexWrap: 'nowrap',
              width: '100%',
              minWidth: 0,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1.05rem', sm: '1.25rem' },
                fontWeight: 600,
                flexShrink: 0,
                minWidth: 0,
              }}
            >
              {minersTitle}
            </Typography>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                justifyContent: { xs: 'flex-end', sm: 'stretch' },
                alignItems: 'center',
              }}
            >
              {showMobileSearchField ? (
                <Box sx={{ width: '100%', maxWidth: { sm: 'none' } }}>
                  <SearchInput
                    value={searchQuery}
                    onChange={handleSearchChange}
                    width="100%"
                    placeholder="Search miners..."
                    inputRef={mobileSearchInputRef}
                    autoFocus={!isSmUp && mobileSearchOpen}
                    onBlur={handleMobileSearchBlur}
                  />
                </Box>
              ) : (
                <IconButton
                  type="button"
                  size="small"
                  aria-label="Search miners"
                  onClick={() => {
                    setMobileSearchOpen(true);
                    requestAnimationFrame(() => {
                      mobileSearchInputRef.current?.focus();
                    });
                  }}
                  sx={(t) => ({
                    color: t.palette.text.secondary,
                    border: `1px solid ${t.palette.border.light}`,
                    borderRadius: 2,
                    p: 0.75,
                  })}
                >
                  <SearchIcon sx={{ fontSize: '1.15rem' }} />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Row 2: Sort tabs + Eligibility toggle */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: { xs: 'stretch', lg: 'center' },
              justifyContent: 'space-between',
              gap: { xs: 1.25, lg: 1 },
            }}
          >
            <SortButtons
              sortOption={sortOption}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              variant={variant}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EligibilityToggle
                value={eligibilityFilter}
                onChange={handleEligibilityChange}
              />
              <ViewModeToggle
                viewMode={viewMode}
                onChange={handleViewModeChange}
              />
            </Box>
          </Box>
        </Box>
      </SectionCard>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredMiners.length > 0 && viewMode === 'cards' && (
          <Grid container spacing={2}>
            {visibleMiners.map((miner) => (
              <Grid item xs={12} sm={12} md={6} lg={6} xl={4} key={miner.id}>
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
          <Box
            onClick={() => {
              const nextVisibleCount = Math.min(
                visibleCount + MINERS_PAGE_SIZE,
                filteredMiners.length,
              );
              // Pass 0 when at/below the initial batch → hook deletes the param.
              setVisibleCount(
                nextVisibleCount > MINERS_PAGE_SIZE ? nextVisibleCount : 0,
              );
            }}
            sx={(theme) => ({
              py: 1.25,
              borderRadius: 2,
              border: `1px solid ${theme.palette.border.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: theme.palette.surface.subtle,
              color: STATUS_COLORS.open,
              '&:hover': {
                backgroundColor: theme.palette.surface.light,
                color: theme.palette.text.primary,
                borderColor: theme.palette.border.light,
              },
            })}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Show {Math.min(MINERS_PAGE_SIZE, remainingMiners)} More
            </Typography>
          </Box>
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
  );
};

interface SortButtonsProps {
  sortOption: SortOption;
  sortDirection: SortOrder;
  onSortChange: (option: SortOption) => void;
  variant: LeaderboardVariant;
}

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
      flexWrap: 'nowrap',
      justifyContent: { xs: 'flex-start', lg: 'center' },
      width: { xs: '100%', lg: 'auto' },
      minWidth: 0,
      overflowX: 'auto',
      pb: 0.25,
      mx: { xs: -0.25, sm: 0 },
      px: { xs: 0.25, sm: 0 },
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'thin',
    }}
  >
    {[
      { label: 'Score', value: 'totalScore' },
      { label: 'Earnings', value: 'usdPerDay' },
      ...(variant !== 'discoveries'
        ? [{ label: 'PRs', value: 'totalPRs' as const }]
        : []),
      ...(variant === 'discoveries' || variant === 'watchlist'
        ? [{ label: 'Issues', value: 'totalIssues' as const }]
        : []),
      { label: 'Credibility', value: 'credibility' },
    ].map((option) => {
      const isActive = sortOption === option.value;
      return (
        <Box
          key={option.value}
          onClick={() => onSortChange(option.value as SortOption)}
          sx={(theme) => ({
            px: 1.5,
            py: { xs: 0.75, sm: 0 },
            minHeight: { xs: 40, sm: 32 },
            height: { xs: 'auto', sm: 32 },
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
            borderRadius: 2,
            cursor: 'pointer',
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
              fontSize: { xs: '0.72rem', sm: '0.75rem' },
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

interface EligibilityToggleProps {
  value: EligibilityFilter;
  onChange: (next: EligibilityFilter) => void;
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
}) => (
  <Box
    sx={(theme) => ({
      display: 'flex',
      flexWrap: { xs: 'wrap', sm: 'nowrap' },
      justifyContent: 'center',
      gap: 0.5,
      p: 0.5,
      borderRadius: 2,
      backgroundColor: theme.palette.surface.light,
      width: { xs: '100%', sm: 'auto' },
      maxWidth: { xs: 420, sm: 'none' },
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
            px: 1.5,
            minHeight: { xs: 36, sm: 24 },
            height: { xs: 'auto', sm: 24 },
            flex: { xs: '1 1 auto', sm: '0 0 auto' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 0,
            borderRadius: 1.5,
            backgroundColor: isActive
              ? alpha(theme.palette.text.primary, 0.15)
              : 'transparent',
            color: isActive
              ? theme.palette.text.primary
              : theme.palette.text.tertiary,
            cursor: 'pointer',
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
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

export default TopMinersTable;

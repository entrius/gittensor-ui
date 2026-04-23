import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Tooltip,
  Select,
  FormControl,
  IconButton,
  MenuItem,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { SectionCard } from './SectionCard';
import { MinerCard } from './MinerCard';
import { MinersList } from './MinersList';
import { SearchInput } from '../common/SearchInput';
import { STATUS_COLORS } from '../../theme';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import {
  type MinerStats,
  type SortOption,
  type LeaderboardVariant,
  type LeaderboardMode,
  FONTS,
} from './types';
import FilterButton from '../FilterButton';

type ViewMode = 'cards' | 'list';

// Re-export MinerStats for backward compatibility
export type { MinerStats } from './types';

const MINERS_PAGE_SIZE = 60;
const ELIGIBLE_QUERY_PARAM = 'eligible';
const VIEW_QUERY_PARAM = 'view';
const SEARCH_QUERY_PARAM = 'search';
const VISIBLE_QUERY_PARAM = 'visible';
const VIEW_STORAGE_KEY = 'leaderboard:viewMode';
const ELIGIBILITY_QUERY_PARAM = 'eligibility';
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
  mode?: LeaderboardMode;
}

const getAllowedSortOptions = (
  variant: LeaderboardVariant,
  mode: LeaderboardMode,
): SortOption[] => {
  if (mode === 'leaderboard')
    return [
      'ossScore',
      'issueScore',
      'usdPerDay',
      'totalPRs',
      'totalIssues',
      'ossCredibility',
      'issueCredibility',
    ];
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

type LegacyEligibilityFilter = 'all' | 'eligible' | 'ineligible';
type EligibilityFilter =
  | 'all'
  | 'ossEligible'
  | 'ossIneligible'
  | 'discoveriesEligible'
  | 'discoveriesIneligible';

const compareMiners = (
  a: MinerStats,
  b: MinerStats,
  option: SortOption,
  mode: LeaderboardMode,
): number => {
  const getScore = (m: MinerStats) => {
    if (mode === 'leaderboard') {
      // If someone passes legacy `totalScore` while in leaderboard mode,
      // treat it as OSS score (default program).
      return Number(m.totalScore ?? 0);
    }
    return Number(m.totalScore ?? 0);
  };

  const getCred = (m: MinerStats) => {
    if (mode === 'leaderboard') {
      // Legacy key in leaderboard mode maps to OSS credibility.
      return Number(m.credibility ?? 0);
    }
    return Number(m.credibility ?? 0);
  };

  switch (option) {
    case 'totalScore':
      return getScore(a) - getScore(b);
    case 'ossScore':
      return Number(a.totalScore ?? 0) - Number(b.totalScore ?? 0);
    case 'issueScore':
      return (
        Number(a.issueDiscoveryScore ?? 0) - Number(b.issueDiscoveryScore ?? 0)
      );
    case 'usdPerDay':
      return (a.usdPerDay ?? 0) - (b.usdPerDay ?? 0);
    case 'totalPRs':
      return a.totalPRs - b.totalPRs;
    case 'totalIssues':
      return (a.totalIssues ?? 0) - (b.totalIssues ?? 0);
    case 'credibility':
      return getCred(a) - getCred(b);
    case 'ossCredibility':
      return Number(a.credibility ?? 0) - Number(b.credibility ?? 0);
    case 'issueCredibility':
      return Number(a.issueCredibility ?? 0) - Number(b.issueCredibility ?? 0);
    default:
      return 0;
  }
};

export const TopMinersTable: React.FC<TopMinersTableProps> = ({
  miners,
  isLoading,
  getMinerHref,
  linkState,
  variant = 'oss',
  showDualEligibilityBadges = false,
  mode = 'default',
}) => {
  const allowedSortKeys = useMemo(
    () => getAllowedSortOptions(variant, mode),
    [variant, mode],
  );

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
      ...(mode === 'leaderboard'
        ? {
            eligibility: {
              paramKey: ELIGIBILITY_QUERY_PARAM,
              parse: (raw: string | null): EligibilityFilter =>
                raw === 'ossEligible' ||
                raw === 'ossIneligible' ||
                raw === 'discoveriesEligible' ||
                raw === 'discoveriesIneligible'
                  ? raw
                  : 'all',
              serialize: (
                value: EligibilityFilter | undefined,
              ): string | null => (!value || value === 'all' ? null : value),
            },
          }
        : {
            eligible: {
              paramKey: ELIGIBLE_QUERY_PARAM,
              parse: (raw: string | null): LegacyEligibilityFilter =>
                raw === 'true'
                  ? 'eligible'
                  : raw === 'false'
                    ? 'ineligible'
                    : 'all',
              serialize: (
                value: LegacyEligibilityFilter | undefined,
              ): string | null =>
                value === 'all'
                  ? null
                  : value === 'eligible'
                    ? 'true'
                    : 'false',
            },
          }),
      search: {
        paramKey: SEARCH_QUERY_PARAM,
        parse: (raw: string | null): string => raw ?? '',
        serialize: (value: string): string | null => value.trim() || null,
      },
    }),
    [mode],
  );

  const {
    sortField: sortOption,
    sortOrder: sortDirection,
    setSort: handleSortChange,
    page: storedVisibleCount,
    setPage: setVisibleCount,
    filters,
    setFilter,
  } = useDataTableParams<
    SortOption,
    {
      view: ViewMode;
      search: string;
      eligible?: LegacyEligibilityFilter;
      eligibility?: EligibilityFilter;
    }
  >({
    sortKeys: allowedSortKeys,
    defaultSortKey: mode === 'leaderboard' ? 'ossScore' : 'totalScore',
    // Reuse the hook's `page` slot for our "show more" count — setSort and
    // filter changes reset it, which is the behavior we want.
    paramKeys: { page: VISIBLE_QUERY_PARAM },
    filters: filtersConfig,
  });

  const viewMode = filters.view as ViewMode;
  const searchQuery = filters.search as string;
  const legacyEligibilityFilter = (
    filters as { eligible?: LegacyEligibilityFilter }
  ).eligible;
  const eligibilityFilter = (filters as { eligibility?: EligibilityFilter })
    .eligibility;

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
    (nextFilter: EligibilityFilter | LegacyEligibilityFilter) => {
      if (mode === 'leaderboard') {
        setFilter('eligibility' as never, nextFilter as never);
        return;
      }
      setFilter('eligible' as never, nextFilter as never);
    },
    [mode, setFilter],
  );

  const handleSearchChange = useCallback(
    (nextQuery: string) => setFilter('search', nextQuery),
    [setFilter],
  );

  const eligibilityCounts = useMemo(() => {
    if (mode !== 'leaderboard') return null;
    const ossEligibleCount = miners.filter((m) => m.ossIsEligible).length;
    const discoveriesEligibleCount = miners.filter(
      (m) => m.discoveriesIsEligible,
    ).length;
    return {
      all: miners.length,
      ossEligible: ossEligibleCount,
      ossIneligible: miners.length - ossEligibleCount,
      discoveriesEligible: discoveriesEligibleCount,
      discoveriesIneligible: miners.length - discoveriesEligibleCount,
    };
  }, [miners, mode]);

  // Rank is computed on the full sorted leaderboard so each miner keeps their
  // true position regardless of filters. Filtering (search / eligibility) then
  // only hides rows without renumbering the ones that remain. Sort direction
  // is included so the list view's asc/desc toggle ranks consistently.
  const rankedMiners = useMemo(() => {
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
    return [...miners]
      .sort(
        (a, b) => compareMiners(a, b, sortOption, mode) * directionMultiplier,
      )
      .map((miner, index) => ({ ...miner, rank: index + 1 }));
  }, [miners, sortOption, sortDirection, mode]);

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

    if (mode === 'leaderboard') {
      const filterValue: EligibilityFilter = eligibilityFilter ?? 'all';
      if (filterValue === 'ossEligible')
        result = result.filter((m) => m.ossIsEligible ?? false);
      else if (filterValue === 'ossIneligible')
        result = result.filter((m) => !(m.ossIsEligible ?? false));
      else if (filterValue === 'discoveriesEligible')
        result = result.filter((m) => m.discoveriesIsEligible ?? false);
      else if (filterValue === 'discoveriesIneligible')
        result = result.filter((m) => !(m.discoveriesIsEligible ?? false));
    } else {
      const legacy = legacyEligibilityFilter ?? 'all';
      if (legacy === 'eligible') result = result.filter((m) => m.isEligible);
      else if (legacy === 'ineligible')
        result = result.filter((m) => !m.isEligible);
    }

    return result;
  }, [
    rankedMiners,
    searchQuery,
    eligibilityFilter,
    legacyEligibilityFilter,
    mode,
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
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
          {mode === 'leaderboard' ? (
            <>
              {/* Row 1: Filter (left) + Sort (right) */}
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: { xs: 'wrap', md: 'nowrap' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <EligibilityTimelineToggle
                    value={(eligibilityFilter ?? 'all') as EligibilityFilter}
                    onChange={(next) => handleEligibilityChange(next)}
                    counts={eligibilityCounts}
                  />
                </Box>
                {viewMode === 'cards' ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: 1,
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        color: 'text.secondary',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Sort:
                    </Typography>
                    <FormControl size="small">
                      <Select
                        value={sortOption}
                        onChange={(e) => {
                          const next = e.target.value as SortOption;
                          if (next !== sortOption) handleSortChange(next);
                        }}
                        sx={{
                          color: 'text.primary',
                          backgroundColor: 'background.default',
                          fontSize: '0.8rem',
                          height: '36px',
                          borderRadius: 2,
                          minWidth: '190px',
                          '& fieldset': { borderColor: 'border.light' },
                          '&:hover fieldset': { borderColor: 'border.medium' },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                          '& .MuiSelect-select': { py: 0.75 },
                        }}
                      >
                        {(
                          [
                            { value: 'ossScore', label: 'OSS Score' },
                            { value: 'issueScore', label: 'Issues Score' },
                            { value: 'usdPerDay', label: 'Earnings' },
                            { value: 'totalPRs', label: 'PRs' },
                            { value: 'totalIssues', label: 'Issues' },
                            {
                              value: 'ossCredibility',
                              label: 'OSS Credibility',
                            },
                            {
                              value: 'issueCredibility',
                              label: 'Issues Credibility',
                            },
                          ] as const
                        ).map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Tooltip
                      title={
                        sortDirection === 'asc' ? 'Ascending' : 'Descending'
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleSortChange(sortOption)}
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
                        aria-label={
                          sortDirection === 'asc'
                            ? 'Sort descending'
                            : 'Sort ascending'
                        }
                      >
                        {sortDirection === 'asc' ? (
                          <ArrowUpwardIcon fontSize="small" />
                        ) : (
                          <ArrowDownwardIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : null}
              </Box>

              {/* Row 2: Search (left) + View mode (right) */}
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  <SearchInput
                    value={searchQuery}
                    onChange={handleSearchChange}
                    width="100%"
                    placeholder="Search miners..."
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ViewModeToggle
                    viewMode={viewMode}
                    onChange={handleViewModeChange}
                  />
                </Box>
              </Box>
            </>
          ) : (
            /* Row 1: Title + Search + Filters + View */
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                width: '100%',
                justifyContent: 'space-between',
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EligibilityToggle
                  value={
                    (legacyEligibilityFilter ??
                      'all') as LegacyEligibilityFilter
                  }
                  onChange={handleEligibilityChange}
                />
                <ViewModeToggle
                  viewMode={viewMode}
                  onChange={handleViewModeChange}
                />
              </Box>
            </Box>
          )}

          {/* Sort controls (card view only — non-leaderboard) */}
          {mode !== 'leaderboard' && viewMode === 'cards' ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                }}
              >
                Sort:
              </Typography>
              <FormControl size="small">
                <Select
                  value={sortOption}
                  onChange={(e) => {
                    const next = e.target.value as SortOption;
                    if (next !== sortOption) handleSortChange(next);
                  }}
                  sx={{
                    color: 'text.primary',
                    backgroundColor: 'background.default',
                    fontSize: '0.8rem',
                    height: '36px',
                    borderRadius: 2,
                    minWidth: '170px',
                    '& fieldset': { borderColor: 'border.light' },
                    '&:hover fieldset': { borderColor: 'border.medium' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                    '& .MuiSelect-select': { py: 0.75 },
                  }}
                >
                  {(
                    [
                      { value: 'totalScore', label: 'Score' },
                      { value: 'usdPerDay', label: 'Earnings' },
                      ...(variant !== 'discoveries'
                        ? [{ value: 'totalPRs', label: 'PRs' } as const]
                        : []),
                      ...(variant === 'discoveries' || variant === 'watchlist'
                        ? [{ value: 'totalIssues', label: 'Issues' } as const]
                        : []),
                      { value: 'credibility', label: 'Credibility' },
                    ] as const
                  ).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip
                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                <IconButton
                  size="small"
                  onClick={() => handleSortChange(sortOption)}
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
                  aria-label={
                    sortDirection === 'asc'
                      ? 'Sort descending'
                      : 'Sort ascending'
                  }
                >
                  {sortDirection === 'asc' ? (
                    <ArrowUpwardIcon fontSize="small" />
                  ) : (
                    <ArrowDownwardIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          ) : null}
        </Box>
      </SectionCard>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            mode={mode}
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
  value: LegacyEligibilityFilter;
  onChange: (next: LegacyEligibilityFilter) => void;
}

const ELIGIBILITY_OPTIONS: Array<{
  value: LegacyEligibilityFilter;
  label: string;
}> = [
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
      display: 'inline-flex',
      gap: 0.5,
      p: 0.5,
      borderRadius: 2,
      backgroundColor: theme.palette.surface.light,
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
            height: 24,
            display: 'flex',
            alignItems: 'center',
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

const ELIGIBILITY_MENU_OPTIONS: Array<{
  value: EligibilityFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'ossEligible', label: 'OSS eligible' },
  { value: 'ossIneligible', label: 'OSS ineligible' },
  { value: 'discoveriesEligible', label: 'Issues eligible' },
  { value: 'discoveriesIneligible', label: 'Issues ineligible' },
];

const EligibilityTimelineToggle: React.FC<{
  value: EligibilityFilter;
  onChange: (next: EligibilityFilter) => void;
  counts: null | {
    all: number;
    ossEligible: number;
    ossIneligible: number;
    discoveriesEligible: number;
    discoveriesIneligible: number;
  };
}> = ({ value, onChange, counts }) => (
  <Box
    sx={{
      display: 'flex',
      gap: 0.5,
      alignItems: 'center',
      flexWrap: 'wrap',
    }}
    role="tablist"
    aria-label="Eligibility timeline"
  >
    {ELIGIBILITY_MENU_OPTIONS.map((opt) => {
      const isActive = value === opt.value;
      const count = counts?.[opt.value as keyof NonNullable<typeof counts>];
      return (
        <FilterButton
          key={opt.value}
          label={opt.label}
          isActive={isActive}
          count={count}
          color={STATUS_COLORS.open}
          onClick={() => onChange(opt.value)}
        />
      );
    })}
  </Box>
);

export default TopMinersTable;

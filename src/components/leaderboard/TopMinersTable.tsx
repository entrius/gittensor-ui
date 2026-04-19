import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  FormControl,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';
import { SectionCard } from './SectionCard';
import { MinerCard } from './MinerCard';
import { SearchInput } from '../common/SearchInput';
import { STATUS_COLORS } from '../../theme';
import {
  type MinerStats,
  type SortOption,
  type LeaderboardVariant,
  FONTS,
} from './types';

// Re-export MinerStats for backward compatibility
export type { MinerStats } from './types';

const MINERS_PAGE_SIZE = 60;
const SORT_QUERY_PARAM = 'sort';
const ELIGIBLE_QUERY_PARAM = 'eligible';
const SEARCH_QUERY_PARAM = 'search';
const VISIBLE_QUERY_PARAM = 'visible';

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

const getSortOptionFromQuery = (
  value: string | null,
  variant: LeaderboardVariant,
): SortOption => {
  if (!value) return 'totalScore';

  const allowedOptions = getAllowedSortOptions(variant);
  return allowedOptions.includes(value as SortOption)
    ? (value as SortOption)
    : 'totalScore';
};

type EligibilityFilter =
  | 'all'
  | 'eligible'
  | 'ineligible'
  | 'oss'
  | 'issues'
  | 'both';

const getEligibilityFilterFromQuery = (
  value: string | null,
  variant: LeaderboardVariant,
): EligibilityFilter => {
  if (variant === 'watchlist') {
    if (!value) return 'all';
    if (value === 'false') return 'ineligible';
    if (value === 'oss' || value === 'issues' || value === 'both') return value;
    // Legacy single "Eligible" (?eligible=true) meant OSS ∪ Issues — map to OSS-only filter.
    if (value === 'true') return 'oss';
    return 'all';
  }
  if (value === 'true') return 'eligible';
  if (value === 'false') return 'ineligible';
  return 'all';
};

const getVisibleCountFromQuery = (value: string | null): number => {
  if (!value) return MINERS_PAGE_SIZE;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < MINERS_PAGE_SIZE) {
    return MINERS_PAGE_SIZE;
  }

  return parsed;
};

const TopMinersTable: React.FC<TopMinersTableProps> = ({
  miners,
  isLoading,
  getMinerHref,
  linkState,
  variant = 'oss',
  showDualEligibilityBadges = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get(SEARCH_QUERY_PARAM) ?? '';
  const sortParamValue = searchParams.get(SORT_QUERY_PARAM);
  const sortOption = useMemo(
    () => getSortOptionFromQuery(sortParamValue, variant),
    [sortParamValue, variant],
  );
  const eligibilityFilter = useMemo(
    () =>
      getEligibilityFilterFromQuery(
        searchParams.get(ELIGIBLE_QUERY_PARAM),
        variant,
      ),
    [searchParams, variant],
  );
  const visibleCount = useMemo(
    () => getVisibleCountFromQuery(searchParams.get(VISIBLE_QUERY_PARAM)),
    [searchParams],
  );

  const handleSortChange = useCallback(
    (nextSortOption: SortOption) => {
      setSearchParams(
        (previousParams) => {
          const nextSearchParams = new URLSearchParams(previousParams);

          if (nextSortOption === 'totalScore') {
            nextSearchParams.delete(SORT_QUERY_PARAM);
          } else {
            nextSearchParams.set(SORT_QUERY_PARAM, nextSortOption);
          }
          nextSearchParams.delete(VISIBLE_QUERY_PARAM);

          return nextSearchParams.toString() === previousParams.toString()
            ? previousParams
            : nextSearchParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleEligibilityChange = useCallback(
    (nextFilter: EligibilityFilter) => {
      setSearchParams(
        (previousParams) => {
          const nextSearchParams = new URLSearchParams(previousParams);

          if (nextFilter === 'all') {
            nextSearchParams.delete(ELIGIBLE_QUERY_PARAM);
          } else if (nextFilter === 'eligible') {
            nextSearchParams.set(ELIGIBLE_QUERY_PARAM, 'true');
          } else if (nextFilter === 'ineligible') {
            nextSearchParams.set(ELIGIBLE_QUERY_PARAM, 'false');
          } else if (
            nextFilter === 'oss' ||
            nextFilter === 'issues' ||
            nextFilter === 'both'
          ) {
            nextSearchParams.set(ELIGIBLE_QUERY_PARAM, nextFilter);
          }
          nextSearchParams.delete(VISIBLE_QUERY_PARAM);

          return nextSearchParams.toString() === previousParams.toString()
            ? previousParams
            : nextSearchParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Helper to sort a list of miners
  const sortMinersList = (list: MinerStats[], option: SortOption) =>
    [...list].sort((a, b) => {
      switch (option) {
        case 'totalScore':
          return b.totalScore - a.totalScore;
        case 'usdPerDay':
          return (b.usdPerDay ?? 0) - (a.usdPerDay ?? 0);
        case 'totalPRs':
          return b.totalPRs - a.totalPRs;
        case 'totalIssues':
          return (b.totalIssues ?? 0) - (a.totalIssues ?? 0);
        case 'credibility':
          return (b.credibility ?? 0) - (a.credibility ?? 0);
        default:
          return 0;
      }
    });

  // Process and filter miners
  const filteredMiners = useMemo(() => {
    let result = [...miners];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.githubId?.toLowerCase().includes(lowerQuery) ||
          m.author?.toLowerCase().includes(lowerQuery),
      );
    }

    if (variant === 'watchlist') {
      const ossOk = (m: MinerStats) => m.ossIsEligible ?? false;
      const issuesOk = (m: MinerStats) =>
        m.discoveriesIsEligible ?? m.isIssueEligible ?? false;

      if (eligibilityFilter === 'oss') {
        result = result.filter((m) => ossOk(m));
      } else if (eligibilityFilter === 'issues') {
        result = result.filter((m) => issuesOk(m));
      } else if (eligibilityFilter === 'both') {
        result = result.filter((m) => ossOk(m) && issuesOk(m));
      } else if (eligibilityFilter === 'ineligible') {
        result = result.filter((m) => !ossOk(m) && !issuesOk(m));
      }
    } else if (eligibilityFilter === 'eligible') {
      result = result.filter((m) => m.isEligible);
    } else if (eligibilityFilter === 'ineligible') {
      result = result.filter((m) => !m.isEligible);
    }

    return sortMinersList(result, sortOption).map((miner, index) => ({
      ...miner,
      rank: index + 1,
    }));
  }, [miners, searchQuery, eligibilityFilter, sortOption, variant]);

  useEffect(() => {
    if (visibleCount <= filteredMiners.length) return;

    setSearchParams(
      (previousParams) => {
        const nextSearchParams = new URLSearchParams(previousParams);
        nextSearchParams.delete(VISIBLE_QUERY_PARAM);

        return nextSearchParams.toString() === previousParams.toString()
          ? previousParams
          : nextSearchParams;
      },
      { replace: true },
    );
  }, [filteredMiners.length, setSearchParams, visibleCount]);

  const handleSearchChange = useCallback(
    (nextQuery: string) => {
      setSearchParams(
        (previousParams) => {
          const nextSearchParams = new URLSearchParams(previousParams);
          const normalizedQuery = nextQuery.trim();

          if (normalizedQuery) {
            nextSearchParams.set(SEARCH_QUERY_PARAM, normalizedQuery);
          } else {
            nextSearchParams.delete(SEARCH_QUERY_PARAM);
          }
          nextSearchParams.delete(VISIBLE_QUERY_PARAM);

          return nextSearchParams.toString() === previousParams.toString()
            ? previousParams
            : nextSearchParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

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
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <SortButtons
              sortOption={sortOption}
              onSortChange={handleSortChange}
              variant={variant}
            />
            {variant === 'watchlist' ? (
              <WatchlistEligibilityToolbar
                value={eligibilityFilter}
                onChange={handleEligibilityChange}
              />
            ) : (
              <EligibilityToggle
                value={
                  eligibilityFilter === 'eligible' ||
                  eligibilityFilter === 'ineligible' ||
                  eligibilityFilter === 'all'
                    ? eligibilityFilter
                    : 'all'
                }
                onChange={handleEligibilityChange}
              />
            )}
          </Box>
        </Box>
      </SectionCard>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredMiners.length > 0 && (
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

        {remainingMiners > 0 && (
          <Box
            onClick={() => {
              const nextVisibleCount = Math.min(
                visibleCount + MINERS_PAGE_SIZE,
                filteredMiners.length,
              );

              setSearchParams(
                (previousParams) => {
                  const nextSearchParams = new URLSearchParams(previousParams);

                  if (nextVisibleCount > MINERS_PAGE_SIZE) {
                    nextSearchParams.set(
                      VISIBLE_QUERY_PARAM,
                      String(nextVisibleCount),
                    );
                  } else {
                    nextSearchParams.delete(VISIBLE_QUERY_PARAM);
                  }

                  return nextSearchParams.toString() ===
                    previousParams.toString()
                    ? previousParams
                    : nextSearchParams;
                },
                { replace: true },
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

interface WatchlistEligibilityToolbarProps {
  value: EligibilityFilter;
  onChange: (next: EligibilityFilter) => void;
}

const WatchlistEligibilityToolbar: React.FC<
  WatchlistEligibilityToolbarProps
> = ({ value, onChange }) => {
  const granularEligible =
    value === 'oss' || value === 'issues' || value === 'both' ? value : '';

  const handleEligibleProgramChange = (event: SelectChangeEvent<string>) => {
    const v = event.target.value;
    if (v === 'oss' || v === 'issues' || v === 'both') {
      onChange(v);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}
    >
      <Box
        sx={(theme) => ({
          display: 'inline-flex',
          gap: 0.5,
          p: 0.5,
          borderRadius: 2,
          backgroundColor: theme.palette.surface.light,
        })}
      >
        {(
          [
            { key: 'all' as const, label: 'All' },
            { key: 'ineligible' as const, label: 'Ineligible' },
          ] as const
        ).map(({ key, label }) => {
          const isActive = value === key;
          return (
            <Box
              key={key}
              component="button"
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(key)}
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
              {label}
            </Box>
          );
        })}
      </Box>

      <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 172 } }}>
        <Select<string>
          displayEmpty
          value={granularEligible}
          onChange={handleEligibleProgramChange}
          aria-label="Eligible program filter"
          renderValue={(selected) => {
            if (!selected) {
              return (
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.72rem',
                    color: 'text.tertiary',
                  }}
                >
                  Eligible
                </Typography>
              );
            }
            const labels = {
              oss: 'OSS eligible',
              issues: 'Issues eligible',
              both: 'Both eligible',
            };
            return (
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'text.primary',
                }}
              >
                {labels[selected as keyof typeof labels]}
              </Typography>
            );
          }}
          sx={(theme) => ({
            height: 32,
            borderRadius: 1.5,
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
            backgroundColor: theme.palette.surface.light,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.border.light,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.border.medium,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
            },
          })}
        >
          <MenuItem
            value="oss"
            sx={{ fontFamily: FONTS.mono, fontSize: '0.75rem' }}
          >
            OSS eligible
          </MenuItem>
          <MenuItem
            value="issues"
            sx={{ fontFamily: FONTS.mono, fontSize: '0.75rem' }}
          >
            Issues eligible
          </MenuItem>
          <MenuItem
            value="both"
            sx={{ fontFamily: FONTS.mono, fontSize: '0.75rem' }}
          >
            Both eligible
          </MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

interface SortButtonsProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  variant: LeaderboardVariant;
}

const SortButtons: React.FC<SortButtonsProps> = ({
  sortOption,
  onSortChange,
  variant,
}) => (
  <Box
    sx={{
      display: 'flex',
      gap: 0.5,
      flexWrap: 'wrap',
      justifyContent: 'center',
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
    ].map((option) => (
      <Box
        key={option.value}
        onClick={() => onSortChange(option.value as SortOption)}
        sx={(theme) => ({
          px: 1.5,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 2,
          cursor: 'pointer',
          backgroundColor:
            sortOption === option.value
              ? alpha(theme.palette.text.primary, 0.1)
              : 'transparent',
          color:
            sortOption === option.value
              ? theme.palette.text.primary
              : STATUS_COLORS.open,
          border: '1px solid',
          borderColor:
            sortOption === option.value
              ? theme.palette.border.medium
              : 'transparent',
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
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {option.label}
        </Typography>
      </Box>
    ))}
  </Box>
);

interface EligibilityToggleProps {
  value: 'all' | 'eligible' | 'ineligible';
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

export default TopMinersTable;

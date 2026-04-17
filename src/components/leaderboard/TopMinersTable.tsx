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
} from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
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

type EligibilityFilter = 'all' | 'eligible' | 'ineligible';

const getEligibilityFilterFromQuery = (
  value: string | null,
): EligibilityFilter => {
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

/** Stable sort helper — avoids recreating closures on every TopMinersTable render. */
const sortMinersList = (list: MinerStats[], option: SortOption): MinerStats[] =>
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
    () => getEligibilityFilterFromQuery(searchParams.get(ELIGIBLE_QUERY_PARAM)),
    [searchParams],
  );
  const visibleCount = useMemo(
    () => getVisibleCountFromQuery(searchParams.get(VISIBLE_QUERY_PARAM)),
    [searchParams],
  );

  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSmUp) setMobileSearchOpen(false);
  }, [isSmUp]);

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
          } else {
            nextSearchParams.set(ELIGIBLE_QUERY_PARAM, 'false');
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

  const minersAfterEligibilityOnly = useMemo(() => {
    let result = [...miners];
    if (eligibilityFilter === 'eligible') {
      result = result.filter((m) => m.isEligible);
    } else if (eligibilityFilter === 'ineligible') {
      result = result.filter((m) => !m.isEligible);
    }
    return result;
  }, [miners, eligibilityFilter]);

  // Process and filter miners
  const filteredMiners = useMemo(() => {
    let result = [...minersAfterEligibilityOnly];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.githubId?.toLowerCase().includes(lowerQuery) ||
          m.author?.toLowerCase().includes(lowerQuery),
      );
    }

    return sortMinersList(result, sortOption).map((miner, index) => ({
      ...miner,
      rank: index + 1,
    }));
  }, [minersAfterEligibilityOnly, searchQuery, sortOption]);

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

  const handleMobileSearchBlur = useCallback(() => {
    if (!isSmUp && !searchQuery.trim()) {
      setMobileSearchOpen(false);
    }
  }, [isSmUp, searchQuery]);

  const handleSearchChange = useCallback(
    (nextQuery: string) => {
      const normalizedQuery = nextQuery.trim();
      if (!normalizedQuery && !isSmUp) {
        setMobileSearchOpen(false);
      }
      setSearchParams(
        (previousParams) => {
          const nextSearchParams = new URLSearchParams(previousParams);

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
    [isSmUp, setSearchParams],
  );

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
              onSortChange={handleSortChange}
              variant={variant}
            />
            <Box
              sx={{
                display: 'flex',
                justifyContent: { xs: 'center', lg: 'flex-end' },
                flexShrink: 0,
              }}
            >
              <EligibilityToggle
                value={eligibilityFilter}
                onChange={handleEligibilityChange}
              />
            </Box>
          </Box>
        </Box>
      </SectionCard>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredMiners.length > 0 && (
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
    ].map((option) => (
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
          flexShrink: 0,
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
            fontSize: { xs: '0.72rem', sm: '0.75rem' },
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {option.label}
        </Typography>
      </Box>
    ))}
  </Box>
);

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

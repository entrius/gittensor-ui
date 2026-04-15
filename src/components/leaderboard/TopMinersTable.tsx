import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Grid } from '@mui/material';
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

interface TopMinersTableProps {
  miners: MinerStats[];
  isLoading?: boolean;
  getHref: (miner: MinerStats) => string;
  linkState?: unknown;
  variant?: LeaderboardVariant;
}

const getAllowedSortOptions = (variant: LeaderboardVariant): SortOption[] =>
  variant === 'discoveries'
    ? ['totalScore', 'usdPerDay', 'totalPRs', 'totalIssues', 'credibility']
    : ['totalScore', 'usdPerDay', 'totalPRs', 'credibility'];

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

const TopMinersTable: React.FC<TopMinersTableProps> = ({
  miners,
  isLoading,
  getHref,
  linkState,
  variant = 'oss',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const sortOption = useMemo(
    () => getSortOptionFromQuery(searchParams.get(SORT_QUERY_PARAM), variant),
    [searchParams, variant],
  );
  const showEligibleOnly = searchParams.get(ELIGIBLE_QUERY_PARAM) === 'true';
  const [visibleCount, setVisibleCount] = useState(MINERS_PAGE_SIZE);

  useEffect(() => {
    const rawSort = searchParams.get(SORT_QUERY_PARAM);
    const rawEligible = searchParams.get(ELIGIBLE_QUERY_PARAM);
    const allowedSortOptions = getAllowedSortOptions(variant);

    const hasInvalidSort =
      rawSort != null && !allowedSortOptions.includes(rawSort as SortOption);
    const hasInvalidEligible = rawEligible != null && rawEligible !== 'true';

    if (!hasInvalidSort && !hasInvalidEligible) {
      return;
    }

    setSearchParams(
      (previousParams) => {
        const nextSearchParams = new URLSearchParams(previousParams);
        if (hasInvalidSort) {
          nextSearchParams.delete(SORT_QUERY_PARAM);
        }
        if (hasInvalidEligible) {
          nextSearchParams.delete(ELIGIBLE_QUERY_PARAM);
        }
        return nextSearchParams;
      },
      { replace: true },
    );
  }, [searchParams, variant]);

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

          return nextSearchParams.toString() === previousParams.toString()
            ? previousParams
            : nextSearchParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleToggleEligible = useCallback(() => {
    setSearchParams(
      (previousParams) => {
        const nextSearchParams = new URLSearchParams(previousParams);
        const isEligibleEnabled =
          nextSearchParams.get(ELIGIBLE_QUERY_PARAM) === 'true';

        if (isEligibleEnabled) {
          nextSearchParams.delete(ELIGIBLE_QUERY_PARAM);
        } else {
          nextSearchParams.set(ELIGIBLE_QUERY_PARAM, 'true');
        }

        return nextSearchParams.toString() === previousParams.toString()
          ? previousParams
          : nextSearchParams;
      },
      { replace: true },
    );
  }, [setSearchParams]);

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

    if (showEligibleOnly) {
      result = result.filter((m) => m.isEligible);
    }

    return sortMinersList(result, sortOption).map((miner, index) => ({
      ...miner,
      rank: index + 1,
    }));
  }, [miners, searchQuery, showEligibleOnly, sortOption]);

  useEffect(() => {
    setVisibleCount(MINERS_PAGE_SIZE);
  }, [miners, searchQuery, showEligibleOnly, sortOption]);

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
      {/* Header Card */}
      <SectionCard
        title={`Miners (${filteredMiners.length})`}
        centerContent={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <SortButtons
              sortOption={sortOption}
              onSortChange={handleSortChange}
              variant={variant}
            />
            <FilterButton
              label="Eligible"
              isActive={showEligibleOnly}
              onClick={handleToggleEligible}
            />
          </Box>
        }
        action={<SearchInput value={searchQuery} onChange={setSearchQuery} />}
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
        {null}
      </SectionCard>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredMiners.length > 0 && (
          <Grid container spacing={2}>
            {visibleMiners.map((miner) => (
              <Grid item xs={12} sm={12} md={6} lg={4} xl={4} key={miner.id}>
                <MinerCard
                  miner={miner}
                  variant={variant}
                  href={getHref(miner)}
                  linkState={linkState}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {remainingMiners > 0 && (
          <Box
            onClick={() =>
              setVisibleCount((prev) =>
                Math.min(prev + MINERS_PAGE_SIZE, filteredMiners.length),
              )
            }
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
      flexWrap: 'wrap',
      justifyContent: 'center',
    }}
  >
    {[
      { label: 'Score', value: 'totalScore' },
      { label: 'Earnings', value: 'usdPerDay' },
      { label: 'PRs', value: 'totalPRs' },
      ...(variant === 'discoveries'
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

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  isActive,
  onClick,
}) => (
  <Box
    onClick={onClick}
    sx={(theme) => ({
      px: 1.5,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      borderRadius: 2,
      cursor: 'pointer',
      backgroundColor: isActive
        ? alpha(theme.palette.status.merged, 0.16)
        : 'transparent',
      color: isActive ? theme.palette.text.primary : STATUS_COLORS.open,
      border: '1px solid',
      borderColor: isActive
        ? alpha(theme.palette.status.merged, 0.4)
        : 'transparent',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: isActive
          ? alpha(theme.palette.status.merged, 0.2)
          : theme.palette.surface.light,
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
      {label}
    </Typography>
  </Box>
);

export default TopMinersTable;

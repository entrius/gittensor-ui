import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SectionCard } from './SectionCard';
import { MinerSection } from './MinerSection';
import {
  type MinerStats,
  type SortOption,
  getTierColors,
  FONTS,
} from './types';

// Re-export MinerStats for backward compatibility
export type { MinerStats } from './types';

interface TopMinersTableProps {
  miners: MinerStats[];
  isLoading?: boolean;
  onSelectMiner: (githubId: string) => void;
}

const TopMinersTable: React.FC<TopMinersTableProps> = ({
  miners,
  isLoading,
  onSelectMiner,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('totalScore');

  // Helper to sort a list of miners
  const sortMinersList = (list: MinerStats[], option: SortOption) =>
    [...list].sort((a, b) => {
      switch (option) {
        case 'totalScore':
          return (b.totalScore || 0) - (a.totalScore || 0);
        case 'usdPerDay':
          return (b.usdPerDay || 0) - (a.usdPerDay || 0);
        case 'totalPRs':
          return (b.totalPRs || 0) - (a.totalPRs || 0);
        case 'credibility':
          return (b.credibility || 0) - (a.credibility || 0);
        default:
          return 0;
      }
    });

  // Process and filter miners
  const groupedMiners = useMemo(() => {
    let result = [...miners];
    result = result.map((miner, index) => ({ ...miner, rank: index + 1 }));

    // 1. Filter by Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.githubId?.toLowerCase().includes(lowerQuery) ||
          m.author?.toLowerCase().includes(lowerQuery),
      );
    }

    // 2. Group by Tier
    const gold = result.filter((m) => m.currentTier === 'Gold');
    const silver = result.filter((m) => m.currentTier === 'Silver');
    const bronze = result.filter((m) => m.currentTier === 'Bronze');
    const others = result.filter((m) => !m.currentTier);

    // 3. Sort each Group
    return {
      gold: sortMinersList(gold, sortOption),
      silver: sortMinersList(silver, sortOption),
      bronze: sortMinersList(bronze, sortOption),
      others: sortMinersList(
        others,
        sortOption === 'totalScore' ? 'credibility' : sortOption,
      ),
      totalFiltered: result.length,
    };
  }, [miners, searchQuery, sortOption]);

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
        title={`Miners (${groupedMiners.totalFiltered})`}
        centerContent={
          <SortButtons sortOption={sortOption} onSortChange={setSortOption} />
        }
        action={<SearchField value={searchQuery} onChange={setSearchQuery} />}
        sx={{
          mb: 2,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none',
        }}
      >
        {null}
      </SectionCard>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* GOLD SECTION */}
        {groupedMiners.gold.length > 0 && (
          <MinerSection
            title="GOLD TIER"
            miners={groupedMiners.gold}
            color={getTierColors('Gold')}
            onSelectMiner={onSelectMiner}
          />
        )}

        {/* SILVER SECTION */}
        {groupedMiners.silver.length > 0 && (
          <MinerSection
            title="SILVER TIER"
            miners={groupedMiners.silver}
            color={getTierColors('Silver')}
            onSelectMiner={onSelectMiner}
          />
        )}

        {/* BRONZE SECTION */}
        {groupedMiners.bronze.length > 0 && (
          <MinerSection
            title="BRONZE TIER"
            miners={groupedMiners.bronze}
            color={getTierColors('Bronze')}
            onSelectMiner={onSelectMiner}
          />
        )}

        {/* INACTIVE / OTHER SECTION */}
        {groupedMiners.others.length > 0 && (
          <MinerSection
            title="Unranked"
            miners={groupedMiners.others}
            color={{
              border: 'rgba(255,255,255,0.1)',
              text: '#8b949e',
              bg: 'rgba(255, 255, 255, 0.02)',
            }}
            onSelectMiner={onSelectMiner}
          />
        )}

        {groupedMiners.totalFiltered === 0 && (
          <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
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
}

const SortButtons: React.FC<SortButtonsProps> = ({
  sortOption,
  onSortChange,
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
      { label: 'Credibility', value: 'credibility' },
    ].map((option) => (
      <Box
        key={option.value}
        onClick={() => onSortChange(option.value as SortOption)}
        sx={{
          px: 1.5,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 2,
          cursor: 'pointer',
          backgroundColor:
            sortOption === option.value
              ? 'rgba(255, 255, 255, 0.1)'
              : 'transparent',
          color: sortOption === option.value ? '#fff' : '#8b949e',
          border: '1px solid',
          borderColor:
            sortOption === option.value
              ? 'rgba(255, 255, 255, 0.2)'
              : 'transparent',
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#e6edf3',
          },
        }}
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

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchField: React.FC<SearchFieldProps> = ({ value, onChange }) => (
  <TextField
    placeholder="Search..."
    size="small"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon
            sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '1rem' }}
          />
        </InputAdornment>
      ),
    }}
    sx={{
      width: 180,
      '& .MuiOutlinedInput-root': {
        color: '#ffffff',
        fontFamily: FONTS.mono,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        fontSize: '0.8rem',
        borderRadius: 2,
        height: 32,
        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
        '&.Mui-focused fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
      },
    }}
  />
);

export default TopMinersTable;

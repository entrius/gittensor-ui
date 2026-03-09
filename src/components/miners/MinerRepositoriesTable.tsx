import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Avatar,
  TableSortLabel,
  TextField,
  InputAdornment,
  alpha,
  useTheme,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useMinerPRs, useReposAndWeights } from '../../api';
import { useNavigate } from 'react-router-dom';
import theme, { TIER_COLORS } from '../../theme';
import ExplorerFilterButton from './ExplorerFilterButton';
import {
  type MinerTierFilter,
  type RepoSortField,
  type SortOrder,
  filterMinerRepoStats,
  sortMinerRepoStats,
  tierColorFor,
} from './explorerUtils';

interface MinerRepositoriesTableProps {
  githubId: string;
  /** When set, only repositories in this tier are shown (e.g. "Bronze", "Silver", "Gold"). */
  tierFilter?: string;
}

interface RepoStats {
  repository: string;
  prs: number;
  score: number;
  weight: number;
  tier: string;
}

const MinerRepositoriesTable: React.FC<MinerRepositoriesTableProps> = ({
  githubId,
  tierFilter,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const [sortField, setSortField] = useState<RepoSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [tierFilter, setTierFilter] = useState<MinerTierFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const headerCellStyle = {
    backgroundColor: theme.palette.surface.elevated,
    backdropFilter: 'blur(8px)',
    color: alpha(theme.palette.text.primary, 0.7),
    fontFamily: '"JetBrains Mono", monospace',
    fontWeight: 500,
    fontSize: '0.75rem',
    borderBottom: `1px solid ${theme.palette.border.light}`,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  const bodyCellStyle = {
    color: theme.palette.text.primary,
    fontFamily: '"JetBrains Mono", monospace',
    borderBottom: `1px solid ${theme.palette.border.light}`,
    fontSize: '0.85rem',
  };

  // Build repository weights and tiers maps
  const repoWeights = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo && repo.fullName) {
          map.set(repo.fullName, parseFloat(repo.weight || '0'));
        }
      });
    }
    return map;
  }, [repos]);

  const repoTiers = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo && repo.fullName) {
          map.set(repo.fullName, repo.tier || '');
        }
      });
    }
    return map;
  }, [repos]);

  // Aggregate PRs by repository
  const repoStats = useMemo(() => {
    if (!prs || prs.length === 0) return [];

    const statsMap = new Map<string, RepoStats>();

    prs.forEach((pr) => {
      const existing = statsMap.get(pr.repository) || {
        repository: pr.repository,
        prs: 0,
        score: 0,
        weight: repoWeights.get(pr.repository) || 0,
        tier: repoTiers.get(pr.repository) || '',
      };
      existing.prs += 1;
      existing.score += parseFloat(pr.score || '0');
      statsMap.set(pr.repository, existing);
    });

    return Array.from(statsMap.values());
  }, [prs, repoWeights, repoTiers]);

  // Filter and sort repository stats
  const filteredRepoStats = useMemo(() => {
    let filtered = filterMinerRepoStats(repoStats, tierFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.repository.toLowerCase().includes(q));
    }
    return filtered;
  }, [repoStats, tierFilter, searchQuery]);

  const sortedRepoStats = useMemo(
    () => sortMinerRepoStats(filteredRepoStats, sortField, sortOrder),
    [filteredRepoStats, sortField, sortOrder],
  );

  const tierCounts = useMemo(() => {
    const counts = { all: repoStats.length, gold: 0, silver: 0, bronze: 0 };
    for (const repo of repoStats) {
      const tier = repo.tier.toLowerCase();
      if (tier === 'gold') counts.gold++;
      else if (tier === 'silver') counts.silver++;
      else if (tier === 'bronze') counts.bronze++;
    }
    return counts;
  }, [repoStats]);

  const handleSort = (field: RepoSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const isLoading = isLoadingPRs || isLoadingRepos;

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (!prs || prs.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'transparent',
          p: 4,
        }}
        elevation={0}
      >
        <Typography
          sx={{
            color: (t) => alpha(t.palette.text.primary, 0.5),
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          No repository contributions found
        </Typography>
      </Card>
    );
  }

  if (!tierFilter && repoStats.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'transparent',
          p: 4,
        }}
        elevation={0}
      >
        <Typography
          sx={{
            color: (t) => alpha(t.palette.text.primary, 0.5),
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          No repository contributions found
        </Typography>
      </Card>
    );
  }

  if (tierFilter && filteredRepoStats.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'transparent',
          p: 4,
        }}
        elevation={0}
      >
        <Typography
          sx={{
            color: (t) => alpha(t.palette.text.primary, 0.5),
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          No repositories in this tier
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid',
          borderColor: 'border.light',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.1rem',
                fontWeight: 500,
              }}
            >
              Top Repositories
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
              }}
            >
              ({sortedRepoStats.length}
              {tierFilter !== 'all' ? ` of ${repoStats.length}` : ''})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <ExplorerFilterButton
              label="All"
              count={tierCounts.all}
              color={theme.palette.status.neutral}
              selected={tierFilter === 'all'}
              onClick={() => setTierFilter('all')}
            />
            <ExplorerFilterButton
              label="Gold"
              count={tierCounts.gold}
              color={TIER_COLORS.gold}
              selected={tierFilter === 'gold'}
              onClick={() => setTierFilter('gold')}
            />
            <ExplorerFilterButton
              label="Silver"
              count={tierCounts.silver}
              color={TIER_COLORS.silver}
              selected={tierFilter === 'silver'}
              onClick={() => setTierFilter('silver')}
            />
            <ExplorerFilterButton
              label="Bronze"
              count={tierCounts.bronze}
              color={TIER_COLORS.bronze}
              selected={tierFilter === 'bronze'}
              onClick={() => setTierFilter('bronze')}
            />
          </Box>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem' }}
                />
              </InputAdornment>
            ),
          }}
          sx={{
            mt: 2,
            maxWidth: 300,
            '& .MuiOutlinedInput-root': {
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              color: '#fff',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 2,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      </Box>

      <TableContainer sx={{ maxHeight: '400px', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === 'rank'}
                  direction={sortField === 'rank' ? sortOrder : 'desc'}
                  onClick={() => handleSort('rank')}
                  sx={{
                    color: 'inherit',
                    '&:hover': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                    },
                    '&.Mui-active': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                      '& .MuiTableSortLabel-icon': {
                        color: (t) =>
                          `${alpha(t.palette.text.primary, 0.9)} !important`,
                      },
                    },
                  }}
                >
                  Rank
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === 'repository'}
                  direction={sortField === 'repository' ? sortOrder : 'asc'}
                  onClick={() => handleSort('repository')}
                  sx={{
                    color: 'inherit',
                    '&:hover': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                    },
                    '&.Mui-active': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                      '& .MuiTableSortLabel-icon': {
                        color: (t) =>
                          `${alpha(t.palette.text.primary, 0.9)} !important`,
                      },
                    },
                  }}
                >
                  Repository
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === 'prs'}
                  direction={sortField === 'prs' ? sortOrder : 'desc'}
                  onClick={() => handleSort('prs')}
                  sx={{
                    color: 'inherit',
                    '&:hover': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                    },
                    '&.Mui-active': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                      '& .MuiTableSortLabel-icon': {
                        color: (t) =>
                          `${alpha(t.palette.text.primary, 0.9)} !important`,
                      },
                    },
                  }}
                >
                  PRs
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === 'score'}
                  direction={sortField === 'score' ? sortOrder : 'desc'}
                  onClick={() => handleSort('score')}
                  sx={{
                    color: 'inherit',
                    '&:hover': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                    },
                    '&.Mui-active': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                      '& .MuiTableSortLabel-icon': {
                        color: (t) =>
                          `${alpha(t.palette.text.primary, 0.9)} !important`,
                      },
                    },
                  }}
                >
                  Score
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                Avg/PR
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === 'weight'}
                  direction={sortField === 'weight' ? sortOrder : 'desc'}
                  onClick={() => handleSort('weight')}
                  sx={{
                    color: 'inherit',
                    '&:hover': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                    },
                    '&.Mui-active': {
                      color: (t) => alpha(t.palette.text.primary, 0.9),
                      '& .MuiTableSortLabel-icon': {
                        color: (t) =>
                          `${alpha(t.palette.text.primary, 0.9)} !important`,
                      },
                    },
                  }}
                >
                  Weight
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRepoStats.map((repo, index) => (
              <TableRow
                key={repo.repository}
                sx={{
                  '&:hover': {
                    backgroundColor: 'surface.light',
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                <TableCell sx={bodyCellStyle}>
                  <Box
                    sx={{
                      backgroundColor: 'background.default',
                      borderRadius: '2px',
                      width: '28px',
                      height: '28px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid',
                      borderColor: (t) =>
                        index === 0
                          ? alpha(TIER_COLORS.gold, 0.4)
                          : index === 1
                            ? alpha(TIER_COLORS.silver, 0.4)
                            : index === 2
                              ? alpha(TIER_COLORS.bronze, 0.4)
                              : alpha(t.palette.text.primary, 0.15),
                      boxShadow:
                        index === 0
                          ? `0 0 12px ${alpha(TIER_COLORS.gold, 0.4)}, 0 0 4px ${alpha(TIER_COLORS.gold, 0.2)}`
                          : index === 1
                            ? `0 0 12px ${alpha(TIER_COLORS.silver, 0.4)}, 0 0 4px ${alpha(TIER_COLORS.silver, 0.2)}`
                            : index === 2
                              ? `0 0 12px ${alpha(TIER_COLORS.bronze, 0.4)}, 0 0 4px ${alpha(TIER_COLORS.bronze, 0.2)}`
                              : 'none',
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color: (t) =>
                          index === 0
                            ? TIER_COLORS.gold
                            : index === 1
                              ? TIER_COLORS.silver
                              : index === 2
                                ? TIER_COLORS.bronze
                                : alpha(t.palette.text.primary, 0.6),
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {index + 1}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={bodyCellStyle}>
                  <Box
                    onClick={() =>
                      navigate(
                        `/miners/repository?name=${encodeURIComponent(repo.repository)}`,
                        {
                          state: {
                            backLabel: `Back to ${prs?.[0]?.author || githubId}`,
                          },
                        },
                      )
                    }
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      cursor: 'pointer',
                      '&:hover': {
                        color: 'primary.main',
                        '& .MuiTypography-root': {
                          textDecoration: 'underline',
                        },
                      },
                      transition: 'color 0.2s',
                    }}
                  >
                    <Avatar
                      src={`https://avatars.githubusercontent.com/${repo.repository.split('/')[0]}`}
                      alt={repo.repository.split('/')[0]}
                      sx={{
                        width: 24,
                        height: 24,
                        border: '1px solid',
                        borderColor: 'border.medium',
                        backgroundColor:
                          repo.repository.split('/')[0] === 'opentensor'
                            ? 'text.primary'
                            : repo.repository.split('/')[0] === 'bitcoin'
                              ? 'status.warning'
                              : 'transparent',
                      }}
                    />
                    {repo.tier && (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: tierColorFor(repo.tier, TIER_COLORS),
                          flexShrink: 0,
                        }}
                        title={`${repo.tier} tier`}
                      />
                    )}
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.85rem',
                        transition: 'color 0.2s',
                      }}
                    >
                      {repo.repository}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={bodyCellStyle}>
                  {repo.prs}
                </TableCell>
                <TableCell align="right" sx={bodyCellStyle}>
                  {repo.score.toFixed(4)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ ...bodyCellStyle, color: 'rgba(255,255,255,0.5)' }}
                >
                  {repo.prs > 0 ? (repo.score / repo.prs).toFixed(4) : '—'}
                </TableCell>
                <TableCell align="right" sx={bodyCellStyle}>
                  {repo.weight.toFixed(4)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default MinerRepositoriesTable;

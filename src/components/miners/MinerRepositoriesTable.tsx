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
  alpha,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMinerPRs, useReposAndWeights } from '../../api';
import { useNavigate } from 'react-router-dom';
import { TIER_COLORS } from '../../theme';

interface MinerRepositoriesTableProps {
  githubId: string;
  search?: string;
  onSearchChange?: (value: string) => void;
}

interface RepoStats {
  repository: string;
  prs: number;
  score: number;
  weight: number;
  tier: string;
}

type SortField = 'rank' | 'repository' | 'prs' | 'score' | 'weight';
type SortOrder = 'asc' | 'desc';

const getTierColor = (tier: string): string => {
  switch (tier?.toLowerCase()) {
    case 'gold':
      return TIER_COLORS.gold;
    case 'silver':
      return TIER_COLORS.silver;
    case 'bronze':
      return TIER_COLORS.bronze;
    default:
      return 'transparent';
  }
};

const MinerRepositoriesTable: React.FC<MinerRepositoriesTableProps> = ({
  githubId,
  search: externalSearch,
  onSearchChange,
}) => {
  const navigate = useNavigate();
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [internalSearch, setInternalSearch] = useState('');
  const searchQuery = (externalSearch ?? internalSearch).trim().toLowerCase();

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

  const filteredRepoStats = useMemo(() => {
    if (!searchQuery) return repoStats;
    return repoStats.filter((r) =>
      r.repository.toLowerCase().includes(searchQuery),
    );
  }, [repoStats, searchQuery]);

  // Sort repository stats
  const sortedRepoStats = useMemo(() => {
    const sorted = [...filteredRepoStats];
    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'repository':
          compareValue = a.repository.localeCompare(b.repository);
          break;
        case 'prs':
          compareValue = a.prs - b.prs;
          break;
        case 'score':
          compareValue = a.score - b.score;
          break;
        case 'weight':
          compareValue = a.weight - b.weight;
          break;
        case 'rank':
          // Rank is based on score by default
          compareValue = a.score - b.score;
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    return sorted;
  }, [filteredRepoStats, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
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
          border: '1px solid rgba(255, 255, 255, 0.1)',
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

  if (!prs || prs.length === 0 || repoStats.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'transparent',
          p: 4,
        }}
        elevation={0}
      >
        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
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

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
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
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 2,
        }}
      >
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
        {!onSearchChange && (
          <TextField
            size="small"
            placeholder="Search repositories..."
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}
                  />
                </InputAdornment>
              ),
              sx: {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                color: '#fff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.35)',
                },
                maxWidth: 240,
              },
            }}
            sx={{ minWidth: 180 }}
          />
        )}
      </Box>

      <TableContainer
        sx={{
          maxHeight: '400px',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
        }}
      >
        <Table stickyHeader sx={{ tableLayout: 'fixed', minWidth: 600 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellStyle, width: 56 }}>
                <TableSortLabel
                  active={sortField === 'rank'}
                  direction={sortField === 'rank' ? sortOrder : 'desc'}
                  onClick={() => handleSort('rank')}
                  sx={{
                    color: 'inherit',
                    '&:hover': { color: 'rgba(255, 255, 255, 0.9)' },
                    '&.Mui-active': {
                      color: 'rgba(255, 255, 255, 0.9)',
                      '& .MuiTableSortLabel-icon': {
                        color: 'rgba(255, 255, 255, 0.9) !important',
                      },
                    },
                  }}
                >
                  Rank
                </TableSortLabel>
              </TableCell>
              <TableCell
                sx={{ ...headerCellStyle, width: '40%', overflow: 'hidden' }}
              >
                <TableSortLabel
                  active={sortField === 'repository'}
                  direction={sortField === 'repository' ? sortOrder : 'asc'}
                  onClick={() => handleSort('repository')}
                  sx={{
                    color: 'inherit',
                    '&:hover': { color: 'rgba(255, 255, 255, 0.9)' },
                    '&.Mui-active': {
                      color: 'rgba(255, 255, 255, 0.9)',
                      '& .MuiTableSortLabel-icon': {
                        color: 'rgba(255, 255, 255, 0.9) !important',
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
                    '&:hover': { color: 'rgba(255, 255, 255, 0.9)' },
                    '&.Mui-active': {
                      color: 'rgba(255, 255, 255, 0.9)',
                      '& .MuiTableSortLabel-icon': {
                        color: 'rgba(255, 255, 255, 0.9) !important',
                      },
                    },
                  }}
                >
                  PRs
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ ...headerCellStyle, width: 100 }}>
                <TableSortLabel
                  active={sortField === 'score'}
                  direction={sortField === 'score' ? sortOrder : 'desc'}
                  onClick={() => handleSort('score')}
                  sx={{
                    color: 'inherit',
                    '&:hover': { color: 'rgba(255, 255, 255, 0.9)' },
                    '&.Mui-active': {
                      color: 'rgba(255, 255, 255, 0.9)',
                      '& .MuiTableSortLabel-icon': {
                        color: 'rgba(255, 255, 255, 0.9) !important',
                      },
                    },
                  }}
                >
                  Score
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === 'weight'}
                  direction={sortField === 'weight' ? sortOrder : 'desc'}
                  onClick={() => handleSort('weight')}
                  sx={{
                    color: 'inherit',
                    '&:hover': { color: 'rgba(255, 255, 255, 0.9)' },
                    '&.Mui-active': {
                      color: 'rgba(255, 255, 255, 0.9)',
                      '& .MuiTableSortLabel-icon': {
                        color: 'rgba(255, 255, 255, 0.9) !important',
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
            {sortedRepoStats.length === 0 && searchQuery ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  sx={{ ...bodyCellStyle, textAlign: 'center', py: 4 }}
                >
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.9rem',
                    }}
                  >
                    No repositories match your search.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedRepoStats.map((repo, index) => (
                <TableRow
                  key={repo.repository}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <TableCell sx={{ ...bodyCellStyle, width: 56 }}>
                    <Box
                      sx={{
                        backgroundColor: '#000000',
                        borderRadius: '2px',
                        width: '28px',
                        height: '28px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid',
                        borderColor:
                          index === 0
                            ? alpha(TIER_COLORS.gold, 0.4)
                            : index === 1
                              ? alpha(TIER_COLORS.silver, 0.4)
                              : index === 2
                                ? alpha(TIER_COLORS.bronze, 0.4)
                                : 'rgba(255, 255, 255, 0.15)',
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
                          color:
                            index === 0
                              ? TIER_COLORS.gold
                              : index === 1
                                ? TIER_COLORS.silver
                                : index === 2
                                  ? TIER_COLORS.bronze
                                  : 'rgba(255, 255, 255, 0.6)',
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
                  <TableCell sx={{ ...bodyCellStyle, width: '40%' }}>
                    <Tooltip
                      title={repo.repository}
                      placement="top"
                      enterDelay={300}
                      slotProps={{
                        tooltip: {
                          sx: {
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.8rem',
                            maxWidth: 360,
                          },
                        },
                      }}
                    >
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
                          minWidth: 0,
                          overflow: 'hidden',
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
                            flexShrink: 0,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            backgroundColor:
                              repo.repository.split('/')[0] === 'opentensor'
                                ? '#ffffff'
                                : repo.repository.split('/')[0] === 'bitcoin'
                                  ? '#F7931A'
                                  : 'transparent',
                          }}
                        />
                        {repo.tier && (
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: getTierColor(repo.tier),
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
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: 0,
                          }}
                        >
                          {repo.repository}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" sx={{ ...bodyCellStyle, width: 80 }}>
                    {repo.prs}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellStyle, width: 100 }}
                  >
                    {repo.score.toFixed(4)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellStyle, width: 100 }}
                  >
                    {repo.weight.toFixed(4)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

const headerCellStyle = {
  backgroundColor: 'rgba(18, 18, 20, 0.95)',
  backdropFilter: 'blur(8px)',
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const bodyCellStyle = {
  color: '#ffffff',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  fontSize: '0.85rem',
  overflow: 'hidden' as const,
};

export default MinerRepositoriesTable;

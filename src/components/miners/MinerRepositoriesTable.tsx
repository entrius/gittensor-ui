import React, { useCallback, useMemo, useState } from 'react';
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
import {
  Search as SearchIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import {
  useMinerPRs,
  useReposAndWeights,
  useTierConfigurations,
} from '../../api';
import { useNavigate } from 'react-router-dom';
import { TIER_COLORS } from '../../theme';
import ExplorerFilterButton from './ExplorerFilterButton';
import {
  type MinerTierFilter,
  type RepoSortField,
  type SortOrder,
  filterMinerRepoStats,
  sortMinerRepoStats,
  tierColorFor,
} from '../../utils/ExplorerUtils';

interface MinerRepositoriesTableProps {
  githubId: string;
  /** When set externally (e.g. from TierDetailsPage), overrides internal tier filter. */
  tierFilter?: string;
}

interface RepoStats {
  repository: string;
  prs: number;
  score: number;
  tokenScore: number;
  weight: number;
  tier: string;
}

const PAGE_SIZE = 20;

const MinerRepositoriesTable: React.FC<MinerRepositoriesTableProps> = ({
  githubId,
  tierFilter: externalTierFilter,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const { data: tierConfig } = useTierConfigurations();
  const [sortField, setSortField] = useState<RepoSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [internalTierFilter, setTierFilter] = useState<MinerTierFilter>('all');
  const tierFilter: MinerTierFilter =
    (externalTierFilter?.toLowerCase() as MinerTierFilter) ||
    internalTierFilter;
  const [qualificationFilter, setQualificationFilter] = useState<
    'all' | 'qualified' | 'unqualified'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

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

  // Build tier threshold map: tier name -> requiredMinTokenScorePerRepo
  const tierThresholds = useMemo(() => {
    const map = new Map<string, number>();
    if (tierConfig?.tiers) {
      tierConfig.tiers.forEach((t) => {
        map.set(t.name.toLowerCase(), t.requiredMinTokenScorePerRepo);
      });
    }
    return map;
  }, [tierConfig]);

  const isRepoQualified = useCallback(
    (repo: RepoStats) => {
      const tier = repo.tier.toLowerCase();
      const threshold = tierThresholds.get(tier);
      if (threshold == null) return false;
      return repo.tokenScore >= threshold;
    },
    [tierThresholds],
  );

  // Aggregate PRs by repository
  const repoStats = useMemo(() => {
    if (!prs || prs.length === 0) return [];

    const statsMap = new Map<string, RepoStats>();

    prs.forEach((pr) => {
      const existing = statsMap.get(pr.repository) || {
        repository: pr.repository,
        prs: 0,
        score: 0,
        tokenScore: 0,
        weight: repoWeights.get(pr.repository) || 0,
        tier: repoTiers.get(pr.repository) || '',
      };
      existing.prs += 1;
      existing.score += parseFloat(pr.score || '0');
      if (pr.prState === 'MERGED') {
        existing.tokenScore += parseFloat(String(pr.tokenScore ?? '0'));
      }
      statsMap.set(pr.repository, existing);
    });

    return Array.from(statsMap.values());
  }, [prs, repoWeights, repoTiers]);

  // Filter and sort repository stats
  const filteredRepoStats = useMemo(() => {
    let filtered = filterMinerRepoStats(repoStats, tierFilter);
    if (qualificationFilter !== 'all') {
      filtered = filtered.filter((r) =>
        qualificationFilter === 'qualified'
          ? isRepoQualified(r)
          : !isRepoQualified(r),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.repository.toLowerCase().includes(q));
    }
    return filtered;
  }, [
    repoStats,
    tierFilter,
    qualificationFilter,
    searchQuery,
    isRepoQualified,
  ]);

  const sortedRepoStats = useMemo(
    () => sortMinerRepoStats(filteredRepoStats, sortField, sortOrder),
    [filteredRepoStats, sortField, sortOrder],
  );

  const pagedRepoStats = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedRepoStats.slice(start, start + PAGE_SIZE);
  }, [sortedRepoStats, page]);

  const totalPages = Math.ceil(sortedRepoStats.length / PAGE_SIZE);

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

  const qualificationCounts = useMemo(() => {
    let qualified = 0;
    let unqualified = 0;
    for (const repo of repoStats) {
      if (isRepoQualified(repo)) qualified++;
      else unqualified++;
    }
    return { all: repoStats.length, qualified, unqualified };
  }, [repoStats, isRepoQualified]);

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
                color: 'text.primary',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: { xs: '0.95rem', sm: '1.1rem' },
                fontWeight: 500,
              }}
            >
              Repositories
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
              }}
            >
              (
              {tierFilter !== 'all' ||
              qualificationFilter !== 'all' ||
              searchQuery.trim()
                ? `${sortedRepoStats.length} of ${repoStats.length}`
                : sortedRepoStats.length}
              )
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 1 },
              flexWrap: 'wrap',
              alignItems: { xs: 'flex-start', sm: 'center' },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {/* Qualification Filter Buttons */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <ExplorerFilterButton
                label="All"
                count={qualificationCounts.all}
                color={theme.palette.status.neutral}
                selected={qualificationFilter === 'all'}
                onClick={() => {
                  setQualificationFilter('all');
                  setPage(0);
                }}
              />
              <ExplorerFilterButton
                label="Qualified"
                count={qualificationCounts.qualified}
                color={theme.palette.status.merged}
                selected={qualificationFilter === 'qualified'}
                onClick={() => {
                  setQualificationFilter('qualified');
                  setPage(0);
                }}
              />
              <ExplorerFilterButton
                label="Unqualified"
                count={qualificationCounts.unqualified}
                color={theme.palette.status.closed}
                selected={qualificationFilter === 'unqualified'}
                onClick={() => {
                  setQualificationFilter('unqualified');
                  setPage(0);
                }}
              />
            </Box>

            {/* Tier Filter Buttons */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <ExplorerFilterButton
                label="All Tiers"
                count={tierCounts.all}
                color={theme.palette.status.neutral}
                selected={tierFilter === 'all'}
                onClick={() => {
                  setTierFilter('all');
                  setPage(0);
                }}
              />
              <ExplorerFilterButton
                label="Gold"
                count={tierCounts.gold}
                color={TIER_COLORS.gold}
                selected={tierFilter === 'gold'}
                onClick={() => {
                  setTierFilter('gold');
                  setPage(0);
                }}
              />
              <ExplorerFilterButton
                label="Silver"
                count={tierCounts.silver}
                color={TIER_COLORS.silver}
                selected={tierFilter === 'silver'}
                onClick={() => {
                  setTierFilter('silver');
                  setPage(0);
                }}
              />
              <ExplorerFilterButton
                label="Bronze"
                count={tierCounts.bronze}
                color={TIER_COLORS.bronze}
                selected={tierFilter === 'bronze'}
                onClick={() => {
                  setTierFilter('bronze');
                  setPage(0);
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{
                    color: (t) => alpha(t.palette.text.primary, 0.3),
                    fontSize: '1rem',
                  }}
                />
              </InputAdornment>
            ),
          }}
          sx={{
            mt: 2,
            maxWidth: 400,
            minWidth: 350,
            '& .MuiOutlinedInput-root': {
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              color: 'text.primary',
              backgroundColor: 'surface.subtle',
              borderRadius: 2,
              '& fieldset': { borderColor: 'border.light' },
              '&:hover fieldset': { borderColor: 'border.medium' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      </Box>

      {!prs || prs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No repository contributions found
          </Typography>
        </Box>
      ) : sortedRepoStats.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No repositories found for the selected filters
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer
            sx={{
              overflowY: 'auto',
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                width: { xs: '6px', sm: '8px' },
                height: { xs: '6px', sm: '8px' },
              },
              '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'border.light',
                borderRadius: '4px',
                '&:hover': { backgroundColor: 'border.medium' },
              },
            }}
          >
            <Table
              stickyHeader
              sx={{ tableLayout: 'fixed', minWidth: '700px' }}
            >
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
                    <TableSortLabel
                      active={sortField === 'tokenScore'}
                      direction={
                        sortField === 'tokenScore' ? sortOrder : 'desc'
                      }
                      onClick={() => handleSort('tokenScore')}
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
                      Token Score
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
                {pagedRepoStats.map((repo, index) => {
                  const rank = page * PAGE_SIZE + index;
                  return (
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
                              rank === 0
                                ? alpha(TIER_COLORS.gold, 0.4)
                                : rank === 1
                                  ? alpha(TIER_COLORS.silver, 0.4)
                                  : rank === 2
                                    ? alpha(TIER_COLORS.bronze, 0.4)
                                    : alpha(t.palette.text.primary, 0.15),
                            boxShadow:
                              rank === 0
                                ? `0 0 12px ${alpha(TIER_COLORS.gold, 0.4)}, 0 0 4px ${alpha(TIER_COLORS.gold, 0.2)}`
                                : rank === 1
                                  ? `0 0 12px ${alpha(TIER_COLORS.silver, 0.4)}, 0 0 4px ${alpha(TIER_COLORS.silver, 0.2)}`
                                  : rank === 2
                                    ? `0 0 12px ${alpha(TIER_COLORS.bronze, 0.4)}, 0 0 4px ${alpha(TIER_COLORS.bronze, 0.2)}`
                                    : 'none',
                          }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              color: (t) =>
                                rank === 0
                                  ? TIER_COLORS.gold
                                  : rank === 1
                                    ? TIER_COLORS.silver
                                    : rank === 2
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
                            {page * PAGE_SIZE + index + 1}
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
                                backgroundColor: tierColorFor(
                                  repo.tier,
                                  TIER_COLORS,
                                ),
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
                      <TableCell align="right" sx={bodyCellStyle}>
                        {repo.tokenScore.toFixed(2)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          ...bodyCellStyle,
                          color: (t) => alpha(t.palette.text.primary, 0.5),
                        }}
                      >
                        {repo.prs > 0
                          ? (repo.score / repo.prs).toFixed(4)
                          : '—'}
                      </TableCell>
                      <TableCell align="right" sx={bodyCellStyle}>
                        {repo.weight.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                py: 1.5,
                borderTop: '1px solid',
                borderColor: 'border.subtle',
              }}
            >
              <Box
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                sx={{
                  cursor: page > 0 ? 'pointer' : 'default',
                  opacity: page > 0 ? 1 : 0.3,
                  display: 'flex',
                  alignItems: 'center',
                  color: (t) => alpha(t.palette.text.primary, 0.6),
                  '&:hover': page > 0 ? { color: 'text.primary' } : {},
                }}
              >
                <PrevIcon sx={{ fontSize: '1.2rem' }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  color: (t) => alpha(t.palette.text.primary, 0.5),
                }}
              >
                {page + 1} / {totalPages}
              </Typography>
              <Box
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                sx={{
                  cursor: page < totalPages - 1 ? 'pointer' : 'default',
                  opacity: page < totalPages - 1 ? 1 : 0.3,
                  display: 'flex',
                  alignItems: 'center',
                  color: (t) => alpha(t.palette.text.primary, 0.6),
                  '&:hover':
                    page < totalPages - 1 ? { color: 'text.primary' } : {},
                }}
              >
                <NextIcon sx={{ fontSize: '1.2rem' }} />
              </Box>
            </Box>
          )}
        </>
      )}
    </Card>
  );
};

export default MinerRepositoriesTable;

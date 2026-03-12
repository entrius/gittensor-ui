import React, { useState, useMemo } from 'react';
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
  Chip,
  Button,
  TableSortLabel,
  useTheme,
  alpha,
} from '@mui/material';
import { useMinerPRs, useReposAndWeights } from '../../api';
import { useNavigate } from 'react-router-dom';

type SortField =
  | 'number'
  | 'title'
  | 'repository'
  | 'changes'
  | 'score'
  | 'merged';
type SortOrder = 'asc' | 'desc';

interface MinerPRsTableProps {
  githubId: string;
  /** When set, only PRs in repositories of this tier are shown (e.g. "Bronze", "Silver", "Gold"). */
  tierFilter?: string;
}

const MinerPRsTable: React.FC<MinerPRsTableProps> = ({
  githubId,
  tierFilter,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();

  const headerCellStyle = {
    backgroundColor: theme.palette.surface.elevated,
    backdropFilter: 'blur(8px)',
    color: alpha(theme.palette.text.primary, 0.7),
    fontFamily: '"JetBrains Mono", monospace',
    fontWeight: 500,
    fontSize: { xs: '0.65rem', sm: '0.75rem' },
    borderBottom: `1px solid ${theme.palette.border.light}`,
    height: { xs: '48px', sm: '56px' },
    py: { xs: 1, sm: 1.5 },
    px: { xs: 0.5, sm: 2 },
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  const bodyCellStyle = {
    color: theme.palette.text.primary,
    fontFamily: '"JetBrains Mono", monospace',
    borderBottom: `1px solid ${theme.palette.border.light}`,
    fontSize: '0.85rem',
    py: { xs: 0.75, sm: 1 },
    px: { xs: 0.5, sm: 2 },
    height: { xs: '52px', sm: '60px' },
  };

  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'open' | 'merged' | 'closed'
  >('all');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const repoTiers = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo?.fullName) map.set(repo.fullName, repo.tier || '');
      });
    }
    return map;
  }, [repos]);

  const tierFilterLower = tierFilter?.toLowerCase();

  const prsInTier = useMemo(() => {
    if (!prs || !tierFilterLower) return prs;
    return prs.filter((pr) => {
      const prTier = pr.tier?.toLowerCase();
      const repoTier = repoTiers.get(pr.repository)?.toLowerCase();
      return prTier === tierFilterLower || repoTier === tierFilterLower;
    });
  }, [prs, tierFilterLower, repoTiers]);

  // Filter PRs by selected repository, author, and status (and tier when tierFilter is set)
  const filteredPRs = useMemo(() => {
    if (!prsInTier) return [];
    let filtered = prsInTier;
    if (selectedRepo) {
      filtered = filtered.filter((pr) => pr.repository === selectedRepo);
    }
    if (selectedAuthor) {
      filtered = filtered.filter((pr) => pr.author === selectedAuthor);
    }
    if (statusFilter === 'open') {
      filtered = filtered.filter(
        (pr) => pr.prState === 'OPEN' || (!pr.prState && !pr.mergedAt),
      );
    } else if (statusFilter === 'merged') {
      filtered = filtered.filter(
        (pr) => pr.mergedAt || pr.prState === 'MERGED',
      );
    } else if (statusFilter === 'closed') {
      filtered = filtered.filter(
        (pr) => pr.prState === 'CLOSED' && !pr.mergedAt,
      );
    }
    return filtered;
  }, [prsInTier, selectedRepo, selectedAuthor, statusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);

    // Default sort direction per column
    if (field === 'title' || field === 'repository') {
      setSortOrder('asc');
    } else {
      setSortOrder('desc');
    }
  };

  const sortedPRs = useMemo(() => {
    const prsToSort = [...filteredPRs];

    const getScoreValue = (pr: any) => {
      if (pr.prState === 'CLOSED' && !pr.mergedAt) return 0;
      const rawScore =
        !pr.mergedAt && pr.collateralScore ? pr.collateralScore : pr.score;
      const num = rawScore ? parseFloat(rawScore) : 0;
      return Number.isNaN(num) ? 0 : num;
    };

    const getMergedValue = (pr: any) => {
      if (pr.mergedAt) {
        const ts = new Date(pr.mergedAt).getTime();
        return Number.isNaN(ts) ? 0 : ts;
      }

      const state = pr.prState?.toUpperCase() || (pr.mergedAt ? 'MERGED' : 'OPEN');
      if (state === 'OPEN') return Number.MAX_SAFE_INTEGER;
      if (state === 'CLOSED') return 0;
      return 1;
    };

    prsToSort.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'number':
          aValue = a.pullRequestNumber ?? 0;
          bValue = b.pullRequestNumber ?? 0;
          break;
        case 'title':
          aValue = (a.pullRequestTitle || '').toLowerCase();
          bValue = (b.pullRequestTitle || '').toLowerCase();
          break;
        case 'repository':
          aValue = (a.repository || '').toLowerCase();
          bValue = (b.repository || '').toLowerCase();
          break;
        case 'changes':
          aValue = (a.additions ?? 0) + (a.deletions ?? 0);
          bValue = (b.additions ?? 0) + (b.deletions ?? 0);
          break;
        case 'score':
          aValue = getScoreValue(a);
          bValue = getScoreValue(b);
          break;
        case 'merged':
          aValue = getMergedValue(a);
          bValue = getMergedValue(b);
          break;
        default:
          aValue = getScoreValue(a);
          bValue = getScoreValue(b);
      }

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const aNum =
        typeof aValue === 'string' ? parseFloat(aValue) : Number(aValue);
      const bNum =
        typeof bValue === 'string' ? parseFloat(bValue) : Number(bValue);

      if (Number.isNaN(aNum) && Number.isNaN(bNum)) return 0;
      if (Number.isNaN(aNum)) return 1;
      if (Number.isNaN(bNum)) return -1;

      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return prsToSort;
  }, [filteredPRs, sortField, sortOrder]);

  const statusCounts = useMemo(() => {
    if (!prsInTier) return { all: 0, open: 0, merged: 0, closed: 0 };
    return {
      all: prsInTier.length,
      open: prsInTier.filter(
        (pr) => pr.prState === 'OPEN' || (!pr.prState && !pr.mergedAt),
      ).length,
      merged: prsInTier.filter((pr) => pr.mergedAt || pr.prState === 'MERGED')
        .length,
      closed: prsInTier.filter((pr) => pr.prState === 'CLOSED' && !pr.mergedAt)
        .length,
    };
  }, [prsInTier]);

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
          p: { xs: 2, sm: 3 },
          borderBottom: '1px solid',
          borderColor: 'border.light',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
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
              Pull Requests
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
              }}
            >
              ({filteredPRs.length}
              {selectedRepo ||
              selectedAuthor ||
              statusFilter !== 'all' ||
              tierFilter
                ? ` of ${(tierFilter ? (prsInTier ?? []) : prs)?.length || 0}`
                : ''}
              )
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {selectedRepo && (
              <Chip
                variant="filter"
                label={`Repo: ${selectedRepo}`}
                onDelete={() => setSelectedRepo(null)}
              />
            )}
            {selectedAuthor && (
              <Chip
                variant="filter"
                label={`Author: ${selectedAuthor}`}
                onDelete={() => setSelectedAuthor(null)}
              />
            )}

            {/* Status Filter Buttons */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <FilterButton
                label="All"
                count={statusCounts.all}
                color={theme.palette.status.neutral}
                selected={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              <FilterButton
                label="Open"
                count={statusCounts.open}
                color={theme.palette.status.open}
                selected={statusFilter === 'open'}
                onClick={() => setStatusFilter('open')}
              />
              <FilterButton
                label="Merged"
                count={statusCounts.merged}
                color={theme.palette.status.merged}
                selected={statusFilter === 'merged'}
                onClick={() => setStatusFilter('merged')}
              />
              <FilterButton
                label="Closed"
                count={statusCounts.closed}
                color={theme.palette.status.closed}
                selected={statusFilter === 'closed'}
                onClick={() => setStatusFilter('closed')}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Table */}
      {!prs || prs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No PRs found
          </Typography>
        </Box>
      ) : tierFilter && (prsInTier ?? []).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No PRs in this tier
          </Typography>
        </Box>
      ) : filteredPRs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No PRs found for the selected filters
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            maxHeight: { xs: '400px', sm: '500px' },
            overflowY: 'auto',
            overflowX: { xs: 'hidden', sm: 'auto' },
            '&::-webkit-scrollbar': {
              width: { xs: '6px', sm: '8px' },
              height: { xs: '6px', sm: '8px' },
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: (t) => t.palette.border.light,
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: (t) => t.palette.border.medium,
              },
            },
          }}
        >
          <Table
            stickyHeader
            sx={{ tableLayout: 'fixed', minWidth: { xs: '100%', sm: '800px' } }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'number'}
                    direction={sortField === 'number' ? sortOrder : 'asc'}
                    onClick={() => handleSort('number')}
                  >
                    PR #
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'title'}
                    direction={sortField === 'title' ? sortOrder : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{
                    ...headerCellStyle,
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'repository'}
                    direction={sortField === 'repository' ? sortOrder : 'asc'}
                    onClick={() => handleSort('repository')}
                  >
                    Repository
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    ...headerCellStyle,
                    display: { xs: 'none', md: 'table-cell' },
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'changes'}
                    direction={sortField === 'changes' ? sortOrder : 'desc'}
                    onClick={() => handleSort('changes')}
                  >
                    +/-
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'score'}
                    direction={sortField === 'score' ? sortOrder : 'desc'}
                    onClick={() => handleSort('score')}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    ...headerCellStyle,
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'merged'}
                    direction={sortField === 'merged' ? sortOrder : 'desc'}
                    onClick={() => handleSort('merged')}
                  >
                    Merged
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPRs.map((pr, index) => (
                <TableRow
                  key={`${pr.repository}-${pr.pullRequestNumber}-${index}`}
                  onClick={() => {
                    navigate(
                      `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                      {
                        state: {
                          backLabel: `Back to ${prs?.[0]?.author || githubId}`,
                        },
                      },
                    );
                  }}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'surface.light',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  <TableCell
                    sx={{
                      ...bodyCellStyle,
                      width: { xs: '20%', sm: '10%' },
                      fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    }}
                  >
                    <Box
                      component="a"
                      href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: 'text.primary',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      #{pr.pullRequestNumber}
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      ...bodyCellStyle,
                      width: { xs: '55%', sm: '30%' },
                      fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    }}
                  >
                    <Box
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pr.pullRequestTitle}
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      ...bodyCellStyle,
                      width: '20%',
                      display: { xs: 'none', sm: 'table-cell' },
                    }}
                  >
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRepo(pr.repository);
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        cursor: 'pointer',
                        '&:hover': {
                          color: 'primary.main',
                        },
                        transition: 'color 0.2s',
                      }}
                    >
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${pr.repository.split('/')[0]}`}
                        alt={pr.repository.split('/')[0]}
                        sx={{
                          width: 20,
                          height: 20,
                          border: '1px solid',
                          borderColor: 'border.medium',
                          backgroundColor:
                            pr.repository.split('/')[0] === 'opentensor'
                              ? 'text.primary'
                              : pr.repository.split('/')[0] === 'bitcoin'
                                ? 'status.warning'
                                : 'transparent',
                        }}
                      />
                      {pr.repository}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      ...bodyCellStyle,
                      width: '15%',
                      display: { xs: 'none', md: 'table-cell' },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        color: theme.palette.diff.additions,
                        mr: 1,
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      +{pr.additions}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        color: theme.palette.diff.deletions,
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      -{pr.deletions}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellStyle, width: { xs: '25%', sm: '10%' } }}
                  >
                    <Box>
                      {pr.prState === 'CLOSED' && !pr.mergedAt ? (
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            fontWeight: 600,
                            color: (t) => alpha(t.palette.text.primary, 0.3),
                          }}
                        >
                          -
                        </Typography>
                      ) : !pr.mergedAt && pr.collateralScore ? (
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            fontWeight: 600,
                            color: 'status.warning',
                          }}
                        >
                          {parseFloat(pr.collateralScore).toFixed(4)}
                        </Typography>
                      ) : (
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            fontWeight: 600,
                          }}
                        >
                          {parseFloat(pr.score).toFixed(4)}
                        </Typography>
                      )}
                      {!pr.mergedAt &&
                        pr.collateralScore &&
                        pr.prState !== 'CLOSED' && (
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.6rem',
                              color: (t) => alpha(t.palette.text.primary, 0.5),
                            }}
                          >
                            Collateral
                          </Typography>
                        )}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      ...bodyCellStyle,
                      width: '15%',
                      display: { xs: 'none', sm: 'table-cell' },
                      fontSize: { xs: '0.75rem', sm: '0.85rem' },
                      color: (t) => alpha(t.palette.text.primary, 0.7),
                    }}
                  >
                    {pr.mergedAt
                      ? new Date(pr.mergedAt).toLocaleDateString()
                      : pr.prState === 'CLOSED'
                        ? 'Closed'
                        : 'Open'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
};

const FilterButton: React.FC<{
  label: string;
  count: number;
  color: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, count, color, selected, onClick }) => (
  <Button
    size="small"
    onClick={onClick}
    sx={{
      color: selected
        ? 'text.primary'
        : (t) => alpha(t.palette.text.primary, 0.5),
      backgroundColor: selected ? 'surface.light' : 'transparent',
      borderRadius: '6px',
      px: 1.5,
      minWidth: 'auto',
      textTransform: 'none',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.75rem',
      border: selected ? `1px solid ${color}` : '1px solid transparent',
      '&:hover': {
        backgroundColor: (t) => alpha(t.palette.text.primary, 0.15),
      },
    }}
  >
    {label}{' '}
    <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.7rem' }}>
      {count}
    </span>
  </Button>
);

export default MinerPRsTable;

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
  TextField,
  InputAdornment,
  TableSortLabel,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import { useMinerPRs } from '../../api';
import { useNavigate } from 'react-router-dom';
import theme, { TIER_COLORS } from '../../theme';

type PRSortField = 'score' | 'date' | 'additions' | 'number';
type PRSortOrder = 'asc' | 'desc';

const ROWS_PER_PAGE = 15;

interface MinerPRsTableProps {
  githubId: string;
}

const MinerPRsTable: React.FC<MinerPRsTableProps> = ({ githubId }) => {
  const navigate = useNavigate();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'open' | 'merged' | 'closed'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<PRSortField>('date');
  const [sortOrder, setSortOrder] = useState<PRSortOrder>('desc');
  const [page, setPage] = useState(1);

  const handleSort = (field: PRSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Filter PRs by selected repository, author, status, search, and tier
  const filteredPRs = useMemo(() => {
    if (!prs) return [];
    let filtered = prs;
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
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pr) =>
          pr.pullRequestTitle?.toLowerCase().includes(q) ||
          pr.repository?.toLowerCase().includes(q),
      );
    }
    // Tier filter
    if (tierFilter) {
      filtered = filtered.filter(
        (pr) => pr.tier?.toLowerCase() === tierFilter.toLowerCase(),
      );
    }
    return filtered;
  }, [prs, selectedRepo, selectedAuthor, statusFilter, searchQuery, tierFilter]);

  // Sort filtered PRs
  const sortedPRs = useMemo(() => {
    const sorted = [...filteredPRs];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'score':
          cmp = parseFloat(a.score || '0') - parseFloat(b.score || '0');
          break;
        case 'date': {
          const dateA = a.mergedAt || a.prCreatedAt || '';
          const dateB = b.mergedAt || b.prCreatedAt || '';
          cmp = new Date(dateA).getTime() - new Date(dateB).getTime();
          break;
        }
        case 'additions':
          cmp = (a.additions || 0) - (b.additions || 0);
          break;
        case 'number':
          cmp = a.pullRequestNumber - b.pullRequestNumber;
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredPRs, sortField, sortOrder]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedPRs.length / ROWS_PER_PAGE));
  const paginatedPRs = sortedPRs.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  const statusCounts = useMemo(() => {
    if (!prs) return { all: 0, open: 0, merged: 0, closed: 0 };
    return {
      all: prs.length,
      open: prs.filter(
        (pr) => pr.prState === 'OPEN' || (!pr.prState && !pr.mergedAt),
      ).length,
      merged: prs.filter((pr) => pr.mergedAt || pr.prState === 'MERGED').length,
      closed: prs.filter((pr) => pr.prState === 'CLOSED' && !pr.mergedAt)
        .length,
    };
  }, [prs]);

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

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        p: 0, // Remove padding to let table fill the card
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Ensure rounded corners clip content
      }}
      elevation={0}
    >
      {/* Header */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: { xs: '0.95rem', sm: '1.1rem' },
                fontWeight: 500,
              }}
            >
              Pull Requests
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
              }}
            >
              ({filteredPRs.length}
              {selectedRepo || selectedAuthor || statusFilter !== 'all' || searchQuery || tierFilter
                ? ` of ${prs?.length || 0}`
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
            {tierFilter && (
              <Chip
                variant="filter"
                label={`Tier: ${tierFilter}`}
                onDelete={() => { setTierFilter(null); setPage(1); }}
                sx={{
                  color: tierFilter === 'Gold' ? TIER_COLORS.gold
                    : tierFilter === 'Silver' ? TIER_COLORS.silver
                    : TIER_COLORS.bronze,
                }}
              />
            )}

            {/* Status Filter Buttons */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <FilterButton
                label="All"
                count={statusCounts.all}
                color={theme.palette.status.neutral}
                selected={statusFilter === 'all'}
                onClick={() => { setStatusFilter('all'); setPage(1); }}
              />
              <FilterButton
                label="Open"
                count={statusCounts.open}
                color={theme.palette.status.open}
                selected={statusFilter === 'open'}
                onClick={() => { setStatusFilter('open'); setPage(1); }}
              />
              <FilterButton
                label="Merged"
                count={statusCounts.merged}
                color={theme.palette.status.merged}
                selected={statusFilter === 'merged'}
                onClick={() => { setStatusFilter('merged'); setPage(1); }}
              />
              <FilterButton
                label="Closed"
                count={statusCounts.closed}
                color={theme.palette.status.closed}
                selected={statusFilter === 'closed'}
                onClick={() => { setStatusFilter('closed'); setPage(1); }}
              />
            </Box>
          </Box>
        </Box>

        {/* Search + Tier filter row */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            placeholder="Search by title or repo..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.1)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255,255,255,0.2)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {['Bronze', 'Silver', 'Gold'].map((tier) => (
              <Button
                key={tier}
                size="small"
                onClick={() => {
                  setTierFilter(tierFilter === tier ? null : tier);
                  setPage(1);
                }}
                sx={{
                  color: tierFilter === tier
                    ? (tier === 'Gold' ? TIER_COLORS.gold : tier === 'Silver' ? TIER_COLORS.silver : TIER_COLORS.bronze)
                    : 'rgba(255,255,255,0.4)',
                  backgroundColor: tierFilter === tier ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderRadius: '6px',
                  px: 1.5,
                  minWidth: 'auto',
                  textTransform: 'none',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  border: tierFilter === tier
                    ? `1px solid ${tier === 'Gold' ? TIER_COLORS.gold : tier === 'Silver' ? TIER_COLORS.silver : TIER_COLORS.bronze}`
                    : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                {tier}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Table */}
      {!prs || prs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No PRs found
          </Typography>
        </Box>
      ) : filteredPRs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
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
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
                    direction={sortField === 'number' ? sortOrder : 'desc'}
                    onClick={() => handleSort('number')}
                    sx={sortLabelSx}
                  >
                    PR #
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellStyle}>Title</TableCell>
                <TableCell
                  sx={{
                    ...headerCellStyle,
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                >
                  Repository
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    ...headerCellStyle,
                    display: { xs: 'none', md: 'table-cell' },
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'additions'}
                    direction={sortField === 'additions' ? sortOrder : 'desc'}
                    onClick={() => handleSort('additions')}
                    sx={sortLabelSx}
                  >
                    +/-
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'score'}
                    direction={sortField === 'score' ? sortOrder : 'desc'}
                    onClick={() => handleSort('score')}
                    sx={sortLabelSx}
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
                    active={sortField === 'date'}
                    direction={sortField === 'date' ? sortOrder : 'desc'}
                    onClick={() => handleSort('date')}
                    sx={sortLabelSx}
                  >
                    Merged
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPRs.map((pr, index) => (
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
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
                    <a
                      href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      #{pr.pullRequestNumber}
                    </a>
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
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backgroundColor:
                            pr.repository.split('/')[0] === 'opentensor'
                              ? '#ffffff'
                              : pr.repository.split('/')[0] === 'bitcoin'
                                ? '#F7931A'
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
                            color: 'rgba(255, 255, 255, 0.3)',
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
                            color: '#fb923c',
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
                              color: 'rgba(255,255,255,0.5)',
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
                      color: 'rgba(255,255,255,0.7)',
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

      {/* Pagination */}
      {sortedPRs.length > ROWS_PER_PAGE && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            p: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_e, newPage) => setPage(newPage)}
            size="small"
            sx={{
              '& .MuiPaginationItem-root': {
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(29, 55, 252, 0.2)',
                  color: '#ffffff',
                  border: '1px solid rgba(29, 55, 252, 0.4)',
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              },
            }}
          />
        </Box>
      )}
    </Card>
  );
};

const sortLabelSx = {
  color: 'inherit',
  '&:hover': { color: 'rgba(255, 255, 255, 0.9)' },
  '&.Mui-active': {
    color: 'rgba(255, 255, 255, 0.9)',
    '& .MuiTableSortLabel-icon': {
      color: 'rgba(255, 255, 255, 0.9) !important',
    },
  },
};

const headerCellStyle = {
  backgroundColor: 'rgba(18, 18, 20, 0.95)',
  backdropFilter: 'blur(8px)',
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: { xs: '0.65rem', sm: '0.75rem' },
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  height: { xs: '48px', sm: '56px' },
  py: { xs: 1, sm: 1.5 },
  px: { xs: 0.5, sm: 2 },
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const bodyCellStyle = {
  color: '#ffffff',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  fontSize: '0.85rem',
  py: { xs: 0.75, sm: 1 },
  px: { xs: 0.5, sm: 2 },
  height: { xs: '52px', sm: '60px' },
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
      color: selected ? '#fff' : 'rgba(255,255,255,0.5)',
      backgroundColor: selected ? 'rgba(255,255,255,0.1)' : 'transparent',
      borderRadius: '6px',
      px: 1.5,
      minWidth: 'auto',
      textTransform: 'none',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.75rem',
      border: selected ? `1px solid ${color}` : '1px solid transparent',
      '&:hover': {
        backgroundColor: 'rgba(255,255,255,0.15)',
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

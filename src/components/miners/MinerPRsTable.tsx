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
  TablePagination,
  CircularProgress,
  Avatar,
  Chip,
  Button,
  TextField,
  InputAdornment,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMinerPRs } from '../../api';
import { useNavigate } from 'react-router-dom';
import theme from '../../theme';
import type { CommitLog } from '../../api';

interface MinerPRsTableProps {
  githubId: string;
  search?: string;
  onSearchChange?: (value: string) => void;
}

type SortField = 'score' | 'merged' | 'changes' | 'title' | 'repo';
type SortOrder = 'asc' | 'desc';

const MinerPRsTable: React.FC<MinerPRsTableProps> = ({
  githubId,
  search: externalSearch,
  onSearchChange,
}) => {
  const navigate = useNavigate();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'open' | 'merged' | 'closed'
  >('all');
  const [internalSearch, setInternalSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const searchQuery = (externalSearch ?? internalSearch).trim().toLowerCase();

  // Reset to first page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedRepo, selectedAuthor, statusFilter]);

  const matchesSearch = (pr: CommitLog) => {
    if (!searchQuery) return true;
    const title = (pr.pullRequestTitle || '').toLowerCase();
    const repo = (pr.repository || '').toLowerCase();
    const num = String(pr.pullRequestNumber);
    return (
      title.includes(searchQuery) ||
      repo.includes(searchQuery) ||
      num.includes(searchQuery)
    );
  };

  // Filter PRs by selected repository, author, status, and search
  const filteredPRs = useMemo(() => {
    if (!prs) return [];
    let filtered = prs.filter(matchesSearch);
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
    const dir = sortOrder === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'score': {
          const sa = parseFloat(a.score || '0');
          const sb = parseFloat(b.score || '0');
          cmp = sa - sb;
          break;
        }
        case 'merged': {
          const ta = a.mergedAt ? new Date(a.mergedAt).getTime() : 0;
          const tb = b.mergedAt ? new Date(b.mergedAt).getTime() : 0;
          cmp = ta - tb;
          break;
        }
        case 'changes': {
          const ca = (a.additions || 0) + (a.deletions || 0);
          const cb = (b.additions || 0) + (b.deletions || 0);
          cmp = ca - cb;
          break;
        }
        case 'title':
          cmp = (a.pullRequestTitle || '').localeCompare(b.pullRequestTitle || '');
          break;
        case 'repo':
          cmp = (a.repository || '').localeCompare(b.repository || '');
          break;
        default:
          break;
      }
      return cmp * dir;
    });
    return filtered;
  }, [
    prs,
    selectedRepo,
    selectedAuthor,
    statusFilter,
    searchQuery,
    sortField,
    sortOrder,
  ]);

  const paginatedPRs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredPRs.slice(start, start + rowsPerPage);
  }, [filteredPRs, page, rowsPerPage]);

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
              {selectedRepo || selectedAuthor || statusFilter !== 'all'
                ? ` of ${prs?.length || 0}`
                : ''}
              {filteredPRs.length > rowsPerPage
                ? ` · page ${page + 1} of ${Math.ceil(filteredPRs.length / rowsPerPage)}`
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
            {!onSearchChange && (
              <TextField
                size="small"
                placeholder="Search PRs by title, repo, or #..."
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }} />
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
                    maxWidth: 260,
                  },
                }}
                sx={{ minWidth: 200 }}
              />
            )}
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
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
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
            sx={{ tableLayout: 'fixed', minWidth: { xs: 600, sm: 800 } }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headerCellStyle, width: '10%' }}>PR #</TableCell>
                <TableCell sx={{ ...headerCellStyle, width: '28%' }}>
                  <TableSortLabel
                    active={sortField === 'title'}
                    direction={sortField === 'title' ? sortOrder : 'asc'}
                    onClick={() => {
                      setSortField('title');
                      setSortOrder(
                        sortField === 'title' && sortOrder === 'asc'
                          ? 'desc'
                          : 'asc',
                      );
                    }}
                    sx={{ color: 'inherit', '&.Mui-active': { color: 'rgba(255,255,255,0.9)' } }}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{
                    ...headerCellStyle,
                    width: '22%',
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'repo'}
                    direction={sortField === 'repo' ? sortOrder : 'asc'}
                    onClick={() => {
                      setSortField('repo');
                      setSortOrder(
                        sortField === 'repo' && sortOrder === 'asc'
                          ? 'desc'
                          : 'asc',
                      );
                    }}
                    sx={{ color: 'inherit', '&.Mui-active': { color: 'rgba(255,255,255,0.9)' } }}
                  >
                    Repository
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    ...headerCellStyle,
                    width: '10%',
                    display: { xs: 'none', md: 'table-cell' },
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'changes'}
                    direction={sortField === 'changes' ? sortOrder : 'desc'}
                    onClick={() => {
                      setSortField('changes');
                      setSortOrder(
                        sortField === 'changes' && sortOrder === 'desc'
                          ? 'asc'
                          : 'desc',
                      );
                    }}
                    sx={{ color: 'inherit', '&.Mui-active': { color: 'rgba(255,255,255,0.9)' } }}
                  >
                    +/-
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ ...headerCellStyle, width: '10%' }}>
                  <TableSortLabel
                    active={sortField === 'score'}
                    direction={sortField === 'score' ? sortOrder : 'desc'}
                    onClick={() => {
                      setSortField('score');
                      setSortOrder(
                        sortField === 'score' && sortOrder === 'desc'
                          ? 'asc'
                          : 'desc',
                      );
                    }}
                    sx={{ color: 'inherit', '&.Mui-active': { color: 'rgba(255,255,255,0.9)' } }}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    ...headerCellStyle,
                    width: '10%',
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'merged'}
                    direction={sortField === 'merged' ? sortOrder : 'desc'}
                    onClick={() => {
                      setSortField('merged');
                      setSortOrder(
                        sortField === 'merged' && sortOrder === 'desc'
                          ? 'asc'
                          : 'desc',
                      );
                    }}
                    sx={{ color: 'inherit', '&.Mui-active': { color: 'rgba(255,255,255,0.9)' } }}
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
                      width: { xs: '45%', sm: '28%' },
                      fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    }}
                  >
                    <Tooltip
                      title={pr.pullRequestTitle}
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
                        component="span"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                        }}
                      >
                        {pr.pullRequestTitle}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell
                    sx={{
                      ...bodyCellStyle,
                      width: '22%',
                      display: { xs: 'none', sm: 'table-cell' },
                    }}
                  >
                    <Tooltip
                      title={pr.repository}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRepo(pr.repository);
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          cursor: 'pointer',
                          minWidth: 0,
                          overflow: 'hidden',
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
                            flexShrink: 0,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            backgroundColor:
                              pr.repository.split('/')[0] === 'opentensor'
                                ? '#ffffff'
                                : pr.repository.split('/')[0] === 'bitcoin'
                                  ? '#F7931A'
                                  : 'transparent',
                          }}
                        />
                        <Box
                          component="span"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: 0,
                          }}
                        >
                          {pr.repository}
                        </Box>
                      </Box>
                    </Tooltip>
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
          {filteredPRs.length > 10 && (
            <TablePagination
              component="div"
              count={filteredPRs.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              sx={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                '& .MuiTablePagination-selectIcon': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiTablePagination-actions button': { color: 'rgba(255,255,255,0.7)' },
              }}
            />
          )}
        </TableContainer>
      )}
    </Card>
  );
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
  overflow: 'hidden' as const,
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

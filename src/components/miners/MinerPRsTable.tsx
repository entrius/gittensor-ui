import React, { useState, useMemo, useCallback } from 'react';
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
  TableSortLabel,
  CircularProgress,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  Tooltip,
  alpha,
  useTheme,
  type Theme,
} from '@mui/material';
import {
  Search as SearchIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import { useMinerPRs, useReposAndWeights, type CommitLog } from '../../api';
import { useNavigate } from 'react-router-dom';
import { TIER_COLORS } from '../../theme';
import ExplorerFilterButton from './ExplorerFilterButton';
import {
  type MinerTierFilter,
  type MinerStatusFilter,
  countPrTiers,
  filterPrsByTier,
} from './explorerUtils';

type PrSortField = 'number' | 'score' | 'lines' | 'date';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
      color: 'text.primary',
      fontSize: '0.72rem',
      fontFamily: '"JetBrains Mono", monospace',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: 'border.light',
      maxWidth: 260,
    },
  },
  arrow: { sx: { color: 'rgba(30, 30, 30, 0.95)' } },
};

const getScoreTooltip = (pr: CommitLog): string | null => {
  const base = parseFloat(pr.baseScore || '0');
  if (!pr.mergedAt || base <= 0) return null;
  const parts: string[] = [`Base: ${base.toFixed(2)}`];
  if (pr.tokenScore != null)
    parts.push(`Tokens: ${Number(pr.tokenScore).toFixed(2)}`);
  if (pr.rawCredibility != null)
    parts.push(`Cred: ${(pr.rawCredibility * 100).toFixed(0)}%`);
  if (pr.credibilityScalar != null)
    parts.push(`Cred scalar: ${pr.credibilityScalar.toFixed(2)}×`);
  return parts.join(' · ');
};

interface MinerPRsTableProps {
  githubId: string;
  /** When set externally (e.g. from TierDetailsPage), overrides internal tier filter. */
  tierFilter?: string;
}

const MinerPRsTable: React.FC<MinerPRsTableProps> = ({
  githubId,
  tierFilter: externalTierFilter,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MinerStatusFilter>('all');
  const [internalTierFilter, setTierFilter] = useState<MinerTierFilter>('all');
  const tierFilter: MinerTierFilter =
    (externalTierFilter?.toLowerCase() as MinerTierFilter) ||
    internalTierFilter;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<PrSortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const repoTiers = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo?.fullName) map.set(repo.fullName, repo.tier || '');
      });
    }
    return map;
  }, [repos]);

  const handleSort = useCallback(
    (field: PrSortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
      setPage(0);
    },
    [sortField],
  );

  const filteredPRs = useMemo(() => {
    if (!prs) return [];
    let filtered = prs;
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
    filtered = filterPrsByTier(filtered, tierFilter, repoTiers);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pr) =>
          pr.pullRequestTitle.toLowerCase().includes(q) ||
          pr.repository.toLowerCase().includes(q) ||
          String(pr.pullRequestNumber).includes(q),
      );
    }
    return filtered;
  }, [
    prs,
    selectedAuthor,
    statusFilter,
    tierFilter,
    repoTiers,
    searchQuery,
  ]);

  const sortedPRs = useMemo(() => {
    const sorted = [...filteredPRs];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'number':
          cmp = a.pullRequestNumber - b.pullRequestNumber;
          break;
        case 'score':
          cmp = parseFloat(a.score || '0') - parseFloat(b.score || '0');
          break;
        case 'lines':
          cmp = a.additions + a.deletions - (b.additions + b.deletions);
          break;
        case 'date': {
          const da = a.mergedAt || a.prCreatedAt || '';
          const db = b.mergedAt || b.prCreatedAt || '';
          cmp = da.localeCompare(db);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredPRs, sortField, sortDir]);

  const pagedPRs = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedPRs.slice(start, start + PAGE_SIZE);
  }, [sortedPRs, page]);

  const totalPages = Math.ceil(sortedPRs.length / PAGE_SIZE);

  const statusCounts = useMemo(() => {
    if (!prs) return { all: 0, open: 0, merged: 0, closed: 0 };
    return {
      all: prs.length,
      open: prs.filter(
        (pr: CommitLog) =>
          pr.prState === 'OPEN' || (!pr.prState && !pr.mergedAt),
      ).length,
      merged: prs.filter(
        (pr: CommitLog) => pr.mergedAt || pr.prState === 'MERGED',
      ).length,
      closed: prs.filter(
        (pr: CommitLog) => pr.prState === 'CLOSED' && !pr.mergedAt,
      ).length,
    };
  }, [prs]);

  const tierCounts = useMemo(() => {
    if (!prs) return { all: 0, gold: 0, silver: 0, bronze: 0 };
    return countPrTiers(prs, repoTiers);
  }, [prs, repoTiers]);

  if (isLoading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }} elevation={0}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  return (
    <Card
      sx={{
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
              {selectedAuthor ||
              statusFilter !== 'all' ||
              tierFilter !== 'all' ||
              searchQuery.trim()
                ? ` of ${prs?.length || 0}`
                : ''}
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
            {selectedAuthor && (
              <Chip
                variant="filter"
                label={`Author: ${selectedAuthor}`}
                onDelete={() => setSelectedAuthor(null)}
              />
            )}

            {/* Status Filter Buttons */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <ExplorerFilterButton
                label="All"
                count={statusCounts.all}
                color={theme.palette.status.neutral}
                selected={statusFilter === 'all'}
                onClick={() => {
                  setStatusFilter('all');
                  setPage(0);
                }}
              />
              <ExplorerFilterButton
                label="Open"
                count={statusCounts.open}
                color={theme.palette.status.open}
                selected={statusFilter === 'open'}
                onClick={() => {
                  setStatusFilter('open');
                  setPage(0);
                }}
              />
              <ExplorerFilterButton
                label="Merged"
                count={statusCounts.merged}
                color={theme.palette.status.merged}
                selected={statusFilter === 'merged'}
                onClick={() => {
                  setStatusFilter('merged');
                  setPage(0);
                }}
              />
              <ExplorerFilterButton
                label="Closed"
                count={statusCounts.closed}
                color={theme.palette.status.closed}
                selected={statusFilter === 'closed'}
                onClick={() => {
                  setStatusFilter('closed');
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
          placeholder="Search by title, repo, or PR number..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{ color: (t) => alpha(t.palette.text.primary, 0.3), fontSize: '1rem' }}
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
      ) : pagedPRs.length === 0 ? (
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
                  <TableCell sx={{ ...headerCellStyle, width: '10%' }}>
                    <TableSortLabel
                      active={sortField === 'number'}
                      direction={sortField === 'number' ? sortDir : 'desc'}
                      onClick={() => handleSort('number')}
                      sx={sortLabelSx}
                    >
                      PR #
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...headerCellStyle, width: '25%' }}>
                    Title
                  </TableCell>
                  <TableCell sx={{ ...headerCellStyle, width: '25%' }}>
                    Repository
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...headerCellStyle, width: '12%' }}
                  >
                    <TableSortLabel
                      active={sortField === 'lines'}
                      direction={sortField === 'lines' ? sortDir : 'desc'}
                      onClick={() => handleSort('lines')}
                      sx={sortLabelSx}
                    >
                      +/-
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...headerCellStyle, width: '13%' }}
                  >
                    <TableSortLabel
                      active={sortField === 'score'}
                      direction={sortField === 'score' ? sortDir : 'desc'}
                      onClick={() => handleSort('score')}
                      sx={sortLabelSx}
                    >
                      Score
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...headerCellStyle, width: '15%' }}
                  >
                    <TableSortLabel
                      active={sortField === 'date'}
                      direction={sortField === 'date' ? sortDir : 'desc'}
                      onClick={() => handleSort('date')}
                      sx={sortLabelSx}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedPRs.map((pr, index) => {
                  const scoreTooltip = getScoreTooltip(pr);
                  return (
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
                          backgroundColor: 'surface.subtle',
                        },
                        transition: 'all 0.2s',
                      }}
                    >
                      <TableCell
                        sx={{
                          ...bodyCellStyle,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' },
                        }}
                      >
                        <a
                          href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'inherit',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          #{pr.pullRequestNumber}
                        </a>
                      </TableCell>
                      <TableCell
                        sx={{
                          ...bodyCellStyle,
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
                      <TableCell sx={bodyCellStyle}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            overflow: 'hidden',
                          }}
                        >
                          <Avatar
                            src={`https://avatars.githubusercontent.com/${pr.repository.split('/')[0]}`}
                            alt={pr.repository.split('/')[0]}
                            sx={{
                              width: 20,
                              height: 20,
                              flexShrink: 0,
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
                          <Box
                            component="span"
                            sx={{
                              wordBreak: 'break-word',
                              lineHeight: 1.3,
                            }}
                          >
                            {pr.repository}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={bodyCellStyle}>
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
                      <TableCell align="right" sx={bodyCellStyle}>
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
                                color: theme.palette.status.warningOrange,
                              }}
                            >
                              {parseFloat(pr.collateralScore).toFixed(4)}
                            </Typography>
                          ) : scoreTooltip ? (
                            <Tooltip
                              title={scoreTooltip}
                              arrow
                              placement="left"
                              slotProps={tooltipSlotProps}
                            >
                              <Typography
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {parseFloat(pr.score).toFixed(4)}
                              </Typography>
                            </Tooltip>
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
                  '&:hover': page < totalPages - 1 ? { color: 'text.primary' } : {},
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

const sortLabelSx = {
  '&.MuiTableSortLabel-root': { color: (t: Theme) => alpha(t.palette.text.primary, 0.7) },
  '&.MuiTableSortLabel-root:hover': { color: 'text.primary' },
  '&.Mui-active': { color: 'text.primary' },
  '& .MuiTableSortLabel-icon': { color: (t: Theme) => `${alpha(t.palette.text.primary, 0.4)} !important` },
};

const headerCellStyle = {
  backgroundColor: 'surface.elevated',
  backdropFilter: 'blur(8px)',
  color: (t: Theme) => alpha(t.palette.text.primary, 0.7),
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: { xs: '0.65rem', sm: '0.75rem' },
  borderBottom: '1px solid',
  borderColor: 'border.light',
  height: { xs: '48px', sm: '56px' },
  py: { xs: 1, sm: 1.5 },
  px: { xs: 0.5, sm: 2 },
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const bodyCellStyle = {
  color: 'text.primary',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid',
  borderColor: 'border.light',
  fontSize: '0.85rem',
  py: { xs: 0.75, sm: 1 },
  px: { xs: 0.5, sm: 2 },
  height: { xs: '52px', sm: '60px' },
};

export default MinerPRsTable;

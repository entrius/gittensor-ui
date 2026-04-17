import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Search as SearchIcon } from '@mui/icons-material';
import { useMinerPRs, type CommitLog } from '../../api';
import {
  filterPrs,
  getPrStatusCounts,
  paginateItems,
  type PrStatusFilter,
  type ExportColumn,
} from '../../utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ExplorerFilterButton from './ExplorerFilterButton';
import TablePagination from './TablePagination';
import { ExportMenu } from '../common/ExportMenu';
import { headerCellStyle, bodyCellStyle, tooltipSlotProps } from '../../theme';

type PrSortField = 'number' | 'repository' | 'score' | 'lines' | 'date';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

const PR_STATUS_FILTERS: readonly PrStatusFilter[] = [
  'all',
  'open',
  'merged',
  'closed',
];

// Direction applied when a user first clicks a column header — string
// columns feel natural ascending, numeric/date columns descending.
const DEFAULT_SORT_DIR: Record<PrSortField, SortDir> = {
  number: 'desc',
  repository: 'asc',
  score: 'desc',
  lines: 'desc',
  date: 'desc',
};

// Mirrors the Score cell's render logic so clicking the Score header
// sorts by what users actually see: merged → score, open → collateral,
// closed-unmerged → treated as zero.
const getEffectiveScore = (pr: CommitLog): number => {
  if (pr.prState === 'CLOSED' && !pr.mergedAt) return 0;
  if (!pr.mergedAt && pr.collateralScore) {
    return parseFloat(pr.collateralScore || '0');
  }
  return parseFloat(pr.score || '0');
};

const getScoreTooltip = (pr: CommitLog): string | null => {
  const base = parseFloat(pr.baseScore || '0');
  if (!pr.mergedAt || base <= 0) return null;
  const parts: string[] = [`Base: ${base.toFixed(2)}`];
  if (pr.tokenScore != null)
    parts.push(`Tokens: ${Number(pr.tokenScore).toFixed(2)}`);
  if (pr.credibilityMultiplier != null)
    parts.push(`Cred: ${Number(pr.credibilityMultiplier).toFixed(2)}×`);
  return parts.join(' · ');
};

const isPrStatusFilter = (value: string | null): value is PrStatusFilter =>
  value !== null && (PR_STATUS_FILTERS as readonly string[]).includes(value);

interface MinerPRsTableProps {
  githubId: string;
}

const MinerPRsTable: React.FC<MinerPRsTableProps> = ({ githubId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<PrSortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const prStatusParam = searchParams.get('prStatus');
  const statusFilter: PrStatusFilter = isPrStatusFilter(prStatusParam)
    ? prStatusParam
    : 'all';

  useEffect(() => {
    setSelectedAuthor(null);
    setSearchQuery('');
    setSortField('date');
    setSortDir('desc');
  }, [githubId]);

  const page = parseInt(searchParams.get('prPage') || '0', 10);
  const setPage = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const next = typeof updater === 'function' ? updater(page) : updater;
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 0) p.delete('prPage');
          else p.set('prPage', String(next));
          return p;
        },
        { replace: true },
      );
    },
    [page, setSearchParams],
  );

  const setStatusFilter = useCallback(
    (next: PrStatusFilter) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'all') p.delete('prStatus');
          else p.set('prStatus', next);
          p.delete('prPage');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleSort = useCallback(
    (field: PrSortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir(DEFAULT_SORT_DIR[field]);
      }
      setPage(0);
    },
    [sortField, setPage],
  );

  const filteredPRs = useMemo(
    () =>
      filterPrs(prs ?? [], {
        author: selectedAuthor,
        includeNumber: true,
        searchQuery,
        statusFilter,
      }),
    [prs, selectedAuthor, statusFilter, searchQuery],
  );

  const sortedPRs = useMemo(() => {
    const sorted = [...filteredPRs];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'number':
          cmp = a.pullRequestNumber - b.pullRequestNumber;
          break;
        case 'repository':
          cmp = a.repository.localeCompare(b.repository);
          if (cmp === 0) cmp = a.pullRequestNumber - b.pullRequestNumber;
          break;
        case 'score':
          cmp = getEffectiveScore(a) - getEffectiveScore(b);
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

  const pagedPRs = useMemo(
    () => paginateItems(sortedPRs, page, PAGE_SIZE),
    [sortedPRs, page],
  );

  const totalPages = Math.ceil(sortedPRs.length / PAGE_SIZE);

  const statusCounts = useMemo(() => {
    if (!prs) return { all: 0, open: 0, merged: 0, closed: 0 };
    return getPrStatusCounts(prs);
  }, [prs]);

  const exportColumns = useMemo<ExportColumn<CommitLog>[]>(
    () => [
      {
        label: 'PR #',
        accessor: (pr) => pr.pullRequestNumber,
        width: 8,
      },
      { label: 'Title', accessor: (pr) => pr.pullRequestTitle, width: 60 },
      { label: 'Repository', accessor: (pr) => pr.repository, width: 28 },
      { label: 'Additions', accessor: (pr) => pr.additions, width: 10 },
      { label: 'Deletions', accessor: (pr) => pr.deletions, width: 10 },
      {
        label: 'Score',
        accessor: (pr) => Number(getEffectiveScore(pr).toFixed(4)),
        width: 10,
      },
      {
        label: 'Status',
        accessor: (pr) =>
          pr.mergedAt ? 'Merged' : pr.prState === 'CLOSED' ? 'Closed' : 'Open',
        width: 8,
      },
      {
        label: 'Date',
        accessor: (pr) => pr.mergedAt ?? pr.prCreatedAt ?? '',
        width: 20,
      },
    ],
    [],
  );

  const exportOptions = useMemo(
    () => ({
      slug: `miner-prs-${githubId}`,
      title: `Miner PRs (${githubId})`,
    }),
    [githubId],
  );

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
                fontSize: { xs: '0.95rem', sm: '1.1rem' },
                fontWeight: 500,
              }}
            >
              Pull Requests
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontSize: '0.75rem',
              }}
            >
              ({filteredPRs.length}
              {selectedAuthor || statusFilter !== 'all' || searchQuery.trim()
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
                onDelete={() => {
                  setSelectedAuthor(null);
                  setPage(0);
                }}
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
                }}
              />
              <ExplorerFilterButton
                label="Open"
                count={statusCounts.open}
                color={theme.palette.status.open}
                selected={statusFilter === 'open'}
                onClick={() => {
                  setStatusFilter('open');
                }}
              />
              <ExplorerFilterButton
                label="Merged"
                count={statusCounts.merged}
                color={theme.palette.status.merged}
                selected={statusFilter === 'merged'}
                onClick={() => {
                  setStatusFilter('merged');
                }}
              />
              <ExplorerFilterButton
                label="Closed"
                count={statusCounts.closed}
                color={theme.palette.status.closed}
                selected={statusFilter === 'closed'}
                onClick={() => {
                  setStatusFilter('closed');
                }}
              />
            </Box>
            <ExportMenu
              rows={sortedPRs}
              columns={exportColumns}
              options={exportOptions}
            />
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
                    <TableSortLabel
                      active={sortField === 'repository'}
                      direction={
                        sortField === 'repository'
                          ? sortDir
                          : DEFAULT_SORT_DIR.repository
                      }
                      onClick={() => handleSort('repository')}
                      sx={sortLabelSx}
                    >
                      Repository
                    </TableSortLabel>
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
                          }}
                        >
                          +{pr.additions}
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            color: theme.palette.diff.deletions,
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
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                fontWeight: 600,
                                color: (t) =>
                                  alpha(t.palette.text.primary, 0.3),
                              }}
                            >
                              -
                            </Typography>
                          ) : !pr.mergedAt && pr.collateralScore ? (
                            <Typography
                              sx={{
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                fontWeight: 600,
                                color: theme.palette.status.warningOrange,
                              }}
                            >
                              {parseFloat(pr.collateralScore || '0').toFixed(4)}
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
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {parseFloat(pr.score || '0').toFixed(4)}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography
                              sx={{
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                fontWeight: 600,
                              }}
                            >
                              {parseFloat(pr.score || '0').toFixed(4)}
                            </Typography>
                          )}
                          {!pr.mergedAt &&
                            pr.collateralScore &&
                            pr.prState !== 'CLOSED' && (
                              <Typography
                                sx={{
                                  fontSize: '0.6rem',
                                  color: (t) =>
                                    alpha(t.palette.text.primary, 0.5),
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

          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
};

const sortLabelSx = {
  '&.MuiTableSortLabel-root': {
    color: (t: Theme) => alpha(t.palette.text.primary, 0.7),
  },
  '&.MuiTableSortLabel-root:hover': { color: 'text.primary' },
  '&.Mui-active': { color: 'text.primary' },
  '& .MuiTableSortLabel-icon': {
    color: (t: Theme) => `${alpha(t.palette.text.primary, 0.4)} !important`,
  },
};

export default MinerPRsTable;

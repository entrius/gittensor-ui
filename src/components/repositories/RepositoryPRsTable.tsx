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
  TableSortLabel,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import { useAllPrs } from '../../api';
import { useNavigate } from 'react-router-dom';
import theme, { scrollbarSx } from '../../theme';
import {
  getPrStatusCounts,
  isClosedUnmergedPr,
  isMergedPr,
  isOpenPr,
} from '../../utils';
import FilterButton from '../FilterButton';
import type { CommitLog } from '../../api/models/Dashboard';

interface RepositoryPRsTableProps {
  repositoryFullName: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
}

type SortKey = 'pr' | 'commits' | 'changes' | 'score' | 'collateral' | 'date';
type SortDir = 'asc' | 'desc';

const num = (s?: string | null) => parseFloat(s || '0') || 0;

const effectiveDateMs = (pr: CommitLog) => {
  const iso = pr.mergedAt || pr.prCreatedAt;
  return iso ? new Date(iso).getTime() : 0;
};

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
  state = 'all',
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'merged'>(
    state,
  );
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Fetch ALL PRs at once to enable client-side filtering and accurate counts
  // This avoids server roundtrips on filter change and provides instant UI feedback
  const { data: allMinerPRs, isLoading } = useAllPrs();

  const allPRs = useMemo(() => {
    if (!allMinerPRs) return [];
    return allMinerPRs.filter(
      (pr) => pr.repository.toLowerCase() === repositoryFullName.toLowerCase(),
    );
  }, [allMinerPRs, repositoryFullName]);

  const counts = useMemo(() => {
    if (!allPRs) return { all: 0, open: 0, merged: 0, closed: 0 };
    return getPrStatusCounts(allPRs);
  }, [allPRs]);

  const filteredPRs = useMemo(() => {
    if (!allPRs) return [];
    if (filter === 'all') return allPRs;
    if (filter === 'merged') return allPRs.filter(isMergedPr);
    if (filter === 'open') return allPRs.filter(isOpenPr);
    if (filter === 'closed') return allPRs.filter(isClosedUnmergedPr);
    return allPRs;
  }, [allPRs, filter]);

  const sortedPRs = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const cmp = (a: CommitLog, b: CommitLog): number => {
      switch (sortKey) {
        case 'pr':
          return (a.pullRequestNumber - b.pullRequestNumber) * dir;
        case 'commits':
          return (a.commitCount - b.commitCount) * dir;
        case 'changes':
          return (
            (a.additions + a.deletions - (b.additions + b.deletions)) * dir
          );
        case 'collateral':
          return (num(a.collateralScore) - num(b.collateralScore)) * dir;
        case 'date':
          return (effectiveDateMs(a) - effectiveDateMs(b)) * dir;
        case 'score':
        default: {
          const primary = (num(a.score) - num(b.score)) * dir;
          if (primary !== 0) return primary;
          // Tie-break on collateral so the most-penalized open PRs surface
          // first when score ties at 0 (addresses issue #288 directly).
          return (num(a.collateralScore) - num(b.collateralScore)) * dir;
        }
      }
    };
    return [...filteredPRs].sort(cmp);
  }, [filteredPRs, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const renderFilters = () => (
    <Stack direction="row" spacing={1}>
      <FilterButton
        label="All"
        isActive={filter === 'all'}
        onClick={() => setFilter('all')}
        count={counts.all}
        color={theme.palette.status.neutral}
      />
      <FilterButton
        label="Open"
        isActive={filter === 'open'}
        onClick={() => setFilter('open')}
        count={counts.open}
        color={theme.palette.status.open}
      />
      <FilterButton
        label="Merged"
        isActive={filter === 'merged'}
        onClick={() => setFilter('merged')}
        count={counts.merged}
        color={theme.palette.status.merged}
      />
      <FilterButton
        label="Closed"
        isActive={filter === 'closed'}
        onClick={() => setFilter('closed')}
        count={counts.closed}
        color={theme.palette.status.closed}
      />
    </Stack>
  );

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{ color: '#fff', fontFamily: '"JetBrains Mono", monospace' }}
          >
            Pull Requests
          </Typography>
          {renderFilters()}
        </Box>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  // Aggregate stats for the current filter — surfaces total collateral
  // exposure across open PRs in this repo, which is the actionable number
  // the issue reporter is implicitly asking for.
  const totalCollateral = filteredPRs.reduce(
    (sum, pr) => (isOpenPr(pr) ? sum + num(pr.collateralScore) : sum),
    0,
  );

  const sortableHeader = (
    key: SortKey,
    label: React.ReactNode,
    align: 'left' | 'right' = 'left',
    tooltip?: string,
  ) => {
    const inner = (
      <TableSortLabel
        active={sortKey === key}
        direction={sortKey === key ? sortDir : 'desc'}
        onClick={() => handleSort(key)}
        sx={{
          color: 'inherit !important',
          '& .MuiTableSortLabel-icon': {
            color: 'inherit !important',
            opacity: sortKey === key ? 1 : 0.4,
          },
        }}
      >
        {label}
      </TableSortLabel>
    );
    return (
      <TableCell align={align} sx={headerCellStyle}>
        {tooltip ? (
          <Tooltip title={tooltip} arrow>
            <Box component="span">{inner}</Box>
          </Tooltip>
        ) : (
          inner
        )}
      </TableCell>
    );
  };

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
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.1rem',
              fontWeight: 500,
            }}
          >
            Pull Requests ({sortedPRs.length})
          </Typography>
          {totalCollateral > 0 && (
            <Tooltip
              title="Sum of collateral penalties currently applied across all open PRs in this repository."
              arrow
            >
              <Typography
                sx={{
                  mt: 0.5,
                  color: theme.palette.status.open,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.7rem',
                  letterSpacing: '0.5px',
                  cursor: 'help',
                }}
              >
                Open collateral exposure: −{totalCollateral.toFixed(4)}
              </Typography>
            </Tooltip>
          )}
        </Box>

        {renderFilters()}
      </Box>

      {sortedPRs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No pull requests found
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            maxHeight: '500px',
            overflow: 'auto',
            ...scrollbarSx,
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {sortableHeader('pr', 'PR #')}
                <TableCell sx={headerCellStyle}>Title</TableCell>
                <TableCell sx={headerCellStyle}>Author</TableCell>
                {sortableHeader('commits', 'Commits', 'right')}
                {sortableHeader('changes', '+/-', 'right')}
                {sortableHeader(
                  'score',
                  'Score',
                  'right',
                  'Final score for merged/closed PRs. For open PRs, shows the negative collateral penalty currently being applied. Click again to flip direction.',
                )}
                {sortableHeader(
                  'collateral',
                  'Collateral',
                  'right',
                  'Collateral penalty currently applied (only open PRs accrue collateral).',
                )}
                <TableCell sx={headerCellStyle}>Status</TableCell>
                {sortableHeader(
                  'date',
                  'Date',
                  'right',
                  'Merge date for merged PRs, otherwise creation date.',
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPRs.map((pr) => {
                const isOpen = isOpenPr(pr);
                const collateral = num(pr.collateralScore);
                const showCollateral = isOpen && collateral > 0;
                const scoreVal = num(pr.score);
                const scoreColor = showCollateral
                  ? theme.palette.status.open
                  : scoreVal > 0
                    ? theme.palette.diff.additions
                    : scoreVal < 0
                      ? theme.palette.diff.deletions
                      : 'rgba(255, 255, 255, 0.6)';
                const scoreDisplay = showCollateral
                  ? `−${collateral.toFixed(4)}`
                  : scoreVal.toFixed(4);
                const scoreTooltip = showCollateral
                  ? `Open PR collateral penalty: −${collateral.toFixed(4)}. This will be replaced by the earned score once the PR is merged or closed.`
                  : `Final score: ${scoreVal.toFixed(4)}.`;

                const isMergedRow = !!pr.mergedAt;
                const dateIso = isMergedRow ? pr.mergedAt! : pr.prCreatedAt;
                const dateObj = dateIso ? new Date(dateIso) : null;
                const dateLabel = isMergedRow ? 'merged' : 'created';

                return (
                  <TableRow
                    key={`${pr.repository}-${pr.pullRequestNumber}`}
                    onClick={() => {
                      navigate(
                        `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                        {
                          state: {
                            backLabel: `Back to ${repositoryFullName}`,
                          },
                        },
                      );
                    }}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell sx={bodyCellStyle}>
                      <a
                        href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#ffffff',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{pr.pullRequestNumber}
                      </a>
                    </TableCell>
                    <TableCell sx={bodyCellStyle}>
                      <Box
                        sx={{
                          maxWidth: '300px',
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
                          gap: 1,
                        }}
                      >
                        <Avatar
                          src={`https://avatars.githubusercontent.com/${pr.author}`}
                          alt={pr.author}
                          sx={{ width: 20, height: 20 }}
                        />
                        {pr.author}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      {pr.commitCount}
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      <Box
                        component="span"
                        sx={{ color: theme.palette.diff.additions, mr: 1 }}
                      >
                        +{pr.additions}
                      </Box>
                      <Box
                        component="span"
                        sx={{ color: theme.palette.diff.deletions }}
                      >
                        -{pr.deletions}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      <Tooltip title={scoreTooltip} arrow placement="left">
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: scoreColor,
                            cursor: 'help',
                          }}
                        >
                          {scoreDisplay}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      {collateral > 0 ? (
                        <Tooltip
                          title={
                            isOpen
                              ? 'Active collateral penalty while this PR remains open.'
                              : 'Collateral penalty recorded for this PR.'
                          }
                          arrow
                          placement="left"
                        >
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: isOpen
                                ? theme.palette.status.open
                                : 'rgba(255, 255, 255, 0.6)',
                              cursor: 'help',
                            }}
                          >
                            −{collateral.toFixed(4)}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Box
                          component="span"
                          sx={{ color: 'rgba(255, 255, 255, 0.3)' }}
                        >
                          —
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={bodyCellStyle}>
                      {(() => {
                        const st =
                          pr.prState?.toUpperCase() ||
                          (pr.mergedAt ? 'MERGED' : 'OPEN');
                        let color = theme.palette.status.neutral;
                        if (st === 'MERGED')
                          color = theme.palette.status.merged;
                        else if (st === 'OPEN')
                          color = theme.palette.status.open;
                        else if (st === 'CLOSED')
                          color = theme.palette.status.closed;
                        return (
                          <Chip
                            variant="status"
                            label={st}
                            sx={{ color, borderColor: color }}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      {dateObj ? (
                        <Tooltip
                          title={`${isMergedRow ? 'Merged' : 'Created'} on ${dateObj.toLocaleString()}`}
                          arrow
                          placement="left"
                        >
                          <Box
                            sx={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              cursor: 'help',
                            }}
                          >
                            <Box component="span">
                              {dateObj.toLocaleDateString()}
                            </Box>
                            <Box
                              component="span"
                              sx={{
                                fontSize: '0.6rem',
                                color: isMergedRow
                                  ? theme.palette.status.merged
                                  : theme.palette.status.open,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontWeight: 600,
                              }}
                            >
                              {dateLabel}
                            </Box>
                          </Box>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
};

export default RepositoryPRsTable;

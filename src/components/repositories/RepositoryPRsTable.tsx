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
  TableSortLabel,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  alpha,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CropSquareOutlinedIcon from '@mui/icons-material/CropSquareOutlined';

type PrSortField =
  | 'pullRequestNumber'
  | 'pullRequestTitle'
  | 'author'
  | 'commitCount'
  | 'lines'
  | 'score'
  | 'status'
  | 'mergedAt';
type SortOrder = 'asc' | 'desc';
import { useAllPrs } from '../../api';
import { LinkTableRow } from '../common/linkBehavior';
import theme, {
  TEXT_OPACITY,
  scrollbarSx,
  headerCellStyle,
  bodyCellStyle,
  REPOSITORY_PR_FILTER_COLORS,
} from '../../theme';
import {
  filterPrs,
  getPrStatusChipColor,
  getPrStatusCounts,
  type PrStatusFilter,
} from '../../utils';
import FilterButton from '../FilterButton';

interface RepositoryPRsTableProps {
  repositoryFullName: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
}

const PR_FILTER_COLORS = REPOSITORY_PR_FILTER_COLORS;

/** Selected chip: pale foreground (label, icon, count) — same idea as white‑mint Open */
const PR_FILTER_ACTIVE_FG = {
  open: '#c4f2d4',
  merged: '#c9e2ff',
  closed: '#ffd8de',
  all: '#f0f6fc',
} as const;

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
  state = 'all',
}) => {
  const [filter, setFilter] = useState<PrStatusFilter>(state);
  const [sortField, setSortField] = useState<PrSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = useCallback(
    (field: PrSortField) => {
      if (sortField === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder(
          field === 'pullRequestTitle' || field === 'author' ? 'asc' : 'desc',
        );
      }
    },
    [sortField],
  );

  const filterOpen = useCallback(() => setFilter('open'), []);
  const filterMerged = useCallback(() => setFilter('merged'), []);
  const filterClosed = useCallback(() => setFilter('closed'), []);
  const filterAll = useCallback(() => setFilter('all'), []);

  // Fetch ALL PRs at once to enable client-side filtering and accurate counts
  // This avoids server roundtrips on filter change and provides instant UI feedback
  const { data: allMinerPRs, isLoading } = useAllPrs();

  const allPRs = useMemo(() => {
    if (!allMinerPRs) return [];
    return allMinerPRs.filter(
      (pr) => pr.repository.toLowerCase() === repositoryFullName.toLowerCase(),
    );
  }, [allMinerPRs, repositoryFullName]);

  const counts = useMemo(() => getPrStatusCounts(allPRs), [allPRs]);

  const prsInActiveFilter = useMemo(
    () => filterPrs(allPRs, { statusFilter: filter }),
    [allPRs, filter],
  );

  const filteredPRs = useMemo(() => {
    const statusFiltered = prsInActiveFilter;
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return statusFiltered;

    return statusFiltered.filter((pr) => {
      const title = pr.pullRequestTitle?.toLowerCase() ?? '';
      const author = pr.author?.toLowerCase() ?? '';
      const labels = pr.label?.toLowerCase() ?? '';
      const number = String(pr.pullRequestNumber);
      return (
        title.includes(normalized) ||
        author.includes(normalized) ||
        labels.includes(normalized) ||
        number.includes(normalized)
      );
    });
  }, [prsInActiveFilter, searchQuery]);

  const sortedPRs = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const cmpStr = (a = '', b = '') => a.localeCompare(b) * dir;
    const cmpNum = (a = 0, b = 0) => (a - b) * dir;
    const stateRank = (pr: (typeof filteredPRs)[number]) => {
      const s = pr.prState?.toUpperCase() || (pr.mergedAt ? 'MERGED' : 'OPEN');
      return (
        ({ OPEN: 0, MERGED: 1, CLOSED: 2 } as Record<string, number>)[s] ?? 3
      );
    };

    return [...filteredPRs].sort((a, b) => {
      switch (sortField) {
        case 'pullRequestNumber':
          return cmpNum(a.pullRequestNumber, b.pullRequestNumber);
        case 'pullRequestTitle':
          return cmpStr(a.pullRequestTitle, b.pullRequestTitle);
        case 'author':
          return cmpStr(a.author, b.author);
        case 'commitCount':
          return cmpNum(a.commitCount, b.commitCount);
        case 'lines':
          return cmpNum(
            (a.additions ?? 0) + (a.deletions ?? 0),
            (b.additions ?? 0) + (b.deletions ?? 0),
          );
        case 'status':
          return (stateRank(a) - stateRank(b)) * dir;
        case 'mergedAt':
          return cmpNum(
            a.mergedAt ? new Date(a.mergedAt).getTime() : 0,
            b.mergedAt ? new Date(b.mergedAt).getTime() : 0,
          );
        case 'score':
        default:
          return cmpNum(parseFloat(a.score || '0'), parseFloat(b.score || '0'));
      }
    });
  }, [filteredPRs, sortField, sortOrder]);

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
            }}
          >
            Pull Requests
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            <FilterButton
              label="Open"
              isActive={filter === 'open'}
              onClick={filterOpen}
              count={counts.open}
              color={PR_FILTER_COLORS.open}
              activeTextColor={PR_FILTER_ACTIVE_FG.open}
              inactiveAppearance="full-accent"
              icon={<RadioButtonUncheckedRoundedIcon sx={{ fontSize: 14 }} />}
            />
            <FilterButton
              label="Merged"
              isActive={filter === 'merged'}
              onClick={filterMerged}
              count={counts.merged}
              color={PR_FILTER_COLORS.merged}
              activeTextColor={PR_FILTER_ACTIVE_FG.merged}
              inactiveAppearance="full-accent"
              icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />}
            />
            <FilterButton
              label="Closed"
              isActive={filter === 'closed'}
              onClick={filterClosed}
              count={counts.closed}
              color={PR_FILTER_COLORS.closed}
              activeTextColor={PR_FILTER_ACTIVE_FG.closed}
              inactiveAppearance="full-accent"
              icon={<CancelOutlinedIcon sx={{ fontSize: 14 }} />}
            />
            <FilterButton
              label="All"
              isActive={filter === 'all'}
              onClick={filterAll}
              count={counts.all}
              color={PR_FILTER_COLORS.all}
              activeTextColor={PR_FILTER_ACTIVE_FG.all}
              inactiveAppearance="full-accent"
              icon={<CropSquareOutlinedIcon sx={{ fontSize: 14 }} />}
            />
          </Stack>
        </Box>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
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
          borderBottom: `1px solid ${theme.palette.border.light}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1.5,
              minWidth: 0,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {searchQuery.trim()
                ? `Pull Requests (${filteredPRs.length} of ${prsInActiveFilter.length})`
                : `Pull Requests (${prsInActiveFilter.length})`}
            </Typography>
          </Box>
          <TextField
            size="small"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search PRs"
            sx={{
              minWidth: { xs: '100%', sm: 200 },
              maxWidth: { sm: 320 },
              flex: { xs: '1 1 100%', sm: '0 0 auto' },
              '& .MuiOutlinedInput-root': {
                fontSize: '0.82rem',
                borderRadius: '8px',
                backgroundColor: 'surface.subtle',
                '& fieldset': {
                  borderColor: theme.palette.border.light,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <FilterButton
            label="Open"
            isActive={filter === 'open'}
            onClick={filterOpen}
            count={counts.open}
            color={PR_FILTER_COLORS.open}
            activeTextColor={PR_FILTER_ACTIVE_FG.open}
            inactiveAppearance="full-accent"
            icon={<RadioButtonUncheckedRoundedIcon sx={{ fontSize: 14 }} />}
          />
          <FilterButton
            label="Merged"
            isActive={filter === 'merged'}
            onClick={filterMerged}
            count={counts.merged}
            color={PR_FILTER_COLORS.merged}
            activeTextColor={PR_FILTER_ACTIVE_FG.merged}
            inactiveAppearance="full-accent"
            icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />}
          />
          <FilterButton
            label="Closed"
            isActive={filter === 'closed'}
            onClick={filterClosed}
            count={counts.closed}
            color={PR_FILTER_COLORS.closed}
            activeTextColor={PR_FILTER_ACTIVE_FG.closed}
            inactiveAppearance="full-accent"
            icon={<CancelOutlinedIcon sx={{ fontSize: 14 }} />}
          />
          <FilterButton
            label="All"
            isActive={filter === 'all'}
            onClick={filterAll}
            count={counts.all}
            color={PR_FILTER_COLORS.all}
            activeTextColor={PR_FILTER_ACTIVE_FG.all}
            inactiveAppearance="full-accent"
            icon={<CropSquareOutlinedIcon sx={{ fontSize: 14 }} />}
          />
        </Stack>
      </Box>

      {sortedPRs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            sx={{
              color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
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
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'pullRequestNumber'}
                    direction={
                      sortField === 'pullRequestNumber' ? sortOrder : 'desc'
                    }
                    onClick={() => handleSort('pullRequestNumber')}
                  >
                    PR #
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'pullRequestTitle'}
                    direction={
                      sortField === 'pullRequestTitle' ? sortOrder : 'asc'
                    }
                    onClick={() => handleSort('pullRequestTitle')}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'author'}
                    direction={sortField === 'author' ? sortOrder : 'asc'}
                    onClick={() => handleSort('author')}
                  >
                    Author
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'commitCount'}
                    direction={sortField === 'commitCount' ? sortOrder : 'desc'}
                    onClick={() => handleSort('commitCount')}
                  >
                    Commits
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'lines'}
                    direction={sortField === 'lines' ? sortOrder : 'desc'}
                    onClick={() => handleSort('lines')}
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
                <TableCell sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortOrder : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={sortField === 'mergedAt'}
                    direction={sortField === 'mergedAt' ? sortOrder : 'desc'}
                    onClick={() => handleSort('mergedAt')}
                  >
                    Merged
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPRs.map((pr) => {
                const statusLabel =
                  pr.prState?.toUpperCase() ||
                  (pr.mergedAt ? 'MERGED' : 'OPEN');
                const statusColor = getPrStatusChipColor(
                  statusLabel,
                  theme.palette.status.neutral,
                );
                return (
                  <LinkTableRow
                    key={`${pr.repository}-${pr.pullRequestNumber}`}
                    href={`/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`}
                    linkState={{ backLabel: `Back to ${repositoryFullName}` }}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'surface.light',
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
                          color: theme.palette.text.primary,
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
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {parseFloat(pr.score || '0').toFixed(4)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={bodyCellStyle}>
                      <Chip
                        variant="status"
                        label={statusLabel}
                        sx={{
                          color: statusColor,
                          borderColor: statusColor,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      {pr.mergedAt
                        ? new Date(pr.mergedAt).toLocaleDateString()
                        : '-'}
                    </TableCell>
                  </LinkTableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
};

export default RepositoryPRsTable;

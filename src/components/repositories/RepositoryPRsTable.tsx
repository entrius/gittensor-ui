import React, { memo, useCallback, useMemo, useState } from 'react';
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
  Button,
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
  Divider,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

import { useAllPrs, type CommitLog } from '../../api';
import { LinkTableRow } from '../common/linkBehavior';
import theme, {
  TEXT_OPACITY,
  scrollbarSx,
  headerCellStyle,
  bodyCellStyle,
} from '../../theme';
import { filterPrs, getPrStatusCounts, type PrStatusFilter } from '../../utils';
import FilterButton from '../FilterButton';
import type { Theme } from '@mui/material/styles';

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

const COLUMN_MENU_OPTIONS: { key: PrSortField; label: string }[] = [
  { key: 'pullRequestNumber', label: 'PR #' },
  { key: 'pullRequestTitle', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'commitCount', label: 'Commits' },
  { key: 'lines', label: '+/-' },
  { key: 'score', label: 'Score' },
  { key: 'status', label: 'Status' },
  { key: 'mergedAt', label: 'Merged' },
];

const DEFAULT_COLUMN_VISIBILITY = COLUMN_MENU_OPTIONS.reduce(
  (acc, { key }) => {
    acc[key] = true;
    return acc;
  },
  {} as Record<PrSortField, boolean>,
);

/** Avoid allocating rank maps inside every sort comparison. */
const PR_STATE_RANK: Record<string, number> = {
  OPEN: 0,
  MERGED: 1,
  CLOSED: 2,
};

const COLUMNS_MENU_PAPER_SX = {
  mt: 1,
  minWidth: 240,
  maxHeight: 400,
  borderRadius: 2,
  border: `1px solid ${theme.palette.border.light}`,
  backgroundImage: 'none',
} as const;

const PR_TABLE_ROW_SX = {
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: 'surface.light',
  },
  transition: 'background-color 0.2s',
} as const;

type RepositoryPrTableRowProps = {
  pr: CommitLog;
  columnVisibility: Record<PrSortField, boolean>;
  rowHref: string;
  linkState: { backLabel: string };
};

const RepositoryPrTableRow = memo(function RepositoryPrTableRow({
  pr,
  columnVisibility,
  rowHref,
  linkState,
}: RepositoryPrTableRowProps) {
  const statusLabel =
    pr.prState?.toUpperCase() || (pr.mergedAt ? 'MERGED' : 'OPEN');
  let statusColor = theme.palette.status.neutral;
  if (statusLabel === 'MERGED') statusColor = theme.palette.status.merged;
  else if (statusLabel === 'OPEN') statusColor = theme.palette.status.open;
  else if (statusLabel === 'CLOSED') statusColor = theme.palette.status.closed;

  return (
    <LinkTableRow href={rowHref} linkState={linkState} sx={PR_TABLE_ROW_SX}>
      {columnVisibility.pullRequestNumber && (
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
      )}
      {columnVisibility.pullRequestTitle && (
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
      )}
      {columnVisibility.author && (
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
      )}
      {columnVisibility.commitCount && (
        <TableCell align="right" sx={bodyCellStyle}>
          {pr.commitCount}
        </TableCell>
      )}
      {columnVisibility.lines && (
        <TableCell align="right" sx={bodyCellStyle}>
          <Box
            component="span"
            sx={{ color: theme.palette.diff.additions, mr: 1 }}
          >
            +{pr.additions}
          </Box>
          <Box component="span" sx={{ color: theme.palette.diff.deletions }}>
            -{pr.deletions}
          </Box>
        </TableCell>
      )}
      {columnVisibility.score && (
        <TableCell align="right" sx={bodyCellStyle}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {parseFloat(pr.score || '0').toFixed(4)}
          </Typography>
        </TableCell>
      )}
      {columnVisibility.status && (
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
      )}
      {columnVisibility.mergedAt && (
        <TableCell align="right" sx={bodyCellStyle}>
          {pr.mergedAt ? new Date(pr.mergedAt).toLocaleDateString() : '-'}
        </TableCell>
      )}
    </LinkTableRow>
  );
});

interface RepositoryPRsTableProps {
  repositoryFullName: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
}

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
  state = 'all',
}) => {
  const [filter, setFilter] = useState<PrStatusFilter>(state);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<PrSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [columnVisibility, setColumnVisibility] = useState<
    Record<PrSortField, boolean>
  >(() => ({ ...DEFAULT_COLUMN_VISIBILITY }));
  const [columnsMenuAnchor, setColumnsMenuAnchor] =
    useState<null | HTMLElement>(null);

  const visibleColumnCount = useMemo(() => {
    let n = 0;
    for (const { key } of COLUMN_MENU_OPTIONS) {
      if (columnVisibility[key]) n++;
    }
    return n;
  }, [columnVisibility]);

  const toggleColumn = useCallback((key: PrSortField) => {
    setColumnVisibility((prev) => {
      const wasVisible = prev[key];
      let visible = 0;
      for (const { key: k } of COLUMN_MENU_OPTIONS) {
        if (prev[k]) visible++;
      }
      if (wasVisible && visible <= 1) return prev;
      return { ...prev, [key]: !wasVisible };
    });
  }, []);

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

  // Fetch ALL PRs at once to enable client-side filtering and accurate counts
  // This avoids server roundtrips on filter change and provides instant UI feedback
  const { data: allMinerPRs, isLoading } = useAllPrs();

  const allPRs = useMemo(() => {
    if (!allMinerPRs?.length) return [];
    const repoLc = repositoryFullName.toLowerCase();
    return allMinerPRs.filter((pr) => pr.repository.toLowerCase() === repoLc);
  }, [allMinerPRs, repositoryFullName]);

  const prListBackLinkState = useMemo(
    () => ({ backLabel: `Back to ${repositoryFullName}` }),
    [repositoryFullName],
  );

  const searchFieldInputProps = useMemo(
    () => ({
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon
            sx={{
              color: (t: Theme) => alpha(t.palette.text.primary, 0.35),
              fontSize: '1.05rem',
            }}
          />
        </InputAdornment>
      ),
    }),
    [],
  );

  const counts = useMemo(() => {
    if (!allPRs) return { all: 0, open: 0, merged: 0, closed: 0 };
    return getPrStatusCounts(allPRs);
  }, [allPRs]);

  const statusFilteredOnly = useMemo(
    () => filterPrs(allPRs ?? [], { statusFilter: filter }),
    [allPRs, filter],
  );

  const filteredPRs = useMemo(
    () =>
      filterPrs(statusFilteredOnly, {
        searchQuery,
        includeNumber: true,
      }),
    [statusFilteredOnly, searchQuery],
  );

  const sortedPRs = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const cmpStr = (a = '', b = '') => a.localeCompare(b) * dir;
    const cmpNum = (a = 0, b = 0) => (a - b) * dir;
    const stateRank = (pr: (typeof filteredPRs)[number]) => {
      const s = pr.prState?.toUpperCase() || (pr.mergedAt ? 'MERGED' : 'OPEN');
      return PR_STATE_RANK[s] ?? 3;
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
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'text.primary',
            fontSize: '1.1rem',
            fontWeight: 500,
          }}
        >
          Pull Requests ({filteredPRs.length}
          {searchQuery.trim() ? ` of ${statusFilteredOnly.length}` : ''})
        </Typography>

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
      </Box>

      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${theme.palette.border.light}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: { xs: 'wrap', lg: 'nowrap' },
        }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Search pull requests by title, author, or PR number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
          InputProps={searchFieldInputProps}
          sx={{
            flex: '1 1 auto',
            minWidth: { xs: '100%', sm: 220 },
            maxWidth: { lg: 'none' },
            '& .MuiOutlinedInput-root': {
              fontSize: '0.8rem',
              color: 'text.primary',
              minHeight: 40,
              backgroundColor: 'surface.subtle',
              borderRadius: '999px',
              pl: 1,
              '& fieldset': { borderColor: 'border.light' },
              '&:hover fieldset': { borderColor: 'border.medium' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />

        <Stack
          direction="row"
          sx={{
            flex: { xs: '1 1 100%', lg: '0 0 auto' },
            justifyContent: { xs: 'stretch', lg: 'flex-end' },
            minWidth: 0,
          }}
        >
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setColumnsMenuAnchor(e.currentTarget)}
            startIcon={
              <ViewColumnIcon sx={{ fontSize: '1.1rem !important' }} />
            }
            endIcon={<ArrowDropDownIcon />}
            aria-haspopup="true"
            aria-expanded={Boolean(columnsMenuAnchor)}
            sx={{
              flex: { xs: 1, lg: 'none' },
              alignSelf: { xs: 'stretch', lg: 'center' },
              minHeight: 40,
              px: 2,
              borderRadius: '999px',
              textTransform: 'none',
              fontSize: '0.8rem',
              color: 'text.primary',
              borderColor: 'border.light',
              backgroundColor: 'surface.subtle',
              '&:hover': {
                borderColor: 'border.medium',
                backgroundColor: 'surface.light',
              },
            }}
          >
            Columns
            {visibleColumnCount < COLUMN_MENU_OPTIONS.length
              ? ` (${visibleColumnCount})`
              : ''}
          </Button>
        </Stack>
      </Box>

      <Menu
        anchorEl={columnsMenuAnchor}
        open={Boolean(columnsMenuAnchor)}
        onClose={() => setColumnsMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: COLUMNS_MENU_PAPER_SX }}
      >
        <MenuItem
          dense
          onClick={() => {
            setColumnVisibility({ ...DEFAULT_COLUMN_VISIBILITY });
            setColumnsMenuAnchor(null);
          }}
        >
          <ListItemText
            primary="Show all"
            primaryTypographyProps={{ fontSize: '0.875rem' }}
          />
        </MenuItem>
        <Divider />
        {COLUMN_MENU_OPTIONS.map(({ key, label }) => (
          <MenuItem key={key} dense onClick={() => toggleColumn(key)}>
            <Checkbox
              size="small"
              checked={columnVisibility[key]}
              tabIndex={-1}
              disableRipple
              sx={{ py: 0, mr: 1, pointerEvents: 'none' }}
            />
            <ListItemText
              primary={label}
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </MenuItem>
        ))}
      </Menu>

      {sortedPRs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            sx={{
              color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
              fontSize: '0.9rem',
            }}
          >
            {searchQuery.trim() && statusFilteredOnly.length > 0
              ? 'No pull requests match your search'
              : 'No pull requests found'}
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
                {columnVisibility.pullRequestNumber && (
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
                )}
                {columnVisibility.pullRequestTitle && (
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
                )}
                {columnVisibility.author && (
                  <TableCell sx={headerCellStyle}>
                    <TableSortLabel
                      active={sortField === 'author'}
                      direction={sortField === 'author' ? sortOrder : 'asc'}
                      onClick={() => handleSort('author')}
                    >
                      Author
                    </TableSortLabel>
                  </TableCell>
                )}
                {columnVisibility.commitCount && (
                  <TableCell align="right" sx={headerCellStyle}>
                    <TableSortLabel
                      active={sortField === 'commitCount'}
                      direction={
                        sortField === 'commitCount' ? sortOrder : 'desc'
                      }
                      onClick={() => handleSort('commitCount')}
                    >
                      Commits
                    </TableSortLabel>
                  </TableCell>
                )}
                {columnVisibility.lines && (
                  <TableCell align="right" sx={headerCellStyle}>
                    <TableSortLabel
                      active={sortField === 'lines'}
                      direction={sortField === 'lines' ? sortOrder : 'desc'}
                      onClick={() => handleSort('lines')}
                    >
                      +/-
                    </TableSortLabel>
                  </TableCell>
                )}
                {columnVisibility.score && (
                  <TableCell align="right" sx={headerCellStyle}>
                    <TableSortLabel
                      active={sortField === 'score'}
                      direction={sortField === 'score' ? sortOrder : 'desc'}
                      onClick={() => handleSort('score')}
                    >
                      Score
                    </TableSortLabel>
                  </TableCell>
                )}
                {columnVisibility.status && (
                  <TableCell sx={headerCellStyle}>
                    <TableSortLabel
                      active={sortField === 'status'}
                      direction={sortField === 'status' ? sortOrder : 'asc'}
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                )}
                {columnVisibility.mergedAt && (
                  <TableCell align="right" sx={headerCellStyle}>
                    <TableSortLabel
                      active={sortField === 'mergedAt'}
                      direction={sortField === 'mergedAt' ? sortOrder : 'desc'}
                      onClick={() => handleSort('mergedAt')}
                    >
                      Merged
                    </TableSortLabel>
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPRs.map((pr) => (
                <RepositoryPrTableRow
                  key={`${pr.repository}-${pr.pullRequestNumber}`}
                  pr={pr}
                  columnVisibility={columnVisibility}
                  rowHref={`/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`}
                  linkState={prListBackLinkState}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
};

export default RepositoryPRsTable;

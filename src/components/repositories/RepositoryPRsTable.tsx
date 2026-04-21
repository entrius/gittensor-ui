import React, { useCallback, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CropSquareOutlinedIcon from '@mui/icons-material/CropSquareOutlined';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useNavigate } from 'react-router-dom';
import { useAllPrs, type CommitLog } from '../../api';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import theme, {
  REPOSITORY_PR_FILTER_COLORS,
  TEXT_OPACITY,
  scrollbarSx,
} from '../../theme';
import {
  filterPrs,
  getPrStatusChipColor,
  getPrStatusCounts,
  type PrStatusFilter,
} from '../../utils';
import FilterButton from '../FilterButton';

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

const PR_STATE_RANK: Record<string, number> = {
  OPEN: 0,
  MERGED: 1,
  CLOSED: 2,
};

const PR_FILTER_ACTIVE_FG = {
  open: '#c4f2d4',
  merged: '#c9e2ff',
  closed: '#ffd8de',
  all: '#f0f6fc',
} as const;

interface RepositoryPRsTableProps {
  repositoryFullName: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
}

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
  state = 'all',
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PrStatusFilter>(state);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<PrSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [columnVisibility, setColumnVisibility] = useState<
    Record<PrSortField, boolean>
  >(() => ({ ...DEFAULT_COLUMN_VISIBILITY }));
  const [columnsMenuAnchor, setColumnsMenuAnchor] =
    useState<null | HTMLElement>(null);

  const visibleColumnCount = useMemo(
    () => COLUMN_MENU_OPTIONS.filter(({ key }) => columnVisibility[key]).length,
    [columnVisibility],
  );

  const toggleColumn = useCallback((key: PrSortField) => {
    setColumnVisibility((prev) => {
      const visibleCount = COLUMN_MENU_OPTIONS.filter(({ key: k }) => prev[k])
        .length;
      if (prev[key] && visibleCount <= 1) {
        return prev;
      }
      return { ...prev, [key]: !prev[key] };
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

  // Fetch ALL PRs at once for instant client-side filtering + accurate counts.
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

  const handleRowClick = useCallback(
    (pr: CommitLog) => {
      navigate(
        `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
        { state: { backLabel: `Back to ${repositoryFullName}` } },
      );
    },
    [navigate, repositoryFullName],
  );

  const titleText = searchQuery.trim()
    ? `Pull Requests (${filteredPRs.length} of ${statusFilteredOnly.length})`
    : `Pull Requests (${statusFilteredOnly.length})`;

  const columnsButton = (
    <Button
      size="small"
      variant="outlined"
      onClick={(e) => setColumnsMenuAnchor(e.currentTarget)}
      startIcon={<ViewColumnIcon sx={{ fontSize: '1.1rem !important' }} />}
      endIcon={<ArrowDropDownIcon />}
      aria-haspopup="true"
      aria-expanded={Boolean(columnsMenuAnchor)}
      sx={{
        flexShrink: 0,
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
  );

  const filterButtons = (
    <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FilterButton
        label="All"
        isActive={filter === 'all'}
        onClick={() => setFilter('all')}
        count={counts.all}
        color={REPOSITORY_PR_FILTER_COLORS.all}
        activeTextColor={PR_FILTER_ACTIVE_FG.all}
        inactiveAppearance="full-accent"
        icon={<CropSquareOutlinedIcon sx={{ fontSize: 14 }} />}
      />
      <FilterButton
        label="Open"
        isActive={filter === 'open'}
        onClick={() => setFilter('open')}
        count={counts.open}
        color={REPOSITORY_PR_FILTER_COLORS.open}
        activeTextColor={PR_FILTER_ACTIVE_FG.open}
        inactiveAppearance="full-accent"
        icon={<RadioButtonUncheckedRoundedIcon sx={{ fontSize: 14 }} />}
      />
      <FilterButton
        label="Merged"
        isActive={filter === 'merged'}
        onClick={() => setFilter('merged')}
        count={counts.merged}
        color={REPOSITORY_PR_FILTER_COLORS.merged}
        activeTextColor={PR_FILTER_ACTIVE_FG.merged}
        inactiveAppearance="full-accent"
        icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />}
      />
      <FilterButton
        label="Closed"
        isActive={filter === 'closed'}
        onClick={() => setFilter('closed')}
        count={counts.closed}
        color={REPOSITORY_PR_FILTER_COLORS.closed}
        activeTextColor={PR_FILTER_ACTIVE_FG.closed}
        inactiveAppearance="full-accent"
        icon={<CancelOutlinedIcon sx={{ fontSize: 14 }} />}
      />
    </Stack>
  );

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
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Pull Requests
          </Typography>
          {filterButtons}
        </Box>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  const columns: DataTableColumn<CommitLog, PrSortField>[] = [
    {
      key: 'pullRequestNumber',
      header: 'PR #',
      sortKey: 'pullRequestNumber',
      renderCell: (pr) => (
        // Native <a> to GitHub — `onRowClick` (no row-as-anchor) keeps this valid HTML.
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
      ),
    },
    {
      key: 'pullRequestTitle',
      header: 'Title',
      sortKey: 'pullRequestTitle',
      renderCell: (pr) => (
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
      ),
    },
    {
      key: 'author',
      header: 'Author',
      sortKey: 'author',
      renderCell: (pr) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            src={`https://avatars.githubusercontent.com/${pr.author}`}
            alt={pr.author}
            sx={{ width: 20, height: 20 }}
          />
          {pr.author}
        </Box>
      ),
    },
    {
      key: 'commitCount',
      header: 'Commits',
      align: 'right',
      sortKey: 'commitCount',
      renderCell: (pr) => pr.commitCount,
    },
    {
      key: 'lines',
      header: '+/-',
      align: 'right',
      sortKey: 'lines',
      renderCell: (pr) => (
        <>
          <Box
            component="span"
            sx={{ color: theme.palette.diff.additions, mr: 1 }}
          >
            +{pr.additions}
          </Box>
          <Box component="span" sx={{ color: theme.palette.diff.deletions }}>
            -{pr.deletions}
          </Box>
        </>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      sortKey: 'score',
      renderCell: (pr) => (
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
          {parseFloat(pr.score || '0').toFixed(4)}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      renderCell: (pr) => {
        const state =
          pr.prState?.toUpperCase() || (pr.mergedAt ? 'MERGED' : 'OPEN');
        const color = getPrStatusChipColor(state, theme.palette.status.neutral);
        return (
          <Chip
            variant="status"
            label={state}
            sx={{ color, borderColor: color }}
          />
        );
      },
    },
    {
      key: 'mergedAt',
      header: 'Merged',
      align: 'right',
      sortKey: 'mergedAt',
      renderCell: (pr) =>
        pr.mergedAt ? new Date(pr.mergedAt).toLocaleDateString() : '-',
    },
  ];

  const visibleColumns = useMemo(
    () => columns.filter((column) => columnVisibility[column.key as PrSortField]),
    [columns, columnVisibility],
  );

  const headerToolbar = (
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
        <Typography
          variant="h6"
          sx={{ color: 'text.primary', fontSize: '1.1rem', fontWeight: 600 }}
        >
          {titleText}
        </Typography>
        <TextField
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search PRs"
          autoComplete="off"
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          width: '100%',
        }}
      >
        {filterButtons}
        {columnsButton}
      </Box>
    </Box>
  );

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
        // Bounded scroll ancestor for the sticky header inside DataTable.
        '& .MuiTableContainer-root': {
          maxHeight: '500px',
          overflow: 'auto',
          ...scrollbarSx,
        },
      }}
      elevation={0}
    >
      <DataTable<CommitLog, PrSortField>
        columns={visibleColumns}
        rows={sortedPRs}
        getRowKey={(pr) => `${pr.repository}-${pr.pullRequestNumber}`}
        stickyHeader
        size="medium"
        header={headerToolbar}
        emptyState={
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
        }
        onRowClick={handleRowClick}
        sort={{
          field: sortField,
          order: sortOrder,
          onChange: handleSort,
        }}
      />
      <Menu
        anchorEl={columnsMenuAnchor}
        open={Boolean(columnsMenuAnchor)}
        onClose={() => setColumnsMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 240,
            maxHeight: 400,
            borderRadius: 2,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundImage: 'none',
          },
        }}
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
    </Card>
  );
};

export default RepositoryPRsTable;

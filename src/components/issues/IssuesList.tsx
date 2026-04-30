import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Collapse,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import TableChartIcon from '@mui/icons-material/TableChart';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ReactECharts from 'echarts-for-react';
import { format } from 'date-fns';
import { IssueBounty } from '../../api/models/Issues';
import { usePrices } from '../../hooks/usePrices';
import {
  formatTokenAmount,
  formatDate,
  formatAlphaToUsd,
} from '../../utils/format';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import { getIssueStatusMeta } from '../../utils/issueStatus';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import BountyProgress from './BountyProgress';
import FilterButton from '../FilterButton';
import { BountyCard } from './BountyCard';
import {
  type IssuesViewMode,
  ISSUES_VIEW_QUERY_PARAM,
  ISSUES_LIST_ROWS,
  ISSUES_CARD_ROWS,
  ISSUES_DEFAULT_CARD_ROWS,
  ISSUES_DEFAULT_LIST_ROWS,
  clampRowsForIssuesView,
  getIssuesViewModeFromQuery,
  readStoredIssuesViewMode,
  writeStoredIssuesViewMode,
} from './issuesViewMode';

type FilterType = 'all' | 'available' | 'pending' | 'history';
type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'id'
  | 'repository'
  | 'issue'
  | 'bounty'
  | 'status'
  | 'funding'
  | 'solver'
  | 'date';

interface IssuesListProps {
  issues: IssueBounty[];
  isLoading?: boolean;
  getIssueHref?: (id: number) => string;
  linkState?: Record<string, unknown>;
}

const truncateAddress = (address: string | null): string => {
  if (!address) return '-';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface ViewModeToggleProps {
  viewMode: IssuesViewMode;
  onChange: (mode: IssuesViewMode) => void;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
}) => {
  const options: {
    value: IssuesViewMode;
    label: string;
    Icon: typeof ViewListIcon;
  }[] = [
    { value: 'list', label: 'List view', Icon: ViewListIcon },
    { value: 'cards', label: 'Card view', Icon: ViewModuleIcon },
  ];

  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        overflow: 'hidden',
      })}
      role="group"
      aria-label="Toggle view mode"
    >
      {options.map(({ value, label, Icon }) => {
        const isActive = viewMode === value;
        return (
          <Tooltip key={value} title={label} placement="top" arrow>
            <IconButton
              onClick={() => onChange(value)}
              size="small"
              aria-label={label}
              aria-pressed={isActive}
              sx={(theme) => ({
                borderRadius: 0,
                padding: '6px 10px',
                color: isActive
                  ? theme.palette.text.primary
                  : theme.palette.text.tertiary,
                backgroundColor: isActive
                  ? theme.palette.surface.light
                  : 'transparent',
                '&:hover': {
                  backgroundColor: theme.palette.surface.light,
                  color: theme.palette.text.primary,
                },
              })}
            >
              <Icon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
};

const IssuesList: React.FC<IssuesListProps> = ({
  issues,
  isLoading = false,
  getIssueHref,
  linkState,
}) => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const filterType = useMemo<FilterType>(() => {
    const f = searchParams.get('filter');
    if (f === 'available' || f === 'pending' || f === 'history') return f;
    return 'all';
  }, [searchParams]);

  const [storedViewMode, setStoredViewMode] = useState<IssuesViewMode>(
    readStoredIssuesViewMode,
  );
  const viewMode = useMemo(
    () =>
      getIssuesViewModeFromQuery(
        searchParams.get(ISSUES_VIEW_QUERY_PARAM),
        storedViewMode,
      ),
    [searchParams, storedViewMode],
  );

  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [rowsPerPage, setRowsPerPage] = useState(
    viewMode === 'cards' ? ISSUES_DEFAULT_CARD_ROWS : ISSUES_DEFAULT_LIST_ROWS,
  );
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(false);

  const { taoPrice, alphaPrice } = usePrices();

  const syncParams = useCallback(
    (overrides: { filter?: FilterType; view?: IssuesViewMode }) => {
      const f = overrides.filter ?? filterType;
      const v = overrides.view ?? viewMode;
      const params: Record<string, string> = {};
      if (f !== 'all') params.filter = f;
      if (v === 'cards') params.view = 'cards';
      setSearchParams(params, { replace: true });
    },
    [filterType, viewMode, setSearchParams],
  );

  const handleFilterChange = useCallback(
    (f: FilterType) => syncParams({ filter: f }),
    [syncParams],
  );

  const handleViewModeChange = useCallback(
    (nextMode: IssuesViewMode) => {
      writeStoredIssuesViewMode(nextMode);
      setStoredViewMode(nextMode);
      const nextRows = clampRowsForIssuesView(rowsPerPage, nextMode);
      if (nextRows !== rowsPerPage) {
        setRowsPerPage(nextRows);
        setPage(0);
      }
      syncParams({ view: nextMode });
    },
    [rowsPerPage, syncParams],
  );

  const counts = useMemo(
    () => ({
      all: issues.length,
      available: issues.filter((i) => i.status === 'active').length,
      pending: issues.filter((i) => i.status === 'registered').length,
      history: issues.filter(
        (i) => i.status === 'completed' || i.status === 'cancelled',
      ).length,
    }),
    [issues],
  );

  const filteredByType = useMemo(() => {
    if (filterType === 'available')
      return issues.filter((i) => i.status === 'active');
    if (filterType === 'pending')
      return issues.filter((i) => i.status === 'registered');
    if (filterType === 'history')
      return issues.filter(
        (i) => i.status === 'completed' || i.status === 'cancelled',
      );
    return issues;
  }, [issues, filterType]);

  const filteredIssues = useMemo(() => {
    if (!searchQuery) return filteredByType;
    const q = searchQuery.toLowerCase();
    return filteredByType.filter(
      (i) =>
        i.repositoryFullName.toLowerCase().includes(q) ||
        i.title?.toLowerCase().includes(q) ||
        String(i.issueNumber).includes(q),
    );
  }, [filteredByType, searchQuery]);

  const parseAmount = (value: string | null | undefined): number => {
    const parsed = Number.parseFloat(value ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getLowerText = (value: string | null | undefined): string =>
    (value ?? '').toLowerCase();

  const getDefaultSortDirection = useCallback(
    (key: SortKey): SortDirection =>
      key === 'id' || key === 'bounty' || key === 'date' ? 'desc' : 'asc',
    [],
  );

  const visibleSortKeys = useMemo<SortKey[]>(() => {
    const common: SortKey[] = ['id', 'repository', 'issue'];
    if (filterType === 'pending')
      return [...common, 'bounty', 'funding', 'status'];
    if (filterType === 'history')
      return [...common, 'bounty', 'solver', 'status', 'date'];
    return [...common, 'bounty', 'status'];
  }, [filterType]);

  useEffect(() => {
    if (!visibleSortKeys.includes(sortKey)) {
      setSortKey('id');
      setSortDirection('desc');
    }
  }, [sortKey, visibleSortKeys]);

  useEffect(() => {
    setPage(0);
  }, [filterType, searchQuery]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (!visibleSortKeys.includes(key)) return;
      if (sortKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortKey(key);
      setSortDirection(getDefaultSortDirection(key));
    },
    [getDefaultSortDirection, sortKey, visibleSortKeys],
  );

  const sortedIssues = useMemo(() => {
    const directionFactor = sortDirection === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, {
      sensitivity: 'base',
      numeric: true,
    });

    const decorated = filteredIssues.map((issue) => {
      let value: number | string;
      switch (sortKey) {
        case 'id':
          value = issue.id;
          break;
        case 'repository':
          value = getLowerText(issue.repositoryFullName);
          break;
        case 'issue':
          value = `${getLowerText(issue.title)}::${String(issue.issueNumber).padStart(10, '0')}`;
          break;
        case 'bounty':
          value = parseAmount(issue.targetBounty);
          break;
        case 'status':
          value = getIssueStatusMeta(issue.status).text;
          break;
        case 'funding': {
          const target = parseAmount(issue.targetBounty);
          value = target > 0 ? parseAmount(issue.bountyAmount) / target : 0;
          break;
        }
        case 'solver':
          value = getLowerText(issue.solverHotkey);
          break;
        case 'date':
          value = new Date(issue.completedAt || issue.updatedAt || 0).getTime();
          break;
        default:
          value = issue.id;
      }
      return { issue, value };
    });

    decorated.sort((a, b) => {
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return (a.value - b.value) * directionFactor;
      }
      return (
        collator.compare(String(a.value), String(b.value)) * directionFactor
      );
    });

    return decorated.map((item) => item.issue);
  }, [filteredIssues, sortDirection, sortKey]);

  const paginatedIssues = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedIssues.slice(start, start + rowsPerPage);
  }, [sortedIssues, page, rowsPerPage]);

  const chartOption = useMemo(() => {
    const repoTotals = new Map<string, number>();
    filteredIssues.forEach((issue) => {
      const amount = parseAmount(issue.targetBounty);
      repoTotals.set(
        issue.repositoryFullName,
        (repoTotals.get(issue.repositoryFullName) || 0) + amount,
      );
    });
    const sorted = [...repoTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    const textColor = alpha(theme.palette.common.white, 0.85);
    const gridColor = theme.palette.border.subtle;

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Bounty Pool by Repository',
        subtext: `${filteredIssues.length} issues`,
        left: 'center',
        top: 20,
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: 'JetBrains Mono',
          fontSize: 16,
          fontWeight: 600,
        },
        subtextStyle: {
          color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: alpha(theme.palette.background.default, 0.95),
        borderColor: alpha(theme.palette.common.white, 0.15),
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: 'JetBrains Mono',
        },
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0];
          return `${p.name}: ${p.value.toFixed(4)} ل`;
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '15%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: sorted.map(([repo]) => repo.split('/')[1] || repo),
        axisLabel: {
          color: textColor,
          fontFamily: 'JetBrains Mono',
          rotate: 45,
          interval: 0,
        },
        axisLine: { lineStyle: { color: gridColor } },
      },
      yAxis: {
        type: 'value',
        name: 'Bounty (α)',
        nameTextStyle: { color: textColor, fontFamily: 'JetBrains Mono' },
        axisLabel: { color: textColor, fontFamily: 'JetBrains Mono' },
        splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      },
      series: [
        {
          data: sorted.map(([, v]) => v),
          type: 'bar',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: theme.palette.primary.main },
                { offset: 1, color: theme.palette.status.info },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [filteredIssues, theme]);

  const columns = useMemo<DataTableColumn<IssueBounty, SortKey>[]>(() => {
    const idColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'id',
      header: 'ID',
      width: '60px',
      sortKey: 'id',
      renderCell: (issue) => (
        <Typography
          sx={{
            fontSize: '0.8rem',
            color: alpha(theme.palette.common.white, 0.6),
          }}
        >
          #{issue.id}
        </Typography>
      ),
    };

    const repositoryColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'repository',
      header: 'Repository',
      width: '200px',
      sortKey: 'repository',
      cellSx: { overflow: 'hidden' },
      renderCell: (issue) => (
        <Tooltip title={issue.repositoryFullName} arrow>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <Avatar
              src={`https://avatars.githubusercontent.com/${issue.repositoryFullName.split('/')[0]}`}
              sx={{ width: 24, height: 24, borderRadius: 1, flexShrink: 0 }}
            />
            <Typography
              component="span"
              sx={{
                fontSize: '0.85rem',
                color: STATUS_COLORS.info,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {issue.repositoryFullName}
            </Typography>
          </Box>
        </Tooltip>
      ),
    };

    const issueColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'issue',
      header: 'Issue',
      sortKey: 'issue',
      renderCell: (issue) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {issue.title && (
            <Typography
              sx={{
                fontSize: '0.85rem',
                color: 'text.primary',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {issue.title}
            </Typography>
          )}
          <Link
            href={issue.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.75rem',
              color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
              textDecoration: 'none',
              '&:hover': {
                color: STATUS_COLORS.info,
                textDecoration: 'underline',
              },
            }}
          >
            #{issue.issueNumber}
            <OpenInNewIcon sx={{ fontSize: 12, opacity: 0.5 }} />
          </Link>
        </Box>
      ),
    };

    const bountyColumn = (
      label: string,
      width?: string,
      colorFn?: (issue: IssueBounty) => string,
    ): DataTableColumn<IssueBounty, SortKey> => ({
      key: 'bounty',
      header: label,
      width,
      align: 'right',
      sortKey: 'bounty',
      renderCell: (issue) => {
        const usdDisplay = formatAlphaToUsd(
          issue.targetBounty,
          taoPrice,
          alphaPrice,
        );
        const color =
          colorFn?.(issue) ??
          (filterType === 'pending'
            ? STATUS_COLORS.award
            : STATUS_COLORS.merged);
        return (
          <>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color }}>
              {formatTokenAmount(issue.targetBounty)} ل
            </Typography>
            {usdDisplay && (
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: alpha(theme.palette.common.white, 0.35),
                }}
              >
                {usdDisplay}
              </Typography>
            )}
          </>
        );
      },
    });

    const statusColumn = (
      width?: string,
    ): DataTableColumn<IssueBounty, SortKey> => ({
      key: 'status',
      header: 'Status',
      width,
      align: 'center',
      sortKey: 'status',
      renderCell: (issue) => {
        const statusBadge = getIssueStatusMeta(issue.status);
        return (
          <Chip
            label={statusBadge.text}
            size="small"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: statusBadge.bgColor,
              color: statusBadge.color,
              border: `1px solid ${statusBadge.color}40`,
            }}
          />
        );
      },
    });

    const fundingColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'funding',
      header: 'Funding',
      width: '140px',
      align: 'center',
      sortKey: 'funding',
      renderCell: (issue) => (
        <BountyProgress
          bountyAmount={issue.bountyAmount}
          targetBounty={issue.targetBounty}
        />
      ),
    };

    const solverColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'solver',
      header: 'Solver',
      width: '160px',
      align: 'center',
      sortKey: 'solver',
      renderCell: (issue) =>
        issue.solverHotkey ? (
          <Tooltip title={issue.solverHotkey} arrow>
            <Typography
              sx={{
                fontSize: '0.8rem',
                color: STATUS_COLORS.info,
                cursor: 'pointer',
              }}
            >
              {truncateAddress(issue.solverHotkey)}
            </Typography>
          </Tooltip>
        ) : (
          <Typography
            sx={{
              fontSize: '0.8rem',
              color: alpha(theme.palette.common.white, TEXT_OPACITY.faint),
            }}
          >
            -
          </Typography>
        ),
    };

    const dateColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'date',
      header: 'Date',
      width: '132px',
      align: 'center',
      sortKey: 'date',
      renderCell: (issue) => {
        const raw = issue.completedAt || issue.updatedAt;
        const label = formatDate(raw);
        const tooltipTitle = (() => {
          if (!raw) return label;
          const d = new Date(raw);
          if (Number.isNaN(d.getTime())) return label;
          return format(d, 'PPpp');
        })();
        return (
          <Tooltip title={tooltipTitle} arrow>
            <Typography
              component="span"
              sx={{
                fontSize: '0.8rem',
                color: alpha(theme.palette.common.white, 0.6),
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Typography>
          </Tooltip>
        );
      },
    };

    if (filterType === 'pending') {
      return [
        idColumn,
        repositoryColumn,
        issueColumn,
        bountyColumn('Target Bounty', '140px'),
        fundingColumn,
        statusColumn('110px'),
      ];
    }
    if (filterType === 'history') {
      return [
        idColumn,
        repositoryColumn,
        issueColumn,
        bountyColumn('Payout', '120px', (issue) =>
          issue.status === 'completed'
            ? STATUS_COLORS.merged
            : alpha(theme.palette.common.white, TEXT_OPACITY.muted),
        ),
        solverColumn,
        statusColumn('110px'),
        dateColumn,
      ];
    }
    return [
      idColumn,
      repositoryColumn,
      issueColumn,
      bountyColumn('Bounty', '120px'),
      statusColumn('110px'),
    ];
  }, [filterType, theme, taoPrice, alphaPrice]);

  const validRows = viewMode === 'cards' ? ISSUES_CARD_ROWS : ISSUES_LIST_ROWS;

  const pagination = (
    <TablePagination
      rowsPerPageOptions={[]}
      component="div"
      count={sortedIssues.length}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={(_event, newPage) => setPage(newPage)}
      onRowsPerPageChange={() => {}}
      showFirstButton
      showLastButton
    />
  );

  const cardSx = {
    backgroundColor: 'background.default',
    border: `1px solid ${theme.palette.border.light}`,
    borderRadius: 3,
    overflow: 'hidden',
  };

  if (isLoading) {
    return (
      <Card sx={cardSx} elevation={0}>
        <Box sx={{ p: 2 }}>
          {viewMode === 'cards' ? (
            <Grid container spacing={2}>
              {Array.from({ length: ISSUES_DEFAULT_CARD_ROWS }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Skeleton
                    variant="rounded"
                    height={220}
                    sx={{
                      bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={48}
                  sx={{ mb: 1, borderRadius: 1 }}
                />
              ))}
            </>
          )}
        </Box>
      </Card>
    );
  }

  const toolbar = (
    <>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.border.light}`,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {/* Left: filter buttons + chart toggle */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <FilterButton
            label="All"
            isActive={filterType === 'all'}
            onClick={() => handleFilterChange('all')}
            count={counts.all}
            color={theme.palette.status.neutral}
          />
          <FilterButton
            label="Available"
            isActive={filterType === 'available'}
            onClick={() => handleFilterChange('available')}
            count={counts.available}
            color={theme.palette.status.merged}
          />
          <FilterButton
            label="Pending"
            isActive={filterType === 'pending'}
            onClick={() => handleFilterChange('pending')}
            count={counts.pending}
            color={theme.palette.status.warning}
          />
          <FilterButton
            label="History"
            isActive={filterType === 'history'}
            onClick={() => handleFilterChange('history')}
            count={counts.history}
            color={theme.palette.status.neutral}
          />

          <Tooltip title={showChart ? 'Hide Chart' : 'Show Chart'}>
            <IconButton
              onClick={() => setShowChart(!showChart)}
              size="small"
              sx={{
                color: showChart
                  ? theme.palette.text.primary
                  : alpha(theme.palette.common.white, TEXT_OPACITY.muted),
                border: `1px solid ${theme.palette.border.light}`,
                borderRadius: 2,
                padding: '6px',
                '&:hover': {
                  backgroundColor: theme.palette.surface.subtle,
                  borderColor: theme.palette.border.medium,
                },
              }}
            >
              {showChart ? (
                <TableChartIcon fontSize="small" />
              ) : (
                <BarChartIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Rows selector */}
        <FormControl size="small">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: alpha(
                  theme.palette.common.white,
                  TEXT_OPACITY.secondary,
                ),
                fontSize: '0.8rem',
              }}
            >
              Rows:
            </Typography>
            <Select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(e.target.value as number);
                setPage(0);
              }}
              sx={{
                color: theme.palette.text.primary,
                backgroundColor: alpha(theme.palette.common.black, 0.4),
                fontSize: '0.8rem',
                height: '36px',
                borderRadius: 2,
                minWidth: '80px',
                '& fieldset': { borderColor: theme.palette.border.light },
                '&:hover fieldset': {
                  borderColor: theme.palette.border.medium,
                },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                '& .MuiSelect-select': { py: 0.75 },
              }}
            >
              {validRows.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </FormControl>

        {/* Search */}
        <TextField
          placeholder="Search..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{
                    color: alpha(
                      theme.palette.common.white,
                      TEXT_OPACITY.muted,
                    ),
                    fontSize: '1rem',
                  }}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <ClearSearchAdornment
                visible={Boolean(searchQuery)}
                onClear={() => setSearchQuery('')}
              />
            ),
          }}
          sx={{
            width: '200px',
            '& .MuiOutlinedInput-root': {
              color: theme.palette.text.primary,
              backgroundColor: alpha(theme.palette.common.black, 0.4),
              fontSize: '0.8rem',
              height: '36px',
              borderRadius: 2,
              '& fieldset': { borderColor: theme.palette.border.light },
              '&:hover fieldset': { borderColor: theme.palette.border.medium },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />

        {/* View toggle — pushed to far right */}
        <Box sx={{ ml: 'auto' }}>
          <ViewModeToggle viewMode={viewMode} onChange={handleViewModeChange} />
        </Box>
      </Box>

      <Collapse in={showChart}>
        <Box
          sx={{
            height: 500,
            p: 2,
            borderBottom: `1px solid ${theme.palette.border.light}`,
            backgroundColor: alpha(theme.palette.common.black, 0.2),
          }}
        >
          {showChart && filteredIssues.length > 0 && (
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
            />
          )}
        </Box>
      </Collapse>
    </>
  );

  const emptyState = (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography
        sx={{
          color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
        }}
      >
        {searchQuery ? 'No issues match your search' : 'No issues found'}
      </Typography>
    </Box>
  );

  return (
    <Card sx={cardSx} elevation={0}>
      {toolbar}

      {viewMode === 'cards' ? (
        <>
          {paginatedIssues.length > 0 ? (
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {paginatedIssues.map((issue) => (
                  <Grid item xs={12} sm={6} md={4} key={issue.id}>
                    <BountyCard
                      issue={issue}
                      href={getIssueHref ? getIssueHref(issue.id) : undefined}
                      linkState={linkState}
                      taoPrice={taoPrice}
                      alphaPrice={alphaPrice}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            emptyState
          )}
          {pagination}
        </>
      ) : (
        <DataTable<IssueBounty, SortKey>
          columns={columns}
          rows={paginatedIssues}
          getRowKey={(issue) => issue.id}
          getRowHref={
            getIssueHref ? (issue) => getIssueHref(issue.id) : undefined
          }
          linkState={linkState}
          minWidth={
            filterType === 'history'
              ? '1000px'
              : filterType === 'pending'
                ? '900px'
                : '750px'
          }
          emptyState={emptyState}
          pagination={pagination}
          sort={{
            field: sortKey,
            order: sortDirection,
            onChange: handleSort,
          }}
        />
      )}
    </Card>
  );
};

export default IssuesList;

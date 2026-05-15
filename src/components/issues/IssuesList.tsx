import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DebouncedSearchInput,
  useDebouncedSearchDraft,
} from '../common/DebouncedSearchInput';
import { useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Collapse,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Popover,
  Portal,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import BarChartIcon from '@mui/icons-material/BarChart';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import TableChartIcon from '@mui/icons-material/TableChart';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ReactECharts from 'echarts-for-react';
import { format } from 'date-fns';
import { IssueBounty } from '../../api/models/Issues';
import { usePrices } from '../../hooks/usePrices';
import {
  formatAlphaToUsd,
  formatDate,
  formatTokenAmount,
} from '../../utils/format';
import { getIssueStatusMeta } from '../../utils/issueStatus';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { isOutsideScoringWindow } from '../../utils/ExplorerUtils';
import { paginateItems } from '../../utils/prTable';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import { WatchlistButton } from '../common/WatchlistButton';
import TablePagination from '../common/TablePagination';
import BountyProgress from './BountyProgress';
import { BountyCard } from './BountyCard';
import {
  type IssuesViewMode,
  ISSUES_VIEW_QUERY_PARAM,
  ISSUES_CARD_ROWS,
  ISSUES_LIST_ROWS,
  ISSUES_DEFAULT_CARD_ROWS,
  ISSUES_DEFAULT_LIST_ROWS,
  clampRowsForIssuesView,
  getIssuesViewModeFromQuery,
  readStoredIssuesViewMode,
  writeStoredIssuesViewMode,
} from './issuesViewMode';

export type FilterType = 'all' | 'available' | 'pending' | 'history';

export const FILTER_ORDER: readonly FilterType[] = [
  'all',
  'available',
  'pending',
  'history',
] as const;

export const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All',
  available: 'Available',
  pending: 'Pending',
  history: 'History',
};
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

const SORT_LABELS: Record<SortKey, string> = {
  id: 'ID',
  repository: 'Repository',
  issue: 'Issue',
  bounty: 'Bounty',
  status: 'Status',
  funding: 'Funding',
  solver: 'Solver',
  date: 'Date',
};

const parseBountyAmount = (value: string | null | undefined): number => {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const IssuesListSearchTextField: React.FC<{ fullWidth?: boolean }> = ({
  fullWidth,
}) => {
  const theme = useTheme();
  const { draftValue, setDraftValue } = useDebouncedSearchDraft();
  const inputFieldSx = {
    color: theme.palette.text.primary,
    backgroundColor: alpha(theme.palette.common.black, 0.4),
    fontSize: '0.8rem',
    height: '36px',
    borderRadius: 2,
    '& fieldset': { borderColor: theme.palette.border.light },
    '&:hover fieldset': { borderColor: theme.palette.border.medium },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  } as const;

  return (
    <TextField
      placeholder="Search..."
      size="small"
      value={draftValue}
      onChange={(e) => setDraftValue(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon
              sx={{
                color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
                fontSize: '1rem',
              }}
            />
          </InputAdornment>
        ),
        endAdornment: (
          <ClearSearchAdornment
            visible={Boolean(draftValue)}
            onClear={() => setDraftValue('')}
          />
        ),
      }}
      sx={{
        width: fullWidth ? '100%' : '200px',
        '& .MuiOutlinedInput-root': inputFieldSx,
      }}
    />
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(() =>
    viewMode === 'cards' ? ISSUES_DEFAULT_CARD_ROWS : ISSUES_DEFAULT_LIST_ROWS,
  );

  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.getElementById('tabs-options-portal'));
  }, []);

  const [optionsAnchorEl, setOptionsAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const optionsOpen = Boolean(optionsAnchorEl);

  const { taoPrice, alphaPrice } = usePrices();

  const syncParams = useCallback(
    (overrides: { filter?: FilterType; view?: IssuesViewMode }) => {
      const f = overrides.filter ?? filterType;
      const v = overrides.view ?? viewMode;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (f !== 'all') next.set('filter', f);
          else next.delete('filter');
          if (v === 'cards') next.set(ISSUES_VIEW_QUERY_PARAM, 'cards');
          else next.delete(ISSUES_VIEW_QUERY_PARAM);
          return next;
        },
        { replace: true },
      );
    },
    [filterType, viewMode, setSearchParams],
  );

  const handleViewModeChange = useCallback(
    (nextMode: IssuesViewMode) => {
      writeStoredIssuesViewMode(nextMode);
      setStoredViewMode(nextMode);
      syncParams({ view: nextMode });
    },
    [syncParams],
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

  const getSortValue = useCallback(
    (issue: IssueBounty, key: SortKey): number | string => {
      switch (key) {
        case 'id':
          return issue.id;
        case 'funding': {
          const target = parseBountyAmount(issue.targetBounty);
          return target > 0
            ? parseBountyAmount(issue.bountyAmount) / target
            : 0;
        }
        case 'solver':
          return (issue.solverHotkey ?? '').toLowerCase();
        case 'date':
          return new Date(issue.completedAt || issue.updatedAt || 0).getTime();
        case 'repository':
          return (issue.repositoryFullName || '').toLowerCase();
        case 'issue':
          return `${(issue.title || '').toLowerCase()}::${String(issue.issueNumber).padStart(10, '0')}`;
        case 'bounty':
          return parseBountyAmount(issue.targetBounty);
        case 'status':
          return getIssueStatusMeta(issue.status).text;
      }
    },
    [],
  );

  const sortedIssues = useMemo(() => {
    const directionFactor = sortDirection === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, {
      sensitivity: 'base',
      numeric: true,
    });
    const decorated = filteredIssues.map((row) => ({
      row,
      value: getSortValue(row, sortKey),
    }));
    decorated.sort((a, b) => {
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return (a.value - b.value) * directionFactor;
      }
      return (
        collator.compare(String(a.value), String(b.value)) * directionFactor
      );
    });
    return decorated.map((d) => d.row);
  }, [filteredIssues, getSortValue, sortKey, sortDirection]);

  const rowOptions = viewMode === 'cards' ? ISSUES_CARD_ROWS : ISSUES_LIST_ROWS;
  const pageSize = clampRowsForIssuesView(rowsPerPage, viewMode);
  const totalPages = Math.max(1, Math.ceil(sortedIssues.length / pageSize));

  // Reset to page 0 when filter/search/sort/view/rowsPerPage changes.
  // set-state-during-render (not useEffect) so React discards the stale render
  // before commit, avoiding a one-frame flash of the clamped old page.
  const paginationResetKey = `${filterType}|${searchQuery}|${sortKey}|${sortDirection}|${viewMode}|${pageSize}`;
  const [prevPaginationResetKey, setPrevPaginationResetKey] =
    useState(paginationResetKey);
  if (paginationResetKey !== prevPaginationResetKey) {
    setPrevPaginationResetKey(paginationResetKey);
    setPage(0);
  }

  const safePage = Math.min(page, totalPages - 1);

  const pagedIssues = useMemo(
    () => paginateItems(sortedIssues, safePage, pageSize),
    [sortedIssues, safePage, pageSize],
  );

  const chartOption = useMemo(() => {
    const repoTotals = new Map<string, number>();
    filteredIssues.forEach((issue) => {
      const amount = parseBountyAmount(issue.targetBounty);
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
        name: 'Bounty (ل)',
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
              src={getRepositoryOwnerAvatarSrc(
                issue.repositoryFullName.split('/')[0],
              )}
              alt={issue.repositoryFullName}
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

    const titleColumn: DataTableColumn<IssueBounty, SortKey> = {
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

    const buildBountyColumn = (opts: {
      label: string;
      width?: string;
      color?: string | ((issue: IssueBounty) => string);
    }): DataTableColumn<IssueBounty, SortKey> => ({
      key: 'bounty',
      header: opts.label,
      width: opts.width,
      align: 'right',
      sortKey: 'bounty',
      renderCell: (issue) => {
        const usdDisplay = formatAlphaToUsd(
          issue.targetBounty,
          taoPrice,
          alphaPrice,
        );
        const color =
          (typeof opts.color === 'function' ? opts.color(issue) : opts.color) ??
          STATUS_COLORS.merged;
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

    const statusColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'status',
      header: 'Status',
      width: '110px',
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
    };

    const watchColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'watch',
      header: '★',
      width: '52px',
      align: 'center',
      cellSx: { p: 0 },
      renderCell: (issue) => (
        <WatchlistButton category="bounties" itemKey={String(issue.id)} />
      ),
    };

    const common = [idColumn, repositoryColumn, titleColumn];

    if (filterType === 'pending') {
      return [
        ...common,
        buildBountyColumn({
          label: 'Target Bounty',
          width: '140px',
          color: STATUS_COLORS.award,
        }),
        fundingColumn,
        statusColumn,
        watchColumn,
      ];
    }
    if (filterType === 'history') {
      return [
        ...common,
        buildBountyColumn({
          label: 'Payout',
          width: '120px',
          color: (issue) =>
            issue.status === 'completed'
              ? STATUS_COLORS.merged
              : alpha(theme.palette.common.white, TEXT_OPACITY.muted),
        }),
        solverColumn,
        statusColumn,
        dateColumn,
        watchColumn,
      ];
    }
    return [
      ...common,
      buildBountyColumn({
        label: 'Bounty',
        width: '120px',
      }),
      statusColumn,
      watchColumn,
    ];
  }, [filterType, theme, taoPrice, alphaPrice]);

  const cardSx =
    viewMode === 'cards'
      ? ({
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: 0,
          overflow: 'visible',
          boxShadow: 'none',
        } as const)
      : ({
          backgroundColor: 'background.default',
          border: `1px solid ${theme.palette.border.light}`,
          borderRadius: 3,
          overflow: 'hidden',
        } as const);

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

  const sidebarLabelSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.65rem',
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    mb: 1,
    display: 'block',
  } as const;

  const inputFieldSx = {
    color: theme.palette.text.primary,
    backgroundColor: alpha(theme.palette.common.black, 0.4),
    fontSize: '0.8rem',
    height: '36px',
    borderRadius: 2,
    '& fieldset': { borderColor: theme.palette.border.light },
    '&:hover fieldset': { borderColor: theme.palette.border.medium },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  } as const;

  const chartToggleButton = (
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
  );

  const viewToggle = (
    <ViewModeToggle viewMode={viewMode} onChange={handleViewModeChange} />
  );

  const rowsSection = (
    <Box>
      <Typography sx={sidebarLabelSx}>Rows</Typography>
      <Select
        value={pageSize}
        onChange={(e) => setRowsPerPage(Number(e.target.value))}
        size="small"
        sx={{
          ...inputFieldSx,
          minWidth: 76,
          '& .MuiSelect-select': { py: 0.75 },
        }}
      >
        {rowOptions.map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  const sortSection = (
    <Box>
      <Typography sx={sidebarLabelSx}>Sort</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Select
          value={sortKey}
          onChange={(e) => {
            const key = e.target.value as SortKey;
            setSortKey(key);
            setSortDirection(getDefaultSortDirection(key));
          }}
          size="small"
          sx={{ ...inputFieldSx, flex: 1, '& .MuiSelect-select': { py: 0.75 } }}
        >
          {visibleSortKeys.map((key) => (
            <MenuItem key={key} value={key}>
              {SORT_LABELS[key]}
            </MenuItem>
          ))}
        </Select>
        <Tooltip
          title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          arrow
        >
          <IconButton
            size="small"
            onClick={() =>
              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            }
            sx={{
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.border.light}`,
              borderRadius: 2,
              padding: '6px',
              '&:hover': {
                backgroundColor: theme.palette.surface.subtle,
                borderColor: theme.palette.border.medium,
              },
            }}
          >
            <ArrowUpwardIcon
              fontSize="small"
              sx={{
                transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const optionsPortalFilters = (
    <>
      {sortSection}
      <Box>
        <Typography sx={sidebarLabelSx}>View</Typography>
        {viewToggle}
      </Box>
      {rowsSection}
      <Box>
        <Typography sx={sidebarLabelSx}>Search</Typography>
        <IssuesListSearchTextField fullWidth />
      </Box>
      <Box>
        <Typography sx={sidebarLabelSx}>Chart</Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          {chartToggleButton}
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.78rem',
              color: alpha(theme.palette.common.white, TEXT_OPACITY.secondary),
            }}
          >
            {showChart ? 'Hide chart' : 'Show chart'}
          </Typography>
        </Stack>
      </Box>
    </>
  );

  const usePortal = !!portalTarget && isLargeScreen;

  const hasActiveOptions = searchQuery.trim() !== '' || showChart;

  /* Below xl: a single compact "Options" icon-button that opens a popover
     containing the same Status / View / Search / Chart sections that live
     in the sidebar Filters panel on xl+. Mirrors WatchlistOptionsButton. */
  const optionsButton = (
    <Tooltip title="Options" arrow>
      <Box
        component="button"
        type="button"
        onClick={(e) =>
          setOptionsAnchorEl((prev) => (prev ? null : e.currentTarget))
        }
        sx={(t) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.5,
          minHeight: 32,
          borderRadius: 2,
          border: `1px solid ${t.palette.border.light}`,
          backgroundColor: optionsOpen
            ? alpha(t.palette.text.primary, 0.06)
            : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.15s',
          '&:hover': {
            backgroundColor: alpha(t.palette.text.primary, 0.04),
            borderColor: t.palette.border.medium,
          },
        })}
      >
        <TuneOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
        <Typography
          component="span"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'text.secondary',
          }}
        >
          Options
        </Typography>
        {hasActiveOptions && (
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'status.info',
            }}
          />
        )}
      </Box>
    </Tooltip>
  );

  const optionsPopover = (
    <Popover
      open={optionsOpen}
      anchorEl={optionsAnchorEl}
      onClose={() => setOptionsAnchorEl(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: (t) => ({
            mt: 1,
            p: 2.5,
            minWidth: 280,
            borderRadius: 3,
            border: `1px solid ${t.palette.border.light}`,
            backgroundColor: t.palette.background.default,
            backgroundImage: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }),
        },
      }}
    >
      {optionsPortalFilters}
    </Popover>
  );

  /* Inline toolbar at the top of the table.
     - Above xl (usePortal=true): the Filters panel in the right sidebar holds
       Sort / View / Rows / Search / Chart via Portal, so this is empty.
     - Below xl: a single "Options" button that opens a popover with
       Sort / View / Rows / Search / Chart sections. */
  const inlineToolbar = (
    <Box
      sx={{
        px: viewMode === 'cards' ? 0 : 2,
        py: 1.5,
        borderBottom:
          viewMode === 'cards'
            ? 'none'
            : `1px solid ${theme.palette.border.light}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {!usePortal && <Box sx={{ ml: 'auto' }}>{optionsButton}</Box>}
    </Box>
  );

  const chartCollapse = (
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

  const paginationControl = (
    <TablePagination
      page={safePage}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  );

  return (
    <>
      <DebouncedSearchInput onDebouncedChange={setSearchQuery}>
        <>
          {usePortal && portalTarget && (
            <Portal container={portalTarget}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {optionsPortalFilters}
              </Box>
            </Portal>
          )}
          {optionsPopover}
        </>
      </DebouncedSearchInput>
      <Card sx={cardSx} elevation={0}>
        {!usePortal ? inlineToolbar : null}
        {chartCollapse}

        {viewMode === 'cards' ? (
          pagedIssues.length > 0 ? (
            <>
              <Grid container spacing={2}>
                {pagedIssues.map((issue) => (
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
              {paginationControl}
            </>
          ) : (
            emptyState
          )
        ) : (
          <DataTable<IssueBounty, SortKey>
            columns={columns}
            rows={pagedIssues}
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
            getRowSx={(issue) =>
              issue.completedAt && isOutsideScoringWindow(issue.completedAt)
                ? { opacity: 0.4, filter: 'grayscale(0.5)' }
                : {}
            }
            sort={{
              field: sortKey,
              order: sortDirection,
              onChange: handleSort,
            }}
            pagination={paginationControl}
          />
        )}
      </Card>
    </>
  );
};

export default IssuesList;

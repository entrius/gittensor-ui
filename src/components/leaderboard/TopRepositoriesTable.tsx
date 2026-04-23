import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  Box,
  Card,
  Grid,
  Skeleton,
  Typography,
  Avatar,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Collapse,
  TablePagination,
  TableSortLabel,
  Select,
  MenuItem,
  FormControl,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FilterButton from '../FilterButton';
import { RepositoryCard } from './RepositoryCard';
import {
  REPOSITORIES_CARD_ROWS,
  REPOSITORIES_DEFAULT_CARD_ROWS,
  REPOSITORIES_DEFAULT_LIST_ROWS,
  REPOSITORIES_LIST_ROWS,
  REPOSITORIES_VALID_ROWS,
  REPOSITORIES_VIEW_QUERY_PARAM,
  clampRowsForRepositoriesView,
  getRepositoriesViewModeFromQuery,
  readStoredRepositoriesViewMode,
  writeStoredRepositoriesViewMode,
  type RepositoriesViewMode,
} from './repositoriesViewMode';
import ReactECharts from 'echarts-for-react';
import type { TooltipComponentFormatterCallbackParams } from 'echarts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { truncateText } from '../../utils';
import { RankIcon } from './RankIcon';
import { getRepositoryOwnerAvatarBackground, type RepoStats } from './types';
import {
  CHART_COLORS,
  STATUS_COLORS,
  TEXT_OPACITY,
  UI_COLORS,
  scrollbarSx,
} from '../../theme';

type SortColumn =
  | 'rank'
  | 'repository'
  | 'weight'
  | 'totalScore'
  | 'totalPRs'
  | 'contributors';
type SortDirection = 'asc' | 'desc';
type ViewMode = RepositoriesViewMode;

const CARD_SORT_OPTIONS: Array<{ value: SortColumn; label: string }> = [
  { value: 'weight', label: 'Weight' },
  { value: 'totalScore', label: 'Total Score' },
  { value: 'totalPRs', label: 'PRs' },
  { value: 'contributors', label: 'Contributors' },
  { value: 'repository', label: 'Repository' },
];

interface TopRepositoriesTableProps {
  repositories: RepoStats[];
  isLoading?: boolean;
  getRepositoryHref: (repositoryFullName: string) => string;
  linkState?: Record<string, unknown>;
}

const VALID_SORT_COLUMNS: SortColumn[] = [
  'rank',
  'repository',
  'weight',
  'totalScore',
  'totalPRs',
  'contributors',
];

const TopRepositoriesTable: React.FC<TopRepositoriesTableProps> = ({
  repositories,
  isLoading,
  getRepositoryHref,
  linkState,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL params, falling back to defaults
  const urlRows = parseInt(searchParams.get('rows') || '0', 10);
  const urlPage = parseInt(searchParams.get('page') || '0', 10);
  const urlSort = searchParams.get('sort') as SortColumn;
  const urlDir = searchParams.get('dir') as SortDirection;
  const urlSearch = searchParams.get('search') || '';
  const urlStatusFilter = searchParams.get('status') as
    | 'all'
    | 'active'
    | 'inactive'
    | null;

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >(
    urlStatusFilter === 'active' || urlStatusFilter === 'inactive'
      ? urlStatusFilter
      : 'all',
  );
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(urlPage >= 0 ? urlPage : 0);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const initialView = getRepositoriesViewModeFromQuery(
      searchParams.get(REPOSITORIES_VIEW_QUERY_PARAM),
      readStoredRepositoriesViewMode(),
    );
    return REPOSITORIES_VALID_ROWS.includes(urlRows)
      ? clampRowsForRepositoriesView(urlRows, initialView)
      : initialView === 'cards'
        ? REPOSITORIES_DEFAULT_CARD_ROWS
        : REPOSITORIES_DEFAULT_LIST_ROWS;
  });
  const [sortColumn, setSortColumn] = useState<SortColumn>(
    urlSort && VALID_SORT_COLUMNS.includes(urlSort) ? urlSort : 'weight',
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    urlDir === 'asc' || urlDir === 'desc' ? urlDir : 'desc',
  );
  const [useLogScale, setUseLogScale] = useState(true);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [storedViewMode, setStoredViewMode] = useState<ViewMode>(
    readStoredRepositoriesViewMode,
  );
  const viewMode = useMemo(
    () =>
      getRepositoriesViewModeFromQuery(
        searchParams.get(REPOSITORIES_VIEW_QUERY_PARAM),
        storedViewMode,
      ),
    [searchParams, storedViewMode],
  );
  const isInitialMount = useRef(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const trimmedSearch = searchQuery.trim();
  const isMobileSearchVisible =
    isMobile && (isMobileSearchOpen || !!trimmedSearch);
  const isDirectRepoInput = /^[^/\s]+\/[^/\s]+$/.test(trimmedSearch);

  // Sync filter state to URL params (replace, don't push)
  const syncToUrl = useCallback(
    (overrides?: Record<string, string | undefined>) => {
      const params: Record<string, string> = {};
      const rows = overrides?.rows ?? String(rowsPerPage);
      const pg = overrides?.page ?? String(page);
      const sort = overrides?.sort ?? sortColumn;
      const dir = overrides?.dir ?? sortDirection;
      const search = overrides?.search ?? searchQuery;
      const active = overrides?.status ?? statusFilter;
      const view = overrides?.view ?? viewMode;

      if (rows !== '10') params.rows = rows;
      if (pg !== '0') params.page = pg;
      if (sort !== 'weight') params.sort = sort;
      if (dir !== 'desc') params.dir = dir;
      if (search) params.search = search;
      if (active !== 'all') params.status = active;
      if (view === 'cards') params.view = view;

      setSearchParams(params, { replace: true });
    },
    [
      rowsPerPage,
      page,
      sortColumn,
      sortDirection,
      searchQuery,
      statusFilter,
      viewMode,
      setSearchParams,
    ],
  );

  const handleViewModeChange = useCallback(
    (nextMode: ViewMode) => {
      writeStoredRepositoriesViewMode(nextMode);
      setStoredViewMode(nextMode);
      const nextRows = clampRowsForRepositoriesView(rowsPerPage, nextMode);
      if (nextRows !== rowsPerPage) {
        setRowsPerPage(nextRows);
        setPage(0);
        syncToUrl({
          view: nextMode,
          rows: String(nextRows),
          page: '0',
        });
      } else {
        syncToUrl({ view: nextMode });
      }
    },
    [rowsPerPage, syncToUrl],
  );

  const rankedRepositories = useMemo(() => {
    // First, sort by the current sort column
    const sorted = [...repositories].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'repository':
          comparison = a.repository.localeCompare(b.repository);
          break;
        case 'weight':
          comparison = a.weight - b.weight;
          break;
        case 'totalScore':
          comparison = a.totalScore - b.totalScore;
          break;
        case 'totalPRs':
          comparison = a.totalPRs - b.totalPRs;
          break;
        case 'contributors':
          comparison = a.uniqueMiners.size - b.uniqueMiners.size;
          break;
        default:
          // Default to totalScore descending (original behavior)
          comparison = b.totalScore - a.totalScore;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Then add rank based on sorted order
    return sorted.map((repo, index) => ({ ...repo, rank: index + 1 }));
  }, [repositories, sortColumn, sortDirection]);

  const filteredRepositories = useMemo(() => {
    let filtered = rankedRepositories;

    if (statusFilter === 'active') {
      filtered = filtered.filter((repo) => !repo.inactiveAt);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((repo) => !!repo.inactiveAt);
    }

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((repo) =>
        repo.repository?.toLowerCase().includes(lowerQuery),
      );
    }

    return filtered;
  }, [rankedRepositories, statusFilter, searchQuery]);

  const maxWeight = useMemo(
    () => rankedRepositories.reduce((m, r) => (r.weight > m ? r.weight : m), 0),
    [rankedRepositories],
  );

  const pagedRepositories = useMemo(
    () =>
      filteredRepositories.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
      ),
    [filteredRepositories, page, rowsPerPage],
  );

  const getChartOption = () => {
    const chartData = pagedRepositories;
    const white = UI_COLORS.white;
    const borderSubtle = alpha(white, 0.08);
    const borderLight = alpha(white, 0.1);
    const surfaceSubtle = alpha(white, 0.02);
    const textColor = alpha(white, 0.85);
    const gridColor = borderSubtle;
    const tooltipBorderColor = borderLight;
    const tooltipLabelColor = alpha(white, TEXT_OPACITY.secondary);
    const primaryColor = UI_COLORS.white;

    const chartMetric: Record<
      SortColumn,
      {
        title: string;
        yAxis: string;
        value: (r: (typeof chartData)[number]) => number;
      }
    > = {
      weight: {
        title: 'Repository Weights',
        yAxis: 'Weight',
        value: (r) => r.weight || 0,
      },
      totalScore: {
        title: 'Total Score',
        yAxis: 'Total Score',
        value: (r) => r.totalScore || 0,
      },
      totalPRs: {
        title: 'Pull Requests by Repository',
        yAxis: 'PRs',
        value: (r) => r.totalPRs || 0,
      },
      contributors: {
        title: 'Contributors by Repository',
        yAxis: 'Contributors',
        value: (r) => r.uniqueMiners?.size || 0,
      },
      rank: {
        title: 'Total Score',
        yAxis: 'Total Score',
        value: (r) => r.totalScore || 0,
      },
      repository: {
        title: 'Total Score',
        yAxis: 'Total Score',
        value: (r) => r.totalScore || 0,
      },
    };
    const metric = chartMetric[sortColumn] ?? chartMetric.totalScore;
    const effectiveLogScale =
      useLogScale &&
      sortColumn !== 'weight' &&
      sortColumn !== 'totalPRs' &&
      sortColumn !== 'contributors';

    const barGradient = {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: alpha(CHART_COLORS.open, 0.8) },
        { offset: 0.5, color: alpha(CHART_COLORS.open, 0.6) },
        { offset: 1, color: alpha(CHART_COLORS.open, 0.4) },
      ],
    };

    const xAxisData = chartData.map((item) => ({
      name: (item?.repository || '').split('/')[1] || item?.repository || '',
      fullName: item?.repository || '',
    }));

    const seriesData = chartData.map((item, index) => ({
      value: metric.value(item),
      rank: item?.rank || index + 1,
      repository: item?.repository || '',
      weight: item?.weight || 0,
      prs: item?.totalPRs || 0,
      contributors: item?.uniqueMiners?.size || 0,
      itemStyle: {
        color: barGradient,
        borderRadius: [6, 6, 0, 0],
        shadowColor: alpha(CHART_COLORS.open, 0.2),
        shadowBlur: 12,
      },
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: metric.title,
        subtext: 'Values match the current table sort and page',
        left: 'center',
        top: 20,
        textStyle: {
          color: primaryColor,
          fontSize: 18,
          fontWeight: 600,
        },
        subtextStyle: {
          color: alpha(white, TEXT_OPACITY.tertiary),
          fontSize: 12,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: borderSubtle,
          },
        },
        backgroundColor: UI_COLORS.surfaceTooltip,
        borderColor: alpha(white, 0.15),
        borderWidth: 1,
        textStyle: {
          color: primaryColor,
          fontSize: 12,
        },
        padding: [12, 16],
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          if (!Array.isArray(params)) return '';
          const data = params[0];
          const item = seriesData[data.dataIndex];

          const statRow = (label: string, value: string) => `
                <span style="color: ${tooltipLabelColor}; min-width: 0;">${label}</span>
                <span style="color: ${primaryColor}; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap;">${value}</span>`;

          return `
            <div style="font-family: 'JetBrains Mono', monospace; display: grid; grid-template-columns: minmax(0, max-content); width: max-content; max-width: min(420px, 92vw); box-sizing: border-box;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; line-height: 1.35;">
                #${item.rank} ${item.repository}
              </div>
              <div style="margin-top: 0; padding-top: 8px; border-top: 1px solid ${tooltipBorderColor}; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 10px; row-gap: 6px; align-items: baseline; min-width: 0;">
                ${statRow('Total Score:', item.value.toFixed(2))}
                ${statRow('Weight:', item.weight.toFixed(2))}
                ${statRow('Pull Requests:', String(item.prs))}
                ${statRow('Contributors:', String(item.contributors))}
              </div>
            </div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '18%',
        top: '18%',
        containLabel: true,
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      xAxis: {
        type: 'category',
        data: xAxisData.map((item) => item.name),
        axisLabel: {
          color: textColor,
          fontSize: 11,
          interval: 0,
          rotate: 45,
          margin: 12,
          formatter: (label: string) =>
            label.length > 15 ? `${label.substring(0, 12)}...` : label,
        },
        axisLine: {
          lineStyle: {
            color: gridColor,
            width: 1,
          },
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        type: effectiveLogScale ? 'log' : 'value',
        min: effectiveLogScale ? 1 : 0,
        logBase: 10,
        name: metric.yAxis,
        nameTextStyle: {
          color: textColor,
          fontSize: 12,
          padding: [0, 0, 0, 0],
        },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
            if (sortColumn === 'weight') return value.toFixed(2);
            return value.toFixed(0);
          },
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: 'dashed',
            opacity: 0.5,
          },
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      series: [
        {
          data: seriesData,
          type: 'bar',
          barWidth: '60%',
          showBackground: true,
          backgroundStyle: {
            color: surfaceSubtle,
            borderRadius: [6, 6, 0, 0],
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 20,
              shadowColor: alpha(STATUS_COLORS.info, 0.5),
            },
          },
          animationDuration: 1000,
          animationEasing: 'cubicOut',
        },
      ],
    };
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
    syncToUrl({ page: String(newPage) });
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newRows = parseInt(event.target.value, 10);
    setRowsPerPage(newRows);
    setPage(0);
    syncToUrl({ rows: String(newRows), page: '0' });
  };

  const handleSort = (column: SortColumn) => {
    let newDir: SortDirection;
    if (sortColumn === column) {
      newDir = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDir);
    } else {
      newDir = column === 'repository' ? 'asc' : 'desc';
      setSortColumn(column);
      setSortDirection(newDir);
    }
    setPage(0);
    syncToUrl({ sort: column, dir: newDir, page: '0' });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isDirectRepoInput) {
      navigate(getRepositoryHref(trimmedSearch), {
        state: linkState,
      });
    }
    if (e.key === 'Escape' && !trimmedSearch) {
      setIsMobileSearchOpen(false);
    }
  };

  const searchAdornment = (
    <InputAdornment position="start">
      <SearchIcon
        sx={{
          color: 'text.tertiary',
          fontSize: '1rem',
        }}
      />
    </InputAdornment>
  );

  const searchFieldBaseSx = {
    '& .MuiOutlinedInput-root': {
      color: 'text.primary',
      backgroundColor: 'background.default',
      fontSize: '0.8rem',
      height: '36px',
      borderRadius: 2,
      '& fieldset': { borderColor: 'border.light' },
      '&:hover fieldset': {
        borderColor: 'border.medium',
      },
      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
    },
  } as const;

  const searchInput = (
    <TextField
      placeholder="Search or enter owner/repo..."
      size="small"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={handleSearchKeyDown}
      onBlur={() => {
        if (isMobile && !trimmedSearch) {
          setIsMobileSearchOpen(false);
        }
      }}
      autoFocus={isMobileSearchOpen}
      InputProps={{
        startAdornment: searchAdornment,
      }}
      sx={{
        width: '200px',
        ...(isMobileSearchVisible
          ? {
              flexBasis: { xs: '100%', sm: 'auto' },
              order: { xs: 10, sm: 'initial' },
            }
          : {}),
        ...searchFieldBaseSx,
      }}
    />
  );

  // Custom sort header to preserve the original unicode arrow look and
  // cell-wide click + hover (MUI's TableSortLabel differs visually). The
  // Box takes on the cell's padding so clicks anywhere inside the cell hit.
  const renderSortHeader = (
    column: SortColumn,
    label: string,
    align: 'left' | 'right' = 'left',
  ) => (
    <Box
      onClick={() => handleSort(column)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        userSelect: 'none',
        width: '100%',
        height: '100%',
        px: 2,
        py: 1,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      {label}
      {sortColumn === column && (
        <Typography component="span" sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
          {sortDirection === 'asc' ? '▲' : '▼'}
        </Typography>
      )}
    </Box>
  );

  const sortableHeaderSx = {
    padding: 0,
    cursor: 'pointer',
    userSelect: 'none' as const,
    '&:hover': {
      backgroundColor: 'surface.light',
    },
  };

  const listColumns: DataTableColumn<RepoStats, SortColumn>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '60px',
      cellSx: { pr: 0 },
      renderCell: (repo) => <RankIcon rank={repo.rank || 0} />,
    },
    {
      key: 'repository',
      header: renderSortHeader('repository', 'Repository'),
      width: '35%',
      headerSx: sortableHeaderSx,
      cellSx: { pl: 1.5 },
      renderCell: (repo) => (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            '&:hover': {
              '& .MuiTypography-root': {
                color: 'primary.main',
                textDecoration: 'underline',
              },
            },
          }}
        >
          <Avatar
            src={`https://avatars.githubusercontent.com/${(repo.repository || '').split('/')[0]}`}
            alt={(repo.repository || '').split('/')[0]}
            sx={{
              width: 20,
              height: 20,
              border: '1px solid',
              borderColor: 'border.medium',
              backgroundColor: getRepositoryOwnerAvatarBackground(
                (repo.repository || '').split('/')[0],
              ),
            }}
          />
          <Tooltip title={repo.repository || ''} placement="top">
            <Typography
              component="span"
              sx={{
                color: 'text.primary',
                fontWeight: 500,
                transition: 'color 0.2s',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                display: 'inline-block',
              }}
            >
              {truncateText(repo.repository || '', 40)}
            </Typography>
          </Tooltip>
        </Box>
      ),
    },
    {
      key: 'weight',
      header: renderSortHeader('weight', 'Weight', 'right'),
      width: '12%',
      align: 'right',
      headerSx: sortableHeaderSx,
      renderCell: (repo) => (
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          {repo.weight.toFixed(2)}
        </Typography>
      ),
    },
    {
      key: 'totalScore',
      header: renderSortHeader('totalScore', 'Total Score', 'right'),
      width: '18%',
      align: 'right',
      headerSx: sortableHeaderSx,
      renderCell: (repo) => (
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color:
              (repo.totalScore || 0) > 0 ? 'text.primary' : 'text.secondary',
          }}
        >
          {(repo.totalScore || 0) > 0
            ? Number(repo.totalScore || 0).toFixed(2)
            : '-'}
        </Typography>
      ),
    },
    {
      key: 'totalPRs',
      header: renderSortHeader('totalPRs', 'PRs', 'right'),
      width: '15%',
      align: 'right',
      headerSx: sortableHeaderSx,
      renderCell: (repo) => (
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: (repo.totalPRs || 0) > 0 ? 'text.primary' : 'text.secondary',
          }}
        >
          {(repo.totalPRs || 0) > 0 ? repo.totalPRs : '-'}
        </Typography>
      ),
    },
    {
      key: 'contributors',
      header: renderSortHeader('contributors', 'Contributors', 'right'),
      width: '15%',
      align: 'right',
      headerSx: sortableHeaderSx,
      renderCell: (repo) => (
        <Typography
          sx={{
            fontSize: '0.75rem',
            color:
              (repo.uniqueMiners?.size || 0) > 0
                ? 'text.primary'
                : 'text.secondary',
          }}
        >
          {(repo.uniqueMiners?.size || 0) > 0 ? repo.uniqueMiners?.size : '-'}
        </Typography>
      ),
    },
  ];

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(0);
    syncToUrl({ search: searchQuery, page: '0' });
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isMobile) {
      setIsMobileSearchOpen(false);
    }
  }, [isMobile]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      elevation={0}
    >
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'border.light',
        }}
      >
        {/* Row 1: All Controls */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <FilterButton
              label="All"
              count={rankedRepositories.length}
              color={STATUS_COLORS.neutral}
              isActive={statusFilter === 'all'}
              onClick={() => {
                setStatusFilter('all');
                setPage(0);
                syncToUrl({ status: 'all', page: '0' });
              }}
            />
            <FilterButton
              label="Active"
              count={rankedRepositories.filter((r) => !r.inactiveAt).length}
              color={STATUS_COLORS.success}
              isActive={statusFilter === 'active'}
              onClick={() => {
                setStatusFilter('active');
                setPage(0);
                syncToUrl({ status: 'active', page: '0' });
              }}
            />
            <FilterButton
              label="Inactive"
              count={rankedRepositories.filter((r) => !!r.inactiveAt).length}
              color={STATUS_COLORS.closed}
              isActive={statusFilter === 'inactive'}
              onClick={() => {
                setStatusFilter('inactive');
                setPage(0);
                syncToUrl({ status: 'inactive', page: '0' });
              }}
            />
          </Box>

          <Tooltip title={showChart ? 'Hide Chart' : 'Show Chart'}>
            <IconButton
              onClick={() => setShowChart(!showChart)}
              size="small"
              sx={{
                color: showChart ? 'text.primary' : 'text.tertiary',
                border: '1px solid',
                borderColor: 'border.light',
                borderRadius: 2,
                padding: '6px',
                '&:hover': {
                  backgroundColor: 'surface.light',
                  borderColor: 'border.medium',
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

          {showChart && (
            <FormControlLabel
              control={
                <Switch
                  checked={useLogScale}
                  onChange={(e) => setUseLogScale(e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'primary.main',
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: 'border.medium',
                    },
                  }}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                  }}
                >
                  Log Scale
                </Typography>
              }
            />
          )}

          <FormControl size="small">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                }}
              >
                Rows:
              </Typography>
              <Select
                value={rowsPerPage}
                onChange={(e) => {
                  const newRows = e.target.value as number;
                  setRowsPerPage(newRows);
                  setPage(0);
                  syncToUrl({ rows: String(newRows), page: '0' });
                }}
                sx={{
                  color: 'text.primary',
                  backgroundColor: 'background.default',
                  fontSize: '0.8rem',
                  height: '36px',
                  borderRadius: 2,
                  minWidth: '80px',
                  '& fieldset': { borderColor: 'border.light' },
                  '&:hover fieldset': {
                    borderColor: 'border.medium',
                  },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  '& .MuiSelect-select': { py: 0.75 },
                }}
              >
                {(viewMode === 'cards'
                  ? REPOSITORIES_CARD_ROWS
                  : REPOSITORIES_LIST_ROWS
                ).map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </FormControl>

          {isMobileSearchVisible ? (
            searchInput
          ) : isMobile ? (
            <IconButton
              size="small"
              onClick={() => setIsMobileSearchOpen(true)}
              sx={{
                color: 'text.tertiary',
                border: '1px solid',
                borderColor: 'border.light',
                borderRadius: 2,
                width: 36,
                height: 36,
                '&:hover': {
                  backgroundColor: 'surface.light',
                  borderColor: 'border.medium',
                },
              }}
            >
              <SearchIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          ) : (
            searchInput
          )}

          <Box sx={{ ml: 'auto' }}>
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
            />
          </Box>
        </Box>

        {/* Row 2: Sort controls (card view only) */}
        {viewMode === 'cards' && (
          <Box
            sx={{
              px: 2,
              pb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
            >
              Sort:
            </Typography>
            <Select
              size="small"
              value={sortColumn}
              onChange={(e) => handleSort(e.target.value as SortColumn)}
              sx={{
                color: 'text.primary',
                backgroundColor: 'background.default',
                fontSize: '0.8rem',
                height: '36px',
                borderRadius: 2,
                minWidth: '140px',
                '& fieldset': { borderColor: 'border.light' },
                '&:hover fieldset': { borderColor: 'border.medium' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                '& .MuiSelect-select': { py: 0.75 },
              }}
            >
              {CARD_SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <Tooltip
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              <IconButton
                onClick={() => handleSort(sortColumn)}
                size="small"
                aria-label={
                  sortDirection === 'asc' ? 'Sort descending' : 'Sort ascending'
                }
                sx={{
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'border.light',
                  borderRadius: 2,
                  padding: '6px',
                  '&:hover': {
                    backgroundColor: 'surface.light',
                    borderColor: 'border.medium',
                  },
                }}
              >
                {sortDirection === 'asc' ? (
                  <ArrowUpwardIcon fontSize="small" />
                ) : (
                  <ArrowDownwardIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Collapse in={showChart}>
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'border.light',
            height: '500px',
            backgroundColor: 'surface.subtle',
          }}
        >
          {showChart && filteredRepositories.length > 0 && (
            <ReactECharts
              option={getChartOption()}
              style={{ height: '100%', width: '100%' }}
            />
          )}
        </Box>
      </Collapse>

      {viewMode === 'cards' && (
        <Box
          sx={{
            p: 2,
            overflowY: 'auto',
            ...scrollbarSx,
          }}
        >
          {isLoading ? (
            <Grid container spacing={2}>
              {Array.from({ length: rowsPerPage }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={4} key={i}>
                  <Skeleton
                    variant="rounded"
                    height={168}
                    sx={{
                      bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          ) : pagedRepositories.length > 0 ? (
            <Grid container spacing={2}>
              {pagedRepositories.map((repo) => (
                <Grid item xs={12} sm={6} md={4} lg={4} key={repo.repository}>
                  <RepositoryCard
                    repo={repo}
                    maxWeight={maxWeight}
                    href={getRepositoryHref(repo.repository || '')}
                    linkState={linkState}
                  />
                </Grid>
              ))}
            </Grid>
          ) : trimmedSearch && isDirectRepoInput ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                p: 2,
              }}
            >
              <Typography sx={{ color: 'text.secondary' }}>
                Repository not in tracked list. Open details for{' '}
                <Typography
                  component="span"
                  sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {trimmedSearch}
                </Typography>
                ?
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  navigate(getRepositoryHref(trimmedSearch), {
                    state: linkState,
                  })
                }
                sx={{ textTransform: 'none' }}
              >
                Open repository
              </Button>
            </Box>
          ) : (
            <Typography
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                py: 4,
              }}
            >
              No repositories match the current filters.
            </Typography>
          )}
        </Box>
      )}

      {viewMode === 'list' && (
        <Box sx={{ overflowY: 'auto', ...scrollbarSx }}>
          <DataTable<RepoStats, SortColumn>
            columns={listColumns}
            rows={pagedRepositories}
            isLoading={isLoading}
            getRowKey={(repo) => repo.repository || ''}
            getRowHref={(repo) => getRepositoryHref(repo.repository || '')}
            linkState={linkState}
            getRowSx={(repo) => ({
              opacity: repo.inactiveAt ? 0.5 : 1,
              '&:hover': { backgroundColor: 'border.subtle' },
              transition: 'all 0.2s',
              borderBottom: '1px solid',
              borderColor: 'surface.light',
            })}
            minWidth="1000px"
            stickyHeader
            emptyState={
              !filteredRepositories.length &&
              trimmedSearch &&
              isDirectRepoInput ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    px: 2,
                    py: 2,
                    borderBottom: '1px solid',
                    borderColor: 'surface.light',
                  }}
                >
                  <Typography sx={{ color: 'text.secondary' }}>
                    Repository not in tracked list. Open details for{' '}
                    <Typography component="span">{trimmedSearch}</Typography>?
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      navigate(getRepositoryHref(trimmedSearch), {
                        state: linkState,
                      })
                    }
                    sx={{ textTransform: 'none' }}
                  >
                    Open repository
                  </Button>
                </Box>
              ) : undefined
            }
          />
        </Box>
      )}
      <TablePagination
        rowsPerPageOptions={[]}
        component="div"
        count={filteredRepositories.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        showFirstButton
        showLastButton
        sx={{
          borderTop: '1px solid',
          borderColor: 'border.light',
          color: 'text.secondary',
          '.MuiTablePagination-displayedRows': {},
        }}
      />
    </Card>
  );
};

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
}) => {
  const options: {
    value: ViewMode;
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

export default TopRepositoriesTable;

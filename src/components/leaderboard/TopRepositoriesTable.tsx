import React, { useState, useMemo, useCallback } from 'react';
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
import { RepositoryCard } from './RepositoryCard';
import {
  REPOSITORIES_CARD_ROWS,
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
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import {
  ClearSearchAdornment,
  ChartEmptyPanel,
  WatchlistButton,
} from '../common';
import { DebouncedSearchInput } from '../common/DebouncedSearchInput';
import {
  compareByWatchlist,
  formatWeight,
  getRepositoryOwnerAvatarSrc,
  truncateText,
} from '../../utils';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import { useClampUrlPage } from '../../hooks/useUrlPaginationParam';
import { useWatchlist } from '../../hooks/useWatchlist';
import { RankIcon } from './RankIcon';
import { getRepositoryOwnerAvatarBackground, type RepoStats } from './types';
import {
  CHART_COLORS,
  STATUS_COLORS,
  TEXT_OPACITY,
  UI_COLORS,
  scrollbarSx,
} from '../../theme';
import {
  echartsAxisTooltipChrome,
  echartsBarChartTitle,
  echartsFontFamily,
  echartsGridBarPaged,
  echartsStrongAxisLabelColor,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';

type SortColumn =
  | 'rank'
  | 'repository'
  | 'weight'
  | 'totalScore'
  | 'totalPRs'
  | 'contributors'
  | 'discoveryScore'
  | 'discoveryIssues'
  | 'discoveryContributors'
  | 'watch';
type ViewMode = RepositoriesViewMode;

/** Chart-friendly metrics (excludes purely-display columns like rank/watch). */
type ChartMetricKey =
  | 'weight'
  | 'totalScore'
  | 'totalPRs'
  | 'contributors'
  | 'discoveryScore'
  | 'discoveryIssues'
  | 'discoveryContributors';

const CHART_METRIC_OPTIONS: Array<{ value: ChartMetricKey; label: string }> = [
  { value: 'totalScore', label: 'OSS Score' },
  { value: 'totalPRs', label: 'PRs' },
  { value: 'contributors', label: 'OSS Contributors' },
  { value: 'discoveryIssues', label: 'Issues' },
  { value: 'discoveryScore', label: 'Issue Score' },
  { value: 'discoveryContributors', label: 'Issue Contributors' },
  { value: 'weight', label: 'Weight' },
];

const VALID_CHART_METRIC_KEYS = new Set<ChartMetricKey>(
  CHART_METRIC_OPTIONS.map((o) => o.value),
);

interface ChartCandidate {
  weight?: number;
  totalScore?: number;
  totalPRs?: number;
  uniqueMiners?: Set<string>;
  discoveryScore?: number;
  discoveryIssues?: number;
  discoveryContributors?: Set<string>;
}

const CHART_METRIC_VALUE: Record<
  ChartMetricKey,
  (r: ChartCandidate) => number
> = {
  weight: (r) => r.weight || 0,
  totalScore: (r) => r.totalScore || 0,
  totalPRs: (r) => r.totalPRs || 0,
  contributors: (r) => r.uniqueMiners?.size || 0,
  discoveryScore: (r) => r.discoveryScore || 0,
  discoveryIssues: (r) => r.discoveryIssues || 0,
  discoveryContributors: (r) => r.discoveryContributors?.size || 0,
};

/** Card sort: classic metrics + Issues; issue score/contrib. sort via list headers / URL. */
const CARD_SORT_OPTIONS: Array<{ value: SortColumn; label: string }> = [
  { value: 'weight', label: 'Weight' },
  { value: 'totalScore', label: 'OSS score' },
  { value: 'totalPRs', label: 'PRs' },
  { value: 'contributors', label: 'Contributors' },
  { value: 'discoveryScore', label: 'Issue Score' },
  { value: 'discoveryIssues', label: 'Issues' },
  { value: 'discoveryContributors', label: 'Issue Contributors' },
  { value: 'repository', label: 'Repository' },
];

interface TopRepositoriesTableProps {
  repositories: RepoStats[];
  isLoading?: boolean;
  getRepositoryHref: (repositoryFullName: string) => string;
  linkState?: Record<string, unknown>;
}

const ISSUE_METRIC_KEYS = new Set<ChartMetricKey>([
  'discoveryIssues',
  'discoveryScore',
  'discoveryContributors',
]);

const VALID_SORT_COLUMNS: readonly SortColumn[] = [
  'rank',
  'repository',
  'weight',
  'totalScore',
  'totalPRs',
  'contributors',
  'discoveryScore',
  'discoveryIssues',
  'discoveryContributors',
  'watch',
] as const;

const SEARCH_QUERY_PARAM = 'search';
const PAGE_QUERY_PARAM = 'page';
const ROWS_QUERY_PARAM = 'rows';

type TopRepositoriesUrlFilters = {
  search: string;
  view: ViewMode;
};

/** List view: show numeric zeros when the row has OSS activity (avoids PRs > 0 with OSS score "-"). */
const repoHasOssActivity = (repo: RepoStats) =>
  (repo.totalPRs ?? 0) > 0 || (repo.totalScore ?? 0) > 0;

/** List view: show discovery numbers when any discovery dimension is non-zero. */
const repoHasDiscoveryActivity = (repo: RepoStats) =>
  (repo.discoveryIssues ?? 0) !== 0 ||
  (repo.discoveryScore ?? 0) !== 0 ||
  (repo.discoveryContributors?.size ?? 0) > 0;

const TopRepositoriesTable: React.FC<TopRepositoriesTableProps> = ({
  repositories,
  isLoading,
  getRepositoryHref,
  linkState,
}) => {
  const navigate = useNavigate();

  // `view` always serializes (never null) so toggling re-renders even when
  // the new value matches localStorage. See TopMinersTable.tsx for context.
  const filtersConfig = useMemo(
    () => ({
      search: {
        paramKey: SEARCH_QUERY_PARAM,
        parse: (raw: string | null): string => raw ?? '',
        serialize: (value: string): string | null => value.trim() || null,
      },
      view: {
        paramKey: REPOSITORIES_VIEW_QUERY_PARAM,
        parse: (raw: string | null): ViewMode =>
          getRepositoriesViewModeFromQuery(
            raw,
            readStoredRepositoriesViewMode(),
          ),
        serialize: (value: ViewMode): string => value,
        resetPageOnChange: false,
      },
    }),
    [],
  );

  const {
    sortField: sortColumn,
    sortOrder: sortDirection,
    setSort: handleSort,
    page,
    setPage,
    rowsPerPage: rawRowsPerPage,
    setRowsPerPage,
    filters,
    setFilter,
  } = useDataTableParams<SortColumn, TopRepositoriesUrlFilters>({
    sortKeys: VALID_SORT_COLUMNS,
    defaultSortKey: 'weight',
    // Repository sorts A-Z by default; numeric columns default to desc.
    defaultOrderOverrides: { repository: 'asc' },
    defaultRowsPerPage: REPOSITORIES_DEFAULT_LIST_ROWS,
    rowsPerPageOptions: REPOSITORIES_VALID_ROWS,
    paramKeys: { page: PAGE_QUERY_PARAM, rowsPerPage: ROWS_QUERY_PARAM },
    filters: filtersConfig,
  });

  const { search: searchQuery, view: viewMode } = filters;

  // List and cards use different page-size scales (10/25/50 vs 12/24/48).
  // Clamp the hook's raw value to the active view's options for display.
  const rowsPerPage = clampRowsForRepositoriesView(rawRowsPerPage, viewMode);

  const [showChart, setShowChart] = useState(false);
  const [useLogScale, setUseLogScale] = useState(true);

  const handleSearchChange = useCallback(
    (value: string) => setFilter('search', value),
    [setFilter],
  );

  const chartMetricKey: ChartMetricKey = VALID_CHART_METRIC_KEYS.has(
    sortColumn as ChartMetricKey,
  )
    ? (sortColumn as ChartMetricKey)
    : 'totalScore';

  const { isWatched } = useWatchlist('repos');
  const theme = useTheme();
  const debouncedSearchTrim = searchQuery.trim();
  const debouncedIsDirectRepoInput = /^[^/\s]+\/[^/\s]+$/.test(
    debouncedSearchTrim,
  );
  const isCompactChart = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobileControls = useMediaQuery(theme.breakpoints.down('md'));

  const cardSortSelectOptions = useMemo(() => {
    const opts = [...CARD_SORT_OPTIONS];
    const inCardList = opts.some((o) => o.value === sortColumn);
    if (
      !inCardList &&
      (sortColumn === 'discoveryScore' ||
        sortColumn === 'discoveryContributors')
    ) {
      opts.push(
        sortColumn === 'discoveryScore'
          ? { value: 'discoveryScore' as const, label: 'Issue score' }
          : {
              value: 'discoveryContributors' as const,
              label: 'Issue contributors',
            },
      );
    }
    return opts;
  }, [sortColumn]);

  const handleViewModeChange = useCallback(
    (nextMode: ViewMode) => {
      // Persist to localStorage before the URL write so the parse fallback
      // sees the new value.
      writeStoredRepositoriesViewMode(nextMode);
      // Reflow from the clamped (visible) value so stale URLs like
      // `?view=list&rows=24` land on the new view's default, not on 24.
      const nextRows = clampRowsForRepositoriesView(rowsPerPage, nextMode);
      if (nextRows !== rowsPerPage) {
        setRowsPerPage(nextRows);
      }
      setFilter('view', nextMode);
    },
    [rowsPerPage, setRowsPerPage, setFilter],
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
        case 'discoveryScore':
          comparison = a.discoveryScore - b.discoveryScore;
          break;
        case 'discoveryIssues':
          comparison = a.discoveryIssues - b.discoveryIssues;
          break;
        case 'discoveryContributors':
          comparison =
            a.discoveryContributors.size - b.discoveryContributors.size;
          break;
        case 'watch':
          comparison = compareByWatchlist(a, b, (r) => r.repository, isWatched);
          break;
        default:
          // Default to totalScore descending (original behavior)
          comparison = b.totalScore - a.totalScore;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Then add rank based on sorted order
    return sorted.map((repo, index) => ({ ...repo, rank: index + 1 }));
  }, [repositories, sortColumn, sortDirection, isWatched]);

  const filteredRepositories = useMemo(() => {
    let filtered = rankedRepositories;

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((repo) =>
        repo.repository?.toLowerCase().includes(lowerQuery),
      );
    }

    return filtered;
  }, [rankedRepositories, searchQuery]);

  const maxWeight = useMemo(
    () => rankedRepositories.reduce((m, r) => (r.weight > m ? r.weight : m), 0),
    [rankedRepositories],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRepositories.length / rowsPerPage),
  );
  useClampUrlPage(page, setPage, totalPages, !isLoading);

  const safePage = Math.min(page, totalPages - 1);

  const pagedRepositories = useMemo(
    () =>
      filteredRepositories.slice(
        safePage * rowsPerPage,
        safePage * rowsPerPage + rowsPerPage,
      ),
    [filteredRepositories, safePage, rowsPerPage],
  );

  /* Chart shows the top N repos for the chosen metric (independent of the
     table's sort/pagination), but still respects status + search filters. */
  const chartTopRepositories = useMemo(() => {
    const valueOf = CHART_METRIC_VALUE[chartMetricKey];
    const base = ISSUE_METRIC_KEYS.has(chartMetricKey)
      ? filteredRepositories.filter((r) => r.mirrorEnabled)
      : filteredRepositories;
    return [...base]
      .filter((r) => valueOf(r) > 0)
      .sort((a, b) => valueOf(b) - valueOf(a))
      .slice(0, rowsPerPage)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [filteredRepositories, chartMetricKey, rowsPerPage]);

  const getChartOption = () => {
    const chartData = chartTopRepositories;
    const white = UI_COLORS.white;
    const borderSubtle = alpha(white, 0.08);
    const surfaceSubtle = alpha(white, 0.02);
    const textColor = echartsStrongAxisLabelColor(theme);
    const gridColor = theme.palette.border.subtle;
    const tooltipBorderColor = alpha(theme.palette.text.primary, 0.14);
    const tooltipLabelColor = alpha(white, TEXT_OPACITY.secondary);
    const primaryColor = theme.palette.text.primary;
    const chartFont = echartsFontFamily(theme);

    const chartMetric: Record<
      SortColumn,
      {
        title: string;
        yAxis: string;
        value: (r: (typeof chartData)[number]) => number;
      }
    > = {
      weight: {
        title: `Top ${rowsPerPage} Repositories by Weight`,
        yAxis: 'Weight',
        value: (r) => r.weight || 0,
      },
      totalScore: {
        title: `Top ${rowsPerPage} Repositories by OSS Score`,
        yAxis: 'OSS score',
        value: (r) => r.totalScore || 0,
      },
      totalPRs: {
        title: `Top ${rowsPerPage} Repositories by PR Count`,
        yAxis: 'PRs',
        value: (r) => r.totalPRs || 0,
      },
      contributors: {
        title: `Top ${rowsPerPage} Repositories by OSS Contributors`,
        yAxis: 'Contributors',
        value: (r) => r.uniqueMiners?.size || 0,
      },
      discoveryScore: {
        title: `Top ${rowsPerPage} Repositories by Issue Score`,
        yAxis: 'Issue score',
        value: (r) => r.discoveryScore || 0,
      },
      discoveryIssues: {
        title: `Top ${rowsPerPage} Repositories by Issue Count`,
        yAxis: 'Issues',
        value: (r) => r.discoveryIssues || 0,
      },
      discoveryContributors: {
        title: `Top ${rowsPerPage} Repositories by Issue Contributors`,
        yAxis: 'Contributors',
        value: (r) => r.discoveryContributors?.size || 0,
      },
      rank: {
        title: 'OSS score by repository',
        yAxis: 'OSS score',
        value: (r) => r.totalScore || 0,
      },
      repository: {
        title: 'OSS score by repository',
        yAxis: 'OSS score',
        value: (r) => r.totalScore || 0,
      },
      watch: {
        title: 'OSS score by repository',
        yAxis: 'OSS score',
        value: (r) => r.totalScore || 0,
      },
    };
    const metric = chartMetric[chartMetricKey] ?? chartMetric.totalScore;
    const effectiveLogScale =
      useLogScale &&
      chartMetricKey !== 'weight' &&
      chartMetricKey !== 'totalPRs' &&
      chartMetricKey !== 'contributors' &&
      chartMetricKey !== 'discoveryIssues' &&
      chartMetricKey !== 'discoveryContributors';

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
      ossScore: item?.totalScore || 0,
      discoveryScore: item?.discoveryScore || 0,
      discoveryIssues: item?.discoveryIssues || 0,
      discoveryContributors: item?.discoveryContributors?.size || 0,
      itemStyle: {
        color: barGradient,
        borderRadius: [6, 6, 0, 0],
        shadowColor: alpha(CHART_COLORS.open, 0.2),
        shadowBlur: 12,
      },
    }));

    const baseTitle = echartsBarChartTitle(
      theme,
      metric.title,
      'Top repositories ranked by the selected metric',
    );

    return {
      ...echartsTransparentBackground(),
      title: isCompactChart
        ? {
            ...baseTitle,
            top: 8,
            textStyle: {
              ...baseTitle.textStyle,
              fontSize: 13,
            },
            subtextStyle: {
              ...baseTitle.subtextStyle,
              fontSize: 10,
            },
          }
        : baseTitle,
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: borderSubtle,
          },
        },
        ...echartsAxisTooltipChrome(theme),
        textStyle: {
          color: primaryColor,
          fontFamily: chartFont,
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
            <div style="font-family: ${chartFont}; display: grid; grid-template-columns: minmax(0, max-content); width: max-content; max-width: min(420px, 92vw); box-sizing: border-box;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; line-height: 1.35;">
                #${item.rank} ${item.repository}
              </div>
              <div style="margin-top: 0; padding-top: 8px; border-top: 1px solid ${tooltipBorderColor}; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 10px; row-gap: 6px; align-items: baseline; min-width: 0;">
                ${statRow('OSS score:', item.ossScore.toFixed(2))}
                ${statRow('PRs:', String(item.prs))}
                ${statRow('OSS contributors:', String(item.contributors))}
                ${statRow('Issue score:', item.discoveryScore.toFixed(2))}
                ${statRow('Issues:', String(item.discoveryIssues))}
                ${statRow('Issue contributors:', String(item.discoveryContributors))}
                ${statRow('Weight:', formatWeight(item.weight))}
              </div>
            </div>
          `;
        },
      },
      grid: echartsGridBarPaged(),
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
          fontFamily: chartFont,
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
        name: isCompactChart ? '' : metric.yAxis,
        nameTextStyle: {
          color: textColor,
          fontFamily: chartFont,
          fontSize: 12,
          padding: [0, 0, 0, 0],
        },
        axisLabel: {
          color: textColor,
          fontFamily: chartFont,
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
            if (sortColumn === 'weight') return formatWeight(value);
            if (
              sortColumn === 'totalPRs' ||
              sortColumn === 'contributors' ||
              sortColumn === 'discoveryIssues' ||
              sortColumn === 'discoveryContributors'
            )
              return String(Math.round(value));
            if (
              sortColumn === 'totalScore' ||
              sortColumn === 'discoveryScore' ||
              sortColumn === 'rank' ||
              sortColumn === 'repository'
            )
              return value.toFixed(2);
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
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const raw = (e.target as HTMLInputElement).value.trim();
    const direct = /^[^/\s]+\/[^/\s]+$/.test(raw);
    if (e.key === 'Enter' && direct) {
      navigate(getRepositoryHref(raw), {
        state: linkState,
      });
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
    <DebouncedSearchInput
      initialDraft={searchQuery}
      onDebouncedChange={handleSearchChange}
    >
      {({ draftValue, setDraftValue }) => {
        return (
          <TextField
            placeholder="Search or enter owner/repo..."
            size="small"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            InputProps={{
              startAdornment: searchAdornment,
              endAdornment: (
                <ClearSearchAdornment
                  visible={Boolean(debouncedSearchTrim)}
                  onClear={() => handleSearchChange('')}
                />
              ),
            }}
            sx={{
              width: { xs: '100%', sm: '200px' },
              flexBasis: { xs: '100%', sm: 'auto' },
              order: { xs: -1, sm: 'initial' },
              ...searchFieldBaseSx,
            }}
          />
        );
      }}
    </DebouncedSearchInput>
  );

  const chartControls = (
    <>
      {showChart && (
        <FormControlLabel
          labelPlacement="start"
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
          sx={{ ml: 0 }}
        />
      )}
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
            width: 36,
            height: 36,
            flexShrink: 0,
            ml: { xs: 'auto', md: 0 },
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
    </>
  );

  // Sort dropdown + direction toggle. Rendered inline with the other controls
  // (not on its own row) for card view, and for either view while the chart is
  // open. List view sorts via column headers, so it has no inline sort control.
  const sortControls = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.75, sm: 1 },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontSize: '0.8rem',
          flexShrink: 0,
        }}
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
        {cardSortSelectOptions.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
      <Tooltip title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}>
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
            width: 36,
            height: 36,
            flexShrink: 0,
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
  );

  const compactSortableHeaderSx = {
    whiteSpace: 'nowrap',
    '& .MuiTableSortLabel-root': {
      whiteSpace: 'nowrap',
      maxWidth: '100%',
    },
    '& .MuiTableSortLabel-icon': {
      ml: 0.25,
    },
  } as const;

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
      header: 'Repository',
      width: '30%',
      sortKey: 'repository',
      headerSx: compactSortableHeaderSx,
      cellSx: { pl: 1.5 },
      renderCell: (repo) => {
        const owner = (repo.repository || '').split('/')[0] || '';
        return (
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
              src={getRepositoryOwnerAvatarSrc(owner) || undefined}
              alt={owner}
              sx={{
                width: 20,
                height: 20,
                border: '1px solid',
                borderColor: 'border.medium',
                backgroundColor: getRepositoryOwnerAvatarBackground(owner),
              }}
            >
              {(owner[0] || '?').toUpperCase()}
            </Avatar>
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
          </Box>
        );
      },
    },
    {
      key: 'weight',
      header: 'Weight',
      width: '10%',
      align: 'right',
      sortKey: 'weight',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => (
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          {formatWeight(repo.weight)}
        </Typography>
      ),
    },
    {
      key: 'totalScore',
      header: 'OSS score',
      width: '11%',
      align: 'right',
      sortKey: 'totalScore',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const active = repoHasOssActivity(repo);
        const v = repo.totalScore ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: active && v > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {active ? Number(v).toFixed(2) : '-'}
          </Typography>
        );
      },
    },
    {
      key: 'totalPRs',
      header: 'PRs',
      width: '7%',
      align: 'right',
      sortKey: 'totalPRs',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const active = repoHasOssActivity(repo);
        const n = repo.totalPRs ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: active && n > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {active ? String(n) : '-'}
          </Typography>
        );
      },
    },
    {
      key: 'discoveryScore',
      header: 'Issue score',
      width: '10%',
      align: 'right',
      sortKey: 'discoveryScore',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const active = repoHasDiscoveryActivity(repo);
        const v = repo.discoveryScore ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: active && v > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {active ? Number(v).toFixed(2) : '-'}
          </Typography>
        );
      },
    },
    {
      key: 'discoveryIssues',
      header: 'Issues',
      width: '7%',
      align: 'right',
      sortKey: 'discoveryIssues',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const active = repoHasDiscoveryActivity(repo);
        const n = repo.discoveryIssues ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: active && n > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {active ? String(n) : '-'}
          </Typography>
        );
      },
    },
    {
      key: 'contributors',
      header: 'Contributors',
      width: '9%',
      align: 'right',
      sortKey: 'contributors',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const active = repoHasOssActivity(repo);
        const n = repo.uniqueMiners?.size ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: active && n > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {active ? String(n) : '-'}
          </Typography>
        );
      },
    },
    {
      key: 'discoveryContributors',
      header: 'Issue contrib',
      width: '10%',
      align: 'right',
      sortKey: 'discoveryContributors',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const active = repoHasDiscoveryActivity(repo);
        const n = repo.discoveryContributors?.size ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: active && n > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {active ? String(n) : '-'}
          </Typography>
        );
      },
    },
    {
      key: 'watch',
      header: '★',
      width: '52px',
      align: 'center',
      sortKey: 'watch',
      cellSx: { p: 0 },
      renderCell: (repo) =>
        repo.repository ? (
          <WatchlistButton
            category="repos"
            itemKey={repo.repository}
            size="small"
          />
        ) : null,
    },
  ];

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
        {/* All controls — single row */}
        <Box
          sx={{
            p: { xs: 1, sm: 1.5, md: 2 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            gap: { xs: 1, md: 2 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
              gap: { xs: 0.75, sm: 1 },
              flexWrap: 'wrap',
              width: { xs: '100%', md: 'auto' },
            }}
          >
            {!isMobileControls && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {chartControls}
              </Box>
            )}

            <FormControl size="small">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.75, sm: 1 },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.8rem',
                    minWidth: { xs: 36, md: 'auto' },
                    flexShrink: 0,
                  }}
                >
                  Rows:
                </Typography>
                <Select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(e.target.value as number)}
                  sx={{
                    color: 'text.primary',
                    backgroundColor: 'background.default',
                    fontSize: '0.8rem',
                    height: '36px',
                    borderRadius: 2,
                    minWidth: '140px',
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

            {searchInput}

            {(viewMode === 'cards' || showChart) && sortControls}

            <Box sx={{ ml: 'auto' }}>
              <ViewModeToggle
                viewMode={viewMode}
                onChange={handleViewModeChange}
              />
            </Box>
          </Box>
        </Box>

        {isMobileControls && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: { xs: 1, sm: 1.5 },
              pb: { xs: 1, sm: 1.5 },
            }}
          >
            {chartControls}
          </Box>
        )}
      </Box>

      <Collapse in={showChart}>
        <Box
          sx={{
            p: { xs: 0.5, sm: 1.5, md: 2 },
            borderBottom: '1px solid',
            borderColor: 'border.light',
            height: { xs: 360, sm: 440, md: 500 },
            backgroundColor: 'surface.subtle',
          }}
        >
          {showChart &&
            (chartTopRepositories.length > 0 ? (
              <ReactECharts
                option={getChartOption()}
                style={{ height: '100%', width: '100%' }}
              />
            ) : (
              <ChartEmptyPanel
                empty
                minHeight="100%"
                title="No repositories to chart"
                hint="Adjust filters or search so at least one repository appears in the list, or switch back to table view."
              />
            ))}
        </Box>
      </Collapse>

      {viewMode === 'cards' && (
        <Box
          sx={{
            p: { xs: 1, sm: 1.5, md: 2 },
            overflowY: 'auto',
            ...scrollbarSx,
          }}
        >
          {isLoading ? (
            <Grid container spacing={{ xs: 1.25, sm: 2 }}>
              {Array.from({ length: rowsPerPage }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={4} key={i}>
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
          ) : pagedRepositories.length > 0 ? (
            <Grid container spacing={{ xs: 1.25, sm: 2 }}>
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
          ) : debouncedSearchTrim && debouncedIsDirectRepoInput ? (
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
                  {debouncedSearchTrim}
                </Typography>
                ?
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  navigate(getRepositoryHref(debouncedSearchTrim), {
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
            getRowSx={() => ({
              '&:hover': { backgroundColor: 'border.subtle' },
              transition: 'all 0.2s',
              borderBottom: '1px solid',
              borderColor: 'surface.light',
            })}
            minWidth="1280px"
            stickyHeader
            sort={{
              field: sortColumn,
              order: sortDirection,
              onChange: handleSort,
            }}
            emptyState={
              !filteredRepositories.length &&
              debouncedSearchTrim &&
              debouncedIsDirectRepoInput ? (
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
                    <Typography component="span">
                      {debouncedSearchTrim}
                    </Typography>
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      navigate(getRepositoryHref(debouncedSearchTrim), {
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
        page={safePage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        showFirstButton
        showLastButton
        sx={{
          borderTop: '1px solid',
          borderColor: 'border.light',
          color: 'text.secondary',
          overflow: 'hidden',
          '& .MuiToolbar-root': {
            px: { xs: 0.5, sm: 2 },
            minHeight: { xs: 44, sm: 52 },
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'flex-end' },
            rowGap: 0.5,
          },
          '& .MuiTablePagination-displayedRows': {
            fontSize: { xs: '0.72rem', sm: '0.8rem' },
            margin: 0,
          },
          '& .MuiTablePagination-actions': {
            ml: { xs: 0.5, sm: 2.5 },
            '& .MuiIconButton-root': {
              padding: { xs: '4px', sm: '8px' },
            },
          },
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

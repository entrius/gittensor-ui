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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
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
  alpha,
  type SxProps,
  type Theme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ReactECharts from 'echarts-for-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LinkTableRow } from '../common/linkBehavior';
import { truncateText } from '../../utils';
import { RankIcon } from './RankIcon';
import {
  getRepositoryOwnerAvatarBackground,
  headerCellStyle,
  bodyCellStyle,
} from './types';
import {
  CHART_COLORS,
  STATUS_COLORS,
  TEXT_OPACITY,
  UI_COLORS,
  scrollbarSx,
} from '../../theme';

interface RepoStats {
  repository: string;
  totalScore: number;
  totalPRs: number;
  uniqueMiners: Set<string>;
  weight: number;
  rank?: number;
  inactiveAt?: string | null;
}

type SortColumn =
  | 'rank'
  | 'repository'
  | 'weight'
  | 'totalScore'
  | 'totalPRs'
  | 'contributors';
type SortDirection = 'asc' | 'desc';

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
const VALID_ROWS = [10, 25, 50];

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

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(urlPage >= 0 ? urlPage : 0);
  const [rowsPerPage, setRowsPerPage] = useState(
    VALID_ROWS.includes(urlRows) ? urlRows : 10,
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>(
    urlSort && VALID_SORT_COLUMNS.includes(urlSort) ? urlSort : 'weight',
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    urlDir === 'asc' || urlDir === 'desc' ? urlDir : 'desc',
  );
  const [useLogScale, setUseLogScale] = useState(true);
  const isInitialMount = useRef(true);
  const trimmedSearch = searchQuery.trim();
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

      if (rows !== '10') params.rows = rows;
      if (pg !== '0') params.page = pg;
      if (sort !== 'weight') params.sort = sort;
      if (dir !== 'desc') params.dir = dir;
      if (search) params.search = search;

      setSearchParams(params, { replace: true });
    },
    [
      rowsPerPage,
      page,
      sortColumn,
      sortDirection,
      searchQuery,
      setSearchParams,
    ],
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

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((repo) =>
        repo.repository?.toLowerCase().includes(lowerQuery),
      );
    }

    return filtered;
  }, [rankedRepositories, searchQuery]);

  const getChartOption = () => {
    const chartData = filteredRepositories.slice(0, 50); // Limit for performance
    const white = UI_COLORS.white;
    const borderSubtle = alpha(white, 0.08);
    const borderLight = alpha(white, 0.1);
    const surfaceSubtle = alpha(white, 0.02);
    const textColor = alpha(white, 0.85);
    const gridColor = borderSubtle;
    const tooltipBorderColor = borderLight;
    const tooltipLabelColor = alpha(white, TEXT_OPACITY.secondary);
    const primaryColor = UI_COLORS.white;

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
      value: Number(item?.totalScore) || 0,
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
        text: 'Repository Score Performance',
        subtext: 'Total score generated by repository contributions',
        left: 'center',
        top: 20,
        textStyle: {
          color: primaryColor,
          fontFamily: 'JetBrains Mono',
          fontSize: 18,
          fontWeight: 600,
        },
        subtextStyle: {
          color: alpha(white, TEXT_OPACITY.tertiary),
          fontFamily: 'JetBrains Mono',
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
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
        padding: [12, 16],
        formatter: (params: any) => {
          const data = params[0];
          const item = seriesData[data.dataIndex];

          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">
                #${item.rank} ${item.repository}
              </div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${tooltipBorderColor};">
                <div style="color: ${tooltipLabelColor}; margin-bottom: 4px;">Total Score: <span style="color: ${primaryColor}; font-weight: 600;">${item.value.toFixed(2)}</span></div>
                <div style="color: ${tooltipLabelColor}; margin-bottom: 4px;">Weight: <span style="color: ${primaryColor}; font-weight: 600;">${item.weight.toFixed(2)}</span></div>
                <div style="color: ${tooltipLabelColor}; margin-bottom: 4px;">Pull Requests: <span style="color: ${primaryColor}; font-weight: 600;">${item.prs}</span></div>
                <div style="color: ${tooltipLabelColor};">Contributors: <span style="color: ${primaryColor}; font-weight: 600;">${item.contributors}</span></div>
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
          fontFamily: 'JetBrains Mono',
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
        type: useLogScale ? 'log' : 'value',
        min: useLogScale ? 1 : 0,
        logBase: 10,
        name: 'Total Score',
        nameTextStyle: {
          color: textColor,
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
          padding: [0, 0, 0, 0],
        },
        axisLabel: {
          color: textColor,
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
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

  const SortableHeader = ({
    column,
    children,
    align = 'left',
    sx = {},
  }: {
    column: SortColumn;
    children: React.ReactNode;
    align?: 'left' | 'right';
    sx?: SxProps<Theme>;
  }) => (
    <TableCell
      align={align}
      sx={{
        ...headerCellStyle,
        ...(sx || {}),
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': {
          backgroundColor: 'surface.light',
        },
      }}
      onClick={() => handleSort(column)}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          gap: 0.5,
        }}
      >
        {children}
        {sortColumn === column && (
          <Typography
            component="span"
            sx={{ fontSize: '0.7rem', opacity: 0.7 }}
          >
            {sortDirection === 'asc' ? '▲' : '▼'}
          </Typography>
        )}
      </Box>
    </TableCell>
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(0);
    syncToUrl({ search: searchQuery, page: '0' });
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

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
        {/* Row 2: All Controls */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
                      fontFamily: 'JetBrains Mono',
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
                    fontFamily: '"JetBrains Mono", monospace',
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
                    fontFamily: '"JetBrains Mono", monospace',
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
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </Box>
            </FormControl>

            <TextField
              placeholder="Search or enter owner/repo..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isDirectRepoInput) {
                  navigate(getRepositoryHref(trimmedSearch), {
                    state: linkState,
                  });
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{
                        color: 'text.tertiary',
                        fontSize: '1rem',
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: '200px',
                '& .MuiOutlinedInput-root': {
                  color: 'text.primary',
                  fontFamily: '"JetBrains Mono", monospace',
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
              }}
            />
          </Box>
        </Box>
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

      <TableContainer
        sx={{
          overflowY: 'auto',
          ...scrollbarSx,
        }}
      >
        <Table
          stickyHeader
          sx={{ tableLayout: 'fixed', width: '100%', minWidth: '1000px' }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellStyle, width: '60px' }}>
                Rank
              </TableCell>
              <SortableHeader column="repository" sx={{ width: '35%' }}>
                Repository
              </SortableHeader>
              <SortableHeader
                column="weight"
                align="right"
                sx={{ width: '12%' }}
              >
                Weight
              </SortableHeader>
              <SortableHeader
                column="totalScore"
                align="right"
                sx={{
                  width: '18%',
                }}
              >
                Total Score
              </SortableHeader>
              <SortableHeader
                column="totalPRs"
                align="right"
                sx={{ width: '15%' }}
              >
                PRs
              </SortableHeader>
              <SortableHeader
                column="contributors"
                align="right"
                sx={{ width: '15%' }}
              >
                Contributors
              </SortableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRepositories
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((repo) => {
                return (
                  <LinkTableRow
                    key={repo.repository}
                    href={getRepositoryHref(repo.repository || '')}
                    linkState={linkState}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'border.subtle',
                      },
                      transition: 'all 0.2s',
                      opacity: repo.inactiveAt ? 0.5 : 1,
                      borderBottom: '1px solid',
                      borderColor: 'surface.light',
                    }}
                  >
                    <TableCell sx={{ ...bodyCellStyle, width: '60px', pr: 0 }}>
                      <RankIcon rank={repo.rank || 0} />
                    </TableCell>
                    <TableCell sx={{ ...bodyCellStyle, width: '35%', pl: 1.5 }}>
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
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...bodyCellStyle, width: '12%' }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'text.primary',
                        }}
                      >
                        {repo.weight.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...bodyCellStyle, width: '18%' }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color:
                            (repo.totalScore || 0) > 0
                              ? 'text.primary'
                              : 'text.secondary',
                        }}
                      >
                        {(repo.totalScore || 0) > 0
                          ? Number(repo.totalScore || 0).toFixed(2)
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...bodyCellStyle, width: '15%' }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.75rem',
                          color:
                            (repo.totalPRs || 0) > 0
                              ? 'text.primary'
                              : 'text.secondary',
                        }}
                      >
                        {(repo.totalPRs || 0) > 0 ? repo.totalPRs : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...bodyCellStyle, width: '15%' }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.75rem',
                          color:
                            (repo.uniqueMiners?.size || 0) > 0
                              ? 'text.primary'
                              : 'text.secondary',
                        }}
                      >
                        {(repo.uniqueMiners?.size || 0) > 0
                          ? repo.uniqueMiners?.size
                          : '-'}
                      </Typography>
                    </TableCell>
                  </LinkTableRow>
                );
              })}
            {!filteredRepositories.length &&
              trimmedSearch &&
              isDirectRepoInput && (
                <TableRow hover>
                  <TableCell colSpan={6} sx={{ ...bodyCellStyle, py: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          color: 'text.secondary',
                        }}
                      >
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
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </TableContainer>
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
          '.MuiTablePagination-displayedRows': {
            fontFamily: '"JetBrains Mono", monospace',
          },
        }}
      />
    </Card>
  );
};

export default TopRepositoriesTable;

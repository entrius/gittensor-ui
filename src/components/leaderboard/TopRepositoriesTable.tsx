import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Stack,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ReactECharts from 'echarts-for-react';

interface RepoStats {
  repository: string;
  totalScore: number;
  totalPRs: number;
  uniqueMiners: Set<string>;
  weight: number;
  tier: string;
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
  onSelectRepository: (repositoryFullName: string) => void;
  initialTierFilter?: 'Gold' | 'Silver' | 'Bronze';
}

// Utility function to truncate text
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const TopRepositoriesTable: React.FC<TopRepositoriesTableProps> = ({
  repositories,
  isLoading,
  onSelectRepository,
  initialTierFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<SortColumn>('weight');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [tierFilter, setTierFilter] = useState<
    'all' | 'Gold' | 'Silver' | 'Bronze'
  >(initialTierFilter || 'all');
  const [useLogScale, setUseLogScale] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

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

    // Apply tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter((repo) => repo.tier === tierFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((repo) =>
        repo.repository?.toLowerCase().includes(lowerQuery),
      );
    }

    return filtered;
  }, [rankedRepositories, searchQuery, tierFilter]);

  const getChartOption = () => {
    const chartData = filteredRepositories.slice(0, 50); // Limit for performance
    const textColor = 'rgba(255, 255, 255, 0.85)';
    const gridColor = 'rgba(255, 255, 255, 0.08)';

    const getTierColorGradient = (tier: string) => {
      switch (tier) {
        case 'Gold':
          return {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 215, 0, 0.9)' },
              { offset: 0.5, color: 'rgba(255, 215, 0, 0.7)' },
              { offset: 1, color: 'rgba(255, 200, 0, 0.5)' },
            ],
          };
        case 'Silver':
          return {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(192, 192, 192, 0.9)' },
              { offset: 0.5, color: 'rgba(192, 192, 192, 0.7)' },
              { offset: 1, color: 'rgba(170, 170, 170, 0.5)' },
            ],
          };
        case 'Bronze':
          return {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(205, 127, 50, 0.9)' },
              { offset: 0.5, color: 'rgba(205, 127, 50, 0.7)' },
              { offset: 1, color: 'rgba(184, 115, 51, 0.5)' },
            ],
          };
        default:
          return {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(139, 148, 158, 0.8)' },
              { offset: 0.5, color: 'rgba(139, 148, 158, 0.6)' },
              { offset: 1, color: 'rgba(100, 108, 118, 0.4)' },
            ],
          };
      }
    };

    const xAxisData = chartData.map((item) => ({
      name: (item?.repository || '').split('/')[1] || item?.repository || '',
      fullName: item?.repository || '',
      tier: item?.tier || 'N/A',
    }));

    const seriesData = chartData.map((item, index) => ({
      value: Number(item?.totalScore) || 0,
      rank: item?.rank || index + 1,
      tier: item?.tier || 'N/A',
      repository: item?.repository || '',
      weight: item?.weight || 0,
      prs: item?.totalPRs || 0,
      contributors: item?.uniqueMiners?.size || 0,
      itemStyle: {
        color: getTierColorGradient(item?.tier || ''),
        borderRadius: [6, 6, 0, 0],
        shadowColor:
          item?.tier === 'Gold'
            ? 'rgba(255, 215, 0, 0.4)'
            : item?.tier === 'Silver'
              ? 'rgba(192, 192, 192, 0.3)'
              : item?.tier === 'Bronze'
                ? 'rgba(205, 127, 50, 0.3)'
                : 'rgba(100, 100, 100, 0.2)',
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
          color: '#ffffff',
          fontFamily: 'JetBrains Mono',
          fontSize: 18,
          fontWeight: 600,
        },
        subtextStyle: {
          color: 'rgba(255, 255, 255, 0.5)',
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
        },
        backgroundColor: 'rgba(15, 15, 18, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
        padding: [12, 16],
        formatter: (params: any) => {
          const data = params[0];
          const item = seriesData[data.dataIndex];
          const tierColor =
            item.tier === 'Gold'
              ? '#FFD700'
              : item.tier === 'Silver'
                ? '#C0C0C0'
                : item.tier === 'Bronze'
                  ? '#CD7F32'
                  : '#8b949e';

          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">
                #${item.rank} ${item.repository}
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="color: ${tierColor}; font-weight: 600;">${item.tier} Tier</span>
              </div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="color: rgba(255,255,255,0.7); margin-bottom: 4px;">Total Score: <span style="color: #fff; font-weight: 600;">${item.value.toFixed(2)}</span></div>
                <div style="color: rgba(255,255,255,0.7); margin-bottom: 4px;">Weight: <span style="color: #fff; font-weight: 600;">${item.weight.toFixed(2)}</span></div>
                <div style="color: rgba(255,255,255,0.7); margin-bottom: 4px;">Pull Requests: <span style="color: #fff; font-weight: 600;">${item.prs}</span></div>
                <div style="color: rgba(255,255,255,0.7);">Contributors: <span style="color: #fff; font-weight: 600;">${item.contributors}</span></div>
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
            color: 'rgba(255, 255, 255, 0.02)',
            borderRadius: [6, 6, 0, 0],
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 20,
              shadowColor: 'rgba(88, 166, 255, 0.5)',
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
    setPage(0);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column - set to desc by default (except for repository name)
      setSortColumn(column);
      setSortDirection(column === 'repository' ? 'asc' : 'desc');
    }
    setPage(0); // Reset to first page when sorting
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
    sx?: any;
  }) => (
    <TableCell
      align={align}
      sx={{
        ...headerCellStyle,
        ...(sx || {}),
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Gold':
        return '#FFD700';
      case 'Silver':
        return '#C0C0C0';
      case 'Bronze':
        return '#CD7F32';
      default:
        return '#8b949e';
    }
  };

  const tierCounts = useMemo(
    () => ({
      all: rankedRepositories.length,
      gold: rankedRepositories.filter((r) => r.tier === 'Gold').length,
      silver: rankedRepositories.filter((r) => r.tier === 'Silver').length,
      bronze: rankedRepositories.filter((r) => r.tier === 'Bronze').length,
    }),
    [rankedRepositories],
  );

  const TierFilterButton = ({
    label,
    value,
    count,
    color,
  }: {
    label: string;
    value: typeof tierFilter;
    count: number;
    color: string;
  }) => (
    <Button
      size="small"
      onClick={() => {
        setTierFilter(value);
        setPage(0);
      }}
      sx={{
        color: tierFilter === value ? '#fff' : 'rgba(255,255,255,0.5)',
        backgroundColor:
          tierFilter === value ? 'rgba(255,255,255,0.1)' : 'transparent',
        borderRadius: '6px',
        px: 2,
        minWidth: 'auto',
        textTransform: 'none',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.8rem',
        border:
          tierFilter === value ? `1px solid ${color}` : '1px solid transparent',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.15)',
        },
      }}
    >
      {label}{' '}
      <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.75rem' }}>
        {count}
      </span>
    </Button>
  );

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [rowsPerPage]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Card
      ref={cardRef}
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      elevation={0}
    >
      <Box
        sx={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
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
          <Stack direction="row" spacing={1}>
            <TierFilterButton
              label="All"
              value="all"
              count={tierCounts.all}
              color="#8b949e"
            />
            <TierFilterButton
              label="Gold"
              value="Gold"
              count={tierCounts.gold}
              color="#FFD700"
            />
            <TierFilterButton
              label="Silver"
              value="Silver"
              count={tierCounts.silver}
              color="#C0C0C0"
            />
            <TierFilterButton
              label="Bronze"
              value="Bronze"
              count={tierCounts.bronze}
              color="#CD7F32"
            />
          </Stack>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title={showChart ? 'Hide Chart' : 'Show Chart'}>
              <IconButton
                onClick={() => setShowChart(!showChart)}
                size="small"
                sx={{
                  color: showChart ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  padding: '6px',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
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
                        color: '#primary.main',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
                      color: 'rgba(255, 255, 255, 0.7)',
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
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: '"JetBrains Mono", monospace',
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
                    color: '#ffffff',
                    fontFamily: '"JetBrains Mono", monospace',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    fontSize: '0.8rem',
                    height: '36px',
                    borderRadius: 2,
                    minWidth: '80px',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
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
              placeholder="Search..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '1rem',
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: '200px',
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  fontSize: '0.8rem',
                  height: '36px',
                  borderRadius: 2,
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
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
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            height: '500px',
            backgroundColor: 'rgba(0,0,0,0.2)',
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
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
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
                const hasScore = (repo.totalScore || 0) > 0;
                return (
                  <TableRow
                    key={repo.repository}
                    hover
                    onClick={() => onSelectRepository(repo.repository || '')}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      },
                      transition: 'all 0.2s',
                      opacity: repo.inactiveAt ? 0.5 : 1,
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <TableCell sx={{ ...bodyCellStyle, width: '60px', pr: 0 }}>
                      {getRankIcon(repo.rank || 0)}
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
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            backgroundColor:
                              (repo.repository || '').split('/')[0] ===
                                'opentensor'
                                ? '#ffffff'
                                : (repo.repository || '').split('/')[0] ===
                                  'bitcoin'
                                  ? '#F7931A'
                                  : 'transparent',
                          }}
                        />
                        <Tooltip title={repo.repository || ''} placement="top">
                          <Typography
                            component="span"
                            sx={{
                              color: '#ffffff',
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
                        <Chip
                          variant="tier"
                          label={repo.tier || 'N/A'}
                          sx={{
                            ml: 1,
                            color: getTierColor(repo.tier),
                            borderColor: getTierColor(repo.tier),
                          }}
                        />
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
                          color: '#ffffff',
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
                          color: (repo.totalScore || 0) > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {(repo.totalScore || 0) > 0 ? Number(repo.totalScore || 0).toFixed(2) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...bodyCellStyle, width: '15%' }}
                    >
                      <Typography sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.75rem',
                        color: (repo.totalPRs || 0) > 0 ? '#fff' : 'rgba(255,255,255,0.3)'
                      }}>
                        {(repo.totalPRs || 0) > 0 ? repo.totalPRs : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...bodyCellStyle, width: '15%' }}
                    >
                      <Typography sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.75rem',
                        color: (repo.uniqueMiners?.size || 0) > 0 ? '#fff' : 'rgba(255,255,255,0.3)'
                      }}>
                        {(repo.uniqueMiners?.size || 0) > 0 ? repo.uniqueMiners?.size : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
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
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'rgba(255, 255, 255, 0.7)',
          '.MuiTablePagination-displayedRows': {
            fontFamily: '"JetBrains Mono", monospace',
          },
        }}
      />
    </Card >
  );
};

const headerCellStyle = {
  backgroundColor: 'rgba(18, 18, 20, 0.95)',
  backdropFilter: 'blur(8px)',
  color: '#ffffff',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  height: '48px',
  py: 1,
  boxSizing: 'border-box' as const,
};

const bodyCellStyle = {
  color: '#ffffff',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  fontSize: '0.75rem',
  py: 0.75,
  height: '52px',
  boxSizing: 'border-box' as const,
};

const getRankIcon = (rank: number) => (
  <Box
    sx={{
      backgroundColor: '#000000',
      borderRadius: '2px',
      width: '22px',
      height: '22px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      border: '1px solid',
      borderColor:
        rank === 1
          ? 'rgba(255, 215, 0, 0.4)'
          : rank === 2
            ? 'rgba(192, 192, 192, 0.4)'
            : rank === 3
              ? 'rgba(205, 127, 50, 0.4)'
              : 'rgba(255, 255, 255, 0.15)',
      boxShadow:
        rank === 1
          ? '0 0 12px rgba(255, 215, 0, 0.4), 0 0 4px rgba(255, 215, 0, 0.2)'
          : rank === 2
            ? '0 0 12px rgba(192, 192, 192, 0.4), 0 0 4px rgba(192, 192, 192, 0.2)'
            : rank === 3
              ? '0 0 12px rgba(205, 127, 50, 0.4), 0 0 4px rgba(205, 127, 50, 0.2)'
              : 'none',
    }}
  >
    <Typography
      component="span"
      sx={{
        color:
          rank === 1
            ? '#FFD700'
            : rank === 2
              ? '#C0C0C0'
              : rank === 3
                ? '#CD7F32'
                : 'rgba(255, 255, 255, 0.6)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.65rem',
        fontWeight: 600,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {rank}
    </Typography>
  </Box>
);

export default TopRepositoriesTable;

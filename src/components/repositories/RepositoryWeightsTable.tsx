import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  Stack,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  Chip,
  Button,
  IconButton,
  Collapse,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ReactECharts from 'echarts-for-react';
import { useReposAndWeights } from '../../api';
import dayjs from 'dayjs';

type SortField = 'owner' | 'name' | 'weight' | 'tier';
type SortOrder = 'asc' | 'desc';

const baseGithubUrl = 'https://github.com/';

const getTierColor = (tier: string): string => {
  switch (tier?.toLowerCase()) {
    case 'gold':
      return '#FFD700';
    case 'silver':
      return '#C0C0C0';
    case 'bronze':
      return '#CD7F32';
    default:
      return 'rgba(255, 255, 255, 0.4)';
  }
};

const getTierOrder = (tier: string): number => {
  switch (tier?.toLowerCase()) {
    case 'gold':
      return 3;
    case 'silver':
      return 2;
    case 'bronze':
      return 1;
    default:
      return 0;
  }
};

const AnimatedWeightBar = ({
  weight,
  maxWeight,
  tier,
}: {
  weight: number;
  maxWeight: number;
  tier: string;
}) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth((weight / maxWeight) * 100);
    }, 50);
    return () => clearTimeout(timer);
  }, [weight, maxWeight]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: `${width}%`,
          height: '100%',
          background:
            tier?.toLowerCase() === 'gold'
              ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.9), rgba(255, 200, 0, 0.5))'
              : tier?.toLowerCase() === 'silver'
                ? 'linear-gradient(90deg, rgba(192, 192, 192, 0.9), rgba(170, 170, 170, 0.5))'
                : tier?.toLowerCase() === 'bronze'
                  ? 'linear-gradient(90deg, rgba(205, 127, 50, 0.9), rgba(184, 115, 51, 0.5))'
                  : 'linear-gradient(90deg, rgba(139, 148, 158, 0.8), rgba(100, 108, 118, 0.4))',
          borderRadius: '2px',
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </Box>
  );
};

const RepositoryWeightsTable: React.FC = () => {
  const { data, isLoading } = useReposAndWeights();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('weight');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [tierFilter, setTierFilter] = useState<
    'all' | 'gold' | 'silver' | 'bronze'
  >('all');
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'weight' ? 'desc' : 'asc');
    }
    setPage(0);
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

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const filteredAndSortedRepos = useMemo(() => {
    if (!data) return [];

    const reposWithParts = data.map((repo) => {
      const [owner, name] = repo.fullName.split('/');
      return { ...repo, owner, name };
    });

    const filtered = reposWithParts.filter((repo) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        repo.owner.toLowerCase().includes(searchLower) ||
        repo.name.toLowerCase().includes(searchLower);

      const matchesTier =
        tierFilter === 'all' || repo.tier?.toLowerCase() === tierFilter;

      return matchesSearch && matchesTier;
    });

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortField === 'owner') {
        aValue = a.owner;
        bValue = b.owner;
      } else if (sortField === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (sortField === 'tier') {
        const aOrder = getTierOrder(a.tier);
        const bOrder = getTierOrder(b.tier);
        return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
      } else {
        aValue = a.weight;
        bValue = b.weight;
      }

      // For weight field, always parse as numbers
      if (sortField === 'weight') {
        const aNum = parseFloat(aValue as string);
        const bNum = parseFloat(bValue as string);
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // For string fields (owner, name), use localeCompare
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return filtered;
  }, [data, searchQuery, sortField, sortOrder, tierFilter]);

  const maxWeight = useMemo(() => {
    if (filteredAndSortedRepos.length === 0) return 1;
    const weights = filteredAndSortedRepos
      .map((r) => parseFloat(r.weight as string))
      .filter((w) => !isNaN(w));
    return weights.length > 0 ? Math.max(...weights) : 1;
  }, [filteredAndSortedRepos]);

  const tierCounts = useMemo(() => {
    if (!data) return { all: 0, gold: 0, silver: 0, bronze: 0 };
    return {
      all: data.length,
      gold: data.filter((r) => r.tier?.toLowerCase() === 'gold').length,
      silver: data.filter((r) => r.tier?.toLowerCase() === 'silver').length,
      bronze: data.filter((r) => r.tier?.toLowerCase() === 'bronze').length,
    };
  }, [data]);

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

  const getChartOption = () => {
    // Show all data to visualize the full spread
    const chartData = filteredAndSortedRepos;

    // Calculate min/max from the entire filtered set (the tier) to scale Y-axis correctly
    const weights = filteredAndSortedRepos
      .map((r) => parseFloat(r.weight as string))
      .filter((w) => !isNaN(w));

    const minWeight = weights.length > 0 ? Math.min(...weights) : 0;

    const textColor = 'rgba(255, 255, 255, 0.85)';
    const gridColor = 'rgba(255, 255, 255, 0.08)';

    const getTierColorGradient = (tier: string) => {
      switch (tier?.toLowerCase()) {
        case 'gold':
          return {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 215, 0, 0.9)' },
              { offset: 1, color: 'rgba(255, 200, 0, 0.5)' },
            ],
          };
        case 'silver':
          return {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(192, 192, 192, 0.9)' },
              { offset: 1, color: 'rgba(170, 170, 170, 0.5)' },
            ],
          };
        case 'bronze':
          return {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(205, 127, 50, 0.9)' },
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
              { offset: 1, color: 'rgba(100, 108, 118, 0.4)' },
            ],
          };
      }
    };

    const xAxisData = chartData.map((item) => item.name);

    const seriesData = chartData.map((item) => ({
      value: parseFloat(item.weight as string) || 0,
      name: item.name,
      fullName: item.fullName,
      owner: item.owner,
      tier: item.tier,
      itemStyle: {
        color: getTierColorGradient(item.tier),
        borderRadius: [4, 4, 0, 0],
      },
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Repository Weights Distribution',
        subtext: 'Weight distribution across repositories',
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
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 15, 18, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        textStyle: { color: '#fff', fontFamily: 'JetBrains Mono' },
        formatter: (params: any) => {
          const data = params[0]?.data;
          if (!data) return '';
          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <img 
                  src="https://avatars.githubusercontent.com/${data.owner}" 
                  style="width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background-color: ${data.owner === 'opentensor' ? '#ffffff' : data.owner === 'bitcoin' ? '#F7931A' : 'transparent'};"
                />
                <div style="font-weight: 600;">${data.fullName}</div>
              </div>
              <div style="margin-top: 4px;">Weight: <span style="font-weight: 600;">${data.value}</span></div>
              <div style="font-size: 0.8em; opacity: 0.8;">Tier: ${data.tier || 'N/A'}</div>
            </div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '10%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: {
          show: chartData.length < 50,
          color: textColor,
          fontFamily: 'JetBrains Mono',
          rotate: 45,
          interval: 0,
          formatter: (val: string) =>
            val.length > 15 ? `${val.slice(0, 12)}...` : val,
        },
        axisLine: { lineStyle: { color: gridColor } },
      },
      yAxis: {
        type: 'value',
        min: minWeight,
        max: maxWeight,
        name: 'Weight',
        nameTextStyle: { color: textColor, fontFamily: 'JetBrains Mono' },
        axisLabel: { color: textColor, fontFamily: 'JetBrains Mono' },
        splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      },
      series: [
        {
          data: seriesData,
          type: 'bar',
          barWidth: chartData.length > 50 ? '80%' : '60%',
          emphasis: { focus: 'series' },
          animationDuration: chartData.length > 100 ? 1000 : 1500,
          animationEasing: 'cubicOut',
          animationDelay: (idx: number) =>
            idx * (chartData.length > 100 ? 1 : 10),
        },
      ],
    };
  };

  const paginatedRepos = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedRepos.slice(startIndex, endIndex);
  }, [filteredAndSortedRepos, page, rowsPerPage]);

  // Scroll to top when rows per page changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [rowsPerPage]);

  return (
    <Box ref={containerRef}>
      <Box
        sx={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Contribute to any of these projects to gain score and earn emissions
          </Typography>
        </Box>

        <Box
          sx={{
            px: 2,
            pb: 2,
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
              value="gold"
              count={tierCounts.gold}
              color="#FFD700"
            />
            <TierFilterButton
              label="Silver"
              value="silver"
              count={tierCounts.silver}
              color="#C0C0C0"
            />
            <TierFilterButton
              label="Bronze"
              value="bronze"
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
                    '& .MuiSelect-select': {
                      py: 0.75,
                    },
                  }}
                >
                  <MenuItem value={5}>5</MenuItem>
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
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search
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
          {showChart && filteredAndSortedRepos.length > 0 && (
            <ReactECharts
              key={tierFilter}
              option={getChartOption()}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          )}
        </Box>
      </Collapse>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            backgroundColor: 'transparent',
            maxHeight: '800px',
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
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {!isMobile && (
                  <TableCell
                    sx={{
                      backgroundColor: 'rgba(18, 18, 20, 0.95)',
                      backdropFilter: 'blur(8px)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      height: '56px',
                      py: 1.5,
                      boxSizing: 'border-box',
                      width: '20%',
                    }}
                  >
                    <TableSortLabel
                      active={sortField === 'owner'}
                      direction={sortField === 'owner' ? sortOrder : 'asc'}
                      onClick={() => handleSort('owner')}
                      sx={{
                        '&:hover': {
                          color: 'secondary.main',
                        },
                        '&.Mui-active': {
                          color: 'secondary.main',
                        },
                      }}
                    >
                      <Typography variant="dataLabel">Owner</Typography>
                    </TableSortLabel>
                  </TableCell>
                )}
                <TableCell
                  sx={{
                    backgroundColor: 'rgba(18, 18, 20, 0.95)',
                    backdropFilter: 'blur(8px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    height: '56px',
                    py: 1.5,
                    boxSizing: 'border-box',
                    width: '40%',
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortOrder : 'asc'}
                    onClick={() => handleSort('name')}
                    sx={{
                      '&:hover': {
                        color: 'secondary.main',
                      },
                      '&.Mui-active': {
                        color: 'secondary.main',
                      },
                    }}
                  >
                    <Typography variant="dataLabel">Repository</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    backgroundColor: 'rgba(18, 18, 20, 0.95)',
                    backdropFilter: 'blur(8px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    height: '56px',
                    py: 1.5,
                    boxSizing: 'border-box',
                    width: '25%',
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'tier'}
                    direction={sortField === 'tier' ? sortOrder : 'desc'}
                    onClick={() => handleSort('tier')}
                    sx={{
                      '&:hover': {
                        color: 'secondary.main',
                      },
                      '&.Mui-active': {
                        color: 'secondary.main',
                      },
                    }}
                  >
                    <Typography variant="dataLabel">Tier</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    backgroundColor: 'rgba(18, 18, 20, 0.95)',
                    backdropFilter: 'blur(8px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    height: '56px',
                    py: 1.5,
                    boxSizing: 'border-box',
                    width: '15%',
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'weight'}
                    direction={sortField === 'weight' ? sortOrder : 'desc'}
                    onClick={() => handleSort('weight')}
                    sx={{
                      '&:hover': {
                        color: 'secondary.main',
                      },
                      '&.Mui-active': {
                        color: 'secondary.main',
                      },
                    }}
                  >
                    <Typography variant="dataLabel">Weight</Typography>
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRepos.map((repo) => {
                const isInactive =
                  repo.inactiveAt !== null && repo.inactiveAt !== undefined;
                const inactiveDate = isInactive
                  ? dayjs(repo.inactiveAt).format('DD/MM/YY hh:mm a')
                  : null;

                return (
                  <Tooltip
                    key={repo.fullName}
                    title={isInactive ? `Inactivated at: ${inactiveDate}` : ''}
                    arrow
                    placement="top"
                  >
                    <TableRow
                      hover
                      sx={{
                        backgroundColor: isInactive
                          ? 'rgba(211, 47, 47, 0.08)'
                          : 'inherit',
                        '&:hover': {
                          backgroundColor: isInactive
                            ? 'rgba(211, 47, 47, 0.12)'
                            : undefined,
                        },
                      }}
                    >
                      {!isMobile && (
                        <TableCell
                          sx={{
                            height: '60px',
                            py: 1,
                            boxSizing: 'border-box',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            <Tooltip
                              title={
                                repo.owner === 'opentensor'
                                  ? 'Official Opentensor Repository'
                                  : repo.owner === 'bitcoin'
                                    ? 'Official Bitcoin Repository'
                                    : repo.owner
                              }
                            >
                              <Avatar
                                src={`https://avatars.githubusercontent.com/${repo.owner}`}
                                alt={repo.owner}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  backgroundColor:
                                    repo.owner === 'opentensor'
                                      ? '#ffffff'
                                      : repo.owner === 'bitcoin'
                                        ? '#F7931A'
                                        : 'transparent',
                                  transition: 'transform 0.2s',
                                  '&:hover': {
                                    transform: 'scale(1.2)',
                                    zIndex: 1,
                                  },
                                  cursor: 'pointer',
                                }}
                              />
                            </Tooltip>
                            <Typography
                              variant="body1"
                              fontWeight="medium"
                              sx={{
                                color: isInactive
                                  ? 'error.dark'
                                  : 'text.primary',
                              }}
                            >
                              {repo.owner}
                            </Typography>
                          </Box>
                        </TableCell>
                      )}
                      <TableCell
                        sx={{
                          height: '60px',
                          py: 1,
                          boxSizing: 'border-box',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                          }}
                        >
                          {isMobile && (
                            <Tooltip
                              title={
                                repo.owner === 'opentensor'
                                  ? 'Official Opentensor Repository'
                                  : repo.owner === 'bitcoin'
                                    ? 'Official Bitcoin Repository'
                                    : repo.owner
                              }
                            >
                              <Avatar
                                src={`https://avatars.githubusercontent.com/${repo.owner}`}
                                alt={repo.owner}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  backgroundColor:
                                    repo.owner === 'opentensor'
                                      ? '#ffffff'
                                      : repo.owner === 'bitcoin'
                                        ? '#F7931A'
                                        : 'transparent',
                                  transition: 'transform 0.2s',
                                  '&:hover': {
                                    transform: 'scale(1.2)',
                                    zIndex: 1,
                                  },
                                  cursor: 'pointer',
                                }}
                              />
                            </Tooltip>
                          )}
                          <Stack>
                            <Typography
                              component={isMobile ? 'a' : 'span'}
                              variant="body1"
                              fontWeight="medium"
                              href={
                                isMobile
                                  ? `${baseGithubUrl}${repo.fullName}`
                                  : undefined
                              }
                              target={isMobile ? '_blank' : undefined}
                              rel={isMobile ? 'noopener noreferrer' : undefined}
                              sx={{
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: isMobile
                                    ? 'underline'
                                    : undefined,
                                },
                                color: isInactive
                                  ? 'error.dark'
                                  : 'text.primary',
                              }}
                            >
                              {isMobile ? repo.fullName : repo.name}
                            </Typography>
                            {!isMobile && (
                              <Typography
                                component="a"
                                href={`${baseGithubUrl}${repo.fullName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="body2"
                                sx={{
                                  color: isInactive
                                    ? 'rgba(211, 47, 47, 0.7)'
                                    : 'text.secondary',
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                {baseGithubUrl}
                                {repo.fullName}
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          height: '60px',
                          py: 1,
                          boxSizing: 'border-box',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                            width: '100%',
                          }}
                        >
                          <Chip
                            variant="tier"
                            label={repo.tier || '—'}
                            sx={{
                              color: getTierColor(repo.tier),
                              borderColor: getTierColor(repo.tier),
                            }}
                          />
                          {!isMobile && (
                            <AnimatedWeightBar
                              weight={parseFloat(repo.weight as string)}
                              maxWeight={maxWeight}
                              tier={repo.tier}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          height: '60px',
                          py: 1,
                          boxSizing: 'border-box',
                        }}
                      >
                        <Typography
                          variant="dataValue"
                          sx={{
                            color: isInactive ? 'error.dark' : 'text.primary',
                          }}
                        >
                          {repo.weight}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </Tooltip>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TablePagination
        rowsPerPageOptions={[]}
        component="div"
        count={filteredAndSortedRepos.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        showFirstButton
        showLastButton
        sx={{
          '.MuiTablePagination-displayedRows': {
            fontFamily: '"JetBrains Mono", monospace',
          },
        }}
      />

      {filteredAndSortedRepos.length === 0 && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>No repositories found!</Typography>
        </Box>
      )}
    </Box>
  );
};

export default RepositoryWeightsTable;

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
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ReactECharts from 'echarts-for-react';
import { type CommitLog } from '../../api/models/Dashboard';
import {
  getRepositoryOwnerAvatarBackground,
  headerCellStyle,
  bodyCellStyle,
} from './types';
import {
  formatUsdEstimate,
  getPrStatusCounts,
  isClosedUnmergedPr,
  isMergedPr,
  isOpenPr,
  truncateText,
} from '../../utils';
import { RankIcon } from './RankIcon';
import { STATUS_COLORS, UI_COLORS, scrollbarSx } from '../../theme';
import FilterButton from '../FilterButton';

interface TopPRsTableProps {
  prs: CommitLog[];
  isLoading?: boolean;
  onSelectPR: (repository: string, pullRequestNumber: number) => void;
  onSelectMiner: (githubId: string) => void;
  onSelectRepository: (repositoryFullName: string) => void;
}

const getPrStatusColor = (state: string) => {
  if (state === 'MERGED') return STATUS_COLORS.merged;
  if (state === 'OPEN') return STATUS_COLORS.open;
  if (state === 'CLOSED') return STATUS_COLORS.closed;
  return STATUS_COLORS.neutral;
};

const TopPRsTable: React.FC<TopPRsTableProps> = ({
  prs,
  isLoading,
  onSelectPR,
  onSelectMiner,
  onSelectRepository,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'open' | 'closed' | 'merged'
  >('all');
  const [useLogScale, setUseLogScale] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const rankedPRs = useMemo(
    () => prs.map((pr, index) => ({ ...pr, rank: index + 1 })),
    [prs],
  );

  const filteredPRs = useMemo(() => {
    let filtered = rankedPRs;

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'merged') filtered = filtered.filter(isMergedPr);
      else if (statusFilter === 'open') filtered = filtered.filter(isOpenPr);
      else if (statusFilter === 'closed')
        filtered = filtered.filter(isClosedUnmergedPr);
    }

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pr) =>
          pr.pullRequestTitle?.toLowerCase().includes(lowerQuery) ||
          pr.author?.toLowerCase().includes(lowerQuery) ||
          pr.repository?.toLowerCase().includes(lowerQuery),
      );
    }

    return filtered;
  }, [rankedPRs, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => getPrStatusCounts(rankedPRs), [rankedPRs]);

  const getChartOption = () => {
    const chartData = filteredPRs.slice(0, 50);

    const white = UI_COLORS.white;
    const borderSubtle = alpha(white, 0.08);
    const borderMedium = alpha(white, 0.2);
    const surfaceLight = alpha(white, 0.05);
    const textColor = alpha(white, 0.85);
    const tooltipBorderColor = alpha(white, 0.15);
    const tooltipLabelColor = alpha(white, 0.65);
    const primaryColor = UI_COLORS.white;

    const chartColor = UI_COLORS.primary;

    const xAxisData = chartData.map(
      (item) => `#${item?.pullRequestNumber || ''}`,
    );

    const stemData = chartData.map((item) => ({
      value: Number(parseFloat(item?.score || '0')),
      title: item?.pullRequestTitle || '',
      author: item?.author || '',
      repository: item?.repository || '',
      prNumber: item?.pullRequestNumber || 0,
      rank: item?.rank || 0,
    }));

    const dotData = stemData.map((item) => ({
      value: item.value,
      title: item.title,
      author: item.author,
      repository: item.repository,
      prNumber: item.prNumber,
      rank: item.rank,
      itemStyle: {
        color: chartColor,
        shadowBlur: 10,
        shadowColor: chartColor,
      },
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Pull Request Performance Ranking',
        subtext: 'Individual PR scores ranked by performance',
        left: 'center',
        top: 20,
        textStyle: {
          color: primaryColor,
          fontFamily: 'JetBrains Mono',
          fontSize: 18,
          fontWeight: 600,
        },
        subtextStyle: {
          color: alpha(white, 0.6),
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: surfaceLight,
          },
        },
        backgroundColor: UI_COLORS.surfaceTooltip,
        borderColor: borderMedium,
        borderWidth: 1,
        textStyle: {
          color: primaryColor,
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
        padding: [14, 18],
        formatter: (params: any) => {
          const data = params[0]?.data || params[1]?.data;
          if (!data) return '';

          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="font-weight: 700; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid ${tooltipBorderColor}; padding-bottom: 8px;">
                PR #${data.prNumber}
              </div>
              <div style="margin-bottom: 10px; color: ${textColor}; font-size: 11px; max-width: 300px; white-space: normal; word-break: break-word; line-height: 1.4;">
                ${data.title}
              </div>
              <div style="display: grid; gap: 6px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: ${tooltipLabelColor};">Rank:</span>
                  <span style="color: ${primaryColor}; font-weight: 600;">#${data.rank}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: ${tooltipLabelColor};">Score:</span>
                  <span style="color: ${primaryColor}; font-weight: 600;">${data.value.toFixed(4)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: ${tooltipLabelColor};">Author:</span>
                  <span style="color: ${primaryColor}; font-weight: 600;">${data.author}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: ${tooltipLabelColor};">Repository:</span>
                  <span style="color: ${primaryColor}; font-weight: 600;">${data.repository.split('/')[1] || data.repository}</span>
                </div>
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
        data: xAxisData,
        axisLabel: {
          color: textColor,
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
          interval: 0,
          rotate: 45,
          margin: 12,
        },
        axisLine: {
          lineStyle: {
            color: borderSubtle,
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
        name: 'PR Score',
        nameTextStyle: {
          color: textColor,
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
        axisLabel: {
          color: textColor,
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
          formatter: (value: number) => {
            // For small values in log scale, format appropriately
            if (value < 0.01) return value.toExponential(1);
            return value.toFixed(2);
          },
        },
        splitLine: {
          lineStyle: {
            color: borderSubtle,
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
          name: 'Stems',
          type: 'bar',
          data: dotData.map((item) => ({
            ...item,
            itemStyle: {
              color: chartColor,
              opacity: 0.4,
              borderRadius: [2, 2, 0, 0],
            },
          })),
          barWidth: 2,
          z: 1,
          animationDuration: 1000,
          animationEasing: 'cubicOut',
          animationDelay: (idx: number) => idx * 30,
        },
        {
          name: 'Dots',
          type: 'scatter',
          data: dotData,
          symbolSize: 14,
          z: 2,
          emphasis: {
            scale: 1.5,
            itemStyle: {
              shadowBlur: 20,
              borderColor: white,
              borderWidth: 2,
            },
          },
          animationDuration: 1000,
          animationEasing: 'cubicOut',
          animationDelay: (idx: number) => idx * 30 + 100,
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
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'border.light',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'text.primary',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1.1rem',
            fontWeight: 500,
          }}
        >
          Top Pull Requests{' '}
          <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>
            ({filteredPRs.length})
          </span>
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Tooltip title={showFilters ? 'Hide Filters' : 'Show Filters'}>
            <IconButton
              onClick={() => setShowFilters(!showFilters)}
              size="small"
              sx={{
                color: showFilters ? 'text.primary' : 'text.tertiary',
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
              <FilterListIcon fontSize="small" />
            </IconButton>
          </Tooltip>

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
                  setRowsPerPage(e.target.value as number);
                  setPage(0);
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
            placeholder="Search..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                '&:hover fieldset': { borderColor: 'border.medium' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
            }}
          />
        </Box>
      </Box>

      <Collapse in={showFilters}>
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'border.light',
            backgroundColor: 'surface.subtle',
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.tertiary',
                display: 'block',
                mb: 1,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              STATUS
            </Typography>
            <Stack direction="row" spacing={1}>
              <FilterButton
                label="All"
                isActive={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
                count={statusCounts.all}
                color={STATUS_COLORS.neutral}
              />
              <FilterButton
                label="Open"
                isActive={statusFilter === 'open'}
                onClick={() => setStatusFilter('open')}
                count={statusCounts.open}
                color={STATUS_COLORS.open}
              />
              <FilterButton
                label="Merged"
                isActive={statusFilter === 'merged'}
                onClick={() => setStatusFilter('merged')}
                count={statusCounts.merged}
                color={STATUS_COLORS.merged}
              />
              <FilterButton
                label="Closed"
                isActive={statusFilter === 'closed'}
                onClick={() => setStatusFilter('closed')}
                count={statusCounts.closed}
                color={STATUS_COLORS.closed}
              />
            </Stack>
          </Box>
        </Box>
      </Collapse>

      <Collapse in={showChart}>
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'border.light',
            height: '600px',
            backgroundColor: 'surface.subtle',
          }}
        >
          {showChart && filteredPRs.length > 0 && (
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
              <TableCell sx={{ ...headerCellStyle, width: '80px' }}>
                Rank
              </TableCell>
              <TableCell sx={{ ...headerCellStyle, width: '40%' }}>
                Pull Request
              </TableCell>
              <TableCell sx={{ ...headerCellStyle, width: '20%' }}>
                Author
              </TableCell>
              <TableCell sx={{ ...headerCellStyle, width: '20%' }}>
                Repository
              </TableCell>
              <TableCell sx={{ ...headerCellStyle, width: '10%' }}>
                Status
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  ...headerCellStyle,
                  color: 'secondary.main',
                  width: '15%',
                }}
              >
                Score
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPRs
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((pr) => (
                <TableRow
                  key={`${pr.repository}-${pr.pullRequestNumber}`}
                  hover
                  onClick={() =>
                    onSelectPR(pr.repository || '', pr.pullRequestNumber)
                  }
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'surface.light',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  <TableCell sx={{ ...bodyCellStyle, width: '80px' }}>
                    <RankIcon rank={pr.rank || 0} />
                  </TableCell>
                  <TableCell sx={{ ...bodyCellStyle, width: '40%' }}>
                    <Tooltip title={pr.pullRequestTitle || ''} placement="top">
                      <Typography
                        component="span"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 500,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          '&:hover': {
                            color: 'primary.main',
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {truncateText(pr.pullRequestTitle || '', 50)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ ...bodyCellStyle, width: '20%' }}>
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMiner(pr.githubId || pr.author || '');
                      }}
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
                        src={`https://avatars.githubusercontent.com/${pr.author}`}
                        sx={{ width: 20, height: 20 }}
                      />
                      <Tooltip title={pr.author || ''} placement="top">
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.85rem',
                            transition: 'color 0.2s',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            display: 'inline-block',
                          }}
                        >
                          {truncateText(pr.author || '', 20)}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...bodyCellStyle, width: '20%' }}>
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRepository(pr.repository || '');
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
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
                        src={`https://avatars.githubusercontent.com/${(pr.repository || '').split('/')[0]}`}
                        alt={(pr.repository || '').split('/')[0]}
                        sx={{
                          width: 20,
                          height: 20,
                          border: '1px solid',
                          borderColor: 'border.medium',
                          backgroundColor: getRepositoryOwnerAvatarBackground(
                            (pr.repository || '').split('/')[0],
                          ),
                        }}
                      />
                      <Tooltip title={pr.repository || ''} placement="top">
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
                          {truncateText(pr.repository || '', 30)}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...bodyCellStyle, width: '10%' }}>
                    {(() => {
                      const state =
                        pr.prState?.toUpperCase() ||
                        (pr.mergedAt ? 'MERGED' : 'OPEN');
                      const color = getPrStatusColor(state);

                      return (
                        <Chip
                          variant="status"
                          label={state}
                          sx={{
                            color,
                            borderColor: color,
                          }}
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellStyle, width: '15%' }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 0.25,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'text.primary',
                          lineHeight: 1.2,
                        }}
                      >
                        {parseFloat(pr.score || '0').toFixed(4)}
                      </Typography>
                      {(pr.prState === 'MERGED' || pr.mergedAt) &&
                        formatUsdEstimate(pr.predictedUsdPerDay, {
                          includeApproxPrefix: true,
                        }) && (
                          <Tooltip
                            title="This is an estimation. Actual payouts depend on validator consensus, network incentive distribution, and other miners' scores."
                            arrow
                            placement="bottom"
                            slotProps={{
                              tooltip: {
                                sx: {
                                  backgroundColor: 'surface.tooltip',
                                  color: 'text.primary',
                                  fontSize: '0.7rem',
                                  fontFamily: '"JetBrains Mono", monospace',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid',
                                  borderColor: 'border.subtle',
                                  boxShadow: 6,
                                },
                              },
                              arrow: {
                                sx: {
                                  color: 'surface.tooltip',
                                },
                              },
                            }}
                          >
                            <Typography
                              component="span"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '0.65rem',
                                fontWeight: 500,
                                color: 'status.success',
                                opacity: 0.7,
                                cursor: 'pointer',
                                lineHeight: 1,
                                transition: 'color 0.15s ease',
                                '&:hover': {
                                  opacity: 0.95,
                                },
                              }}
                            >
                              {formatUsdEstimate(pr.predictedUsdPerDay, {
                                includeApproxPrefix: true,
                              })}
                              /d
                            </Typography>
                          </Tooltip>
                        )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[]}
        component="div"
        count={filteredPRs.length}
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

export default TopPRsTable;

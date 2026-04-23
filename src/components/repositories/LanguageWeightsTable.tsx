import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  TablePagination,
  TextField,
  Typography,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Collapse,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import { Search, Check, Close } from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import { TEXT_OPACITY } from '../../theme';
import { useLanguagesAndWeights } from '../../api';
import { DataTable, type DataTableColumn } from '../common/DataTable';

type SortField = 'extension' | 'weight' | 'language';
type SortOrder = 'asc' | 'desc';

interface LanguageRow {
  extension: string;
  language: string | null;
  weight: string;
}

const LanguageWeightsTable: React.FC = () => {
  const theme = useTheme();
  const { data: languages, isLoading } = useLanguagesAndWeights();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('weight');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  const filteredAndSortedLanguages = useMemo<LanguageRow[]>(() => {
    if (!languages) return [];

    const filtered = languages.filter((lang) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        lang.extension.toLowerCase().includes(searchLower) ||
        (lang.language && lang.language.toLowerCase().includes(searchLower))
      );
    });

    filtered.sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      if (sortField === 'extension') {
        aValue = a.extension;
        bValue = b.extension;
      } else if (sortField === 'language') {
        aValue = a.language || '';
        bValue = b.language || '';
      } else {
        aValue = a.weight;
        bValue = b.weight;
      }

      if (sortField === 'weight') {
        return sortOrder === 'asc'
          ? parseFloat(aValue as string) - parseFloat(bValue as string)
          : parseFloat(bValue as string) - parseFloat(aValue as string);
      }

      return sortOrder === 'asc'
        ? (aValue as string).localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue as string);
    });

    return filtered;
  }, [languages, searchQuery, sortField, sortOrder]);

  const paginatedLanguages = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedLanguages.slice(startIndex, endIndex);
  }, [filteredAndSortedLanguages, page, rowsPerPage]);

  const chartOption = useMemo(() => {
    const chartData = filteredAndSortedLanguages;
    const textColor = alpha(theme.palette.common.white, 0.85);
    const gridColor = theme.palette.border.subtle;

    const xAxisData = chartData.map((item) => item.extension);
    const seriesData = chartData.map((item) => {
      const val = parseFloat(item.weight as string);
      return isNaN(val) ? 0 : val;
    });

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Language Weight Distribution',
        subtext: 'All languages by weight',
        left: 'center',
        top: 20,
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: 18,
          fontWeight: 600,
        },
        subtextStyle: {
          color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
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
          color: textColor,
          rotate: 45,
          interval: 0,
        },
        axisLine: { lineStyle: { color: gridColor } },
      },
      yAxis: {
        type: 'value',
        name: 'Weight',
        splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      },
      series: [
        {
          data: seriesData,
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
  }, [filteredAndSortedLanguages, theme]);

  // Scroll to top when rows per page changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [rowsPerPage]);

  const columns = useMemo<DataTableColumn<LanguageRow, SortField>[]>(
    () => [
      {
        key: 'extension',
        header: 'Extension',
        sortKey: 'extension',
        renderCell: (lang) => lang.extension,
      },
      {
        key: 'language',
        header: 'Language',
        sortKey: 'language',
        cellSx: (lang) => ({
          color: lang.language ? 'text.primary' : 'text.disabled',
        }),
        renderCell: (lang) => lang.language || '-',
      },
      {
        key: 'tokenScoring',
        header: (
          <Tooltip title="Indicates if this extension supports token-based scoring. Token scoring uses AST parsing for more accurate contribution measurement.">
            <span>Token Scoring</span>
          </Tooltip>
        ),
        align: 'center',
        renderCell: (lang) =>
          lang.language ? (
            <Check
              sx={{
                color: theme.palette.status.success,
                fontSize: '1.2rem',
              }}
            />
          ) : (
            <Close
              sx={{
                color: theme.palette.status.error,
                fontSize: '1.2rem',
              }}
            />
          ),
      },
      {
        key: 'weight',
        header: 'Weight',
        align: 'right',
        sortKey: 'weight',
        renderCell: (lang) => lang.weight,
      },
    ],
    [theme.palette.status.success, theme.palette.status.error],
  );

  return (
    <Box ref={containerRef}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Programming language multipliers used in scoring calculations
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                      color: alpha(
                        theme.palette.common.white,
                        TEXT_OPACITY.muted,
                      ),
                      fontSize: '1rem',
                    }}
                  />
                </InputAdornment>
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
                '&:hover fieldset': {
                  borderColor: theme.palette.border.medium,
                },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
            }}
          />
        </Box>
      </Box>

      <Collapse in={showChart}>
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.border.light}`,
            height: '500px',
            backgroundColor: alpha(theme.palette.common.black, 0.2),
          }}
        >
          {showChart && filteredAndSortedLanguages.length > 0 && (
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
            />
          )}
        </Box>
      </Collapse>

      <Box
        sx={{
          maxHeight: '800px',
          overflowY: 'auto',
          backgroundColor: 'transparent',
        }}
      >
        <DataTable<LanguageRow, SortField>
          columns={columns}
          rows={paginatedLanguages}
          getRowKey={(lang) => lang.extension}
          isLoading={isLoading}
          stickyHeader
          emptyState={
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>No languages found!</Typography>
            </Box>
          }
          sort={{
            field: sortField,
            order: sortOrder,
            onChange: handleSort,
          }}
        />
      </Box>

      <TablePagination
        rowsPerPageOptions={[]}
        component="div"
        count={filteredAndSortedLanguages.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        showFirstButton
        showLastButton
        sx={{
          '.MuiTablePagination-displayedRows': {},
        }}
      />
    </Box>
  );
};

export default LanguageWeightsTable;

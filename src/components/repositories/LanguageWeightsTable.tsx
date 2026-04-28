import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Grid,
  IconButton,
  InputAdornment,
  Collapse,
  FormControl,
  MenuItem,
  Select,
  Skeleton,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Search, Check, Close } from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { TEXT_OPACITY, scrollbarSx } from '../../theme';
import { useLanguagesAndWeights } from '../../api';
import {
  echartsAxisTooltipChrome,
  echartsBarChartTitle,
  echartsFontFamily,
  echartsGridBarWithTitle,
  echartsStrongAxisLabelColor,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { LanguageCard, type LanguageRow } from './LanguageCard';

type SortField = 'extension' | 'weight' | 'language';
type SortOrder = 'asc' | 'desc';
type LangViewMode = 'cards' | 'list';

const LANG_CARD_SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'weight', label: 'Weight' },
  { value: 'extension', label: 'Extension' },
  { value: 'language', label: 'Language' },
];

const LANG_VIEW_STORAGE_KEY = 'languages:viewMode';
const LANG_LIST_ROWS = [5, 10, 25, 50] as const;
const LANG_CARD_ROWS = [12, 24, 48] as const;
const LANG_DEFAULT_LIST_ROWS = 10;
const LANG_DEFAULT_CARD_ROWS = 12;

const readStoredLangViewMode = (): LangViewMode => {
  try {
    return window.localStorage.getItem(LANG_VIEW_STORAGE_KEY) === 'cards'
      ? 'cards'
      : 'list';
  } catch {
    return 'list';
  }
};

interface ViewModeToggleProps {
  viewMode: LangViewMode;
  onChange: (mode: LangViewMode) => void;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
}) => {
  const options: {
    value: LangViewMode;
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

const LanguageWeightsTable: React.FC = () => {
  const theme = useTheme();
  const { data: languages, isLoading } = useLanguagesAndWeights();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('weight');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<LangViewMode>(
    readStoredLangViewMode,
  );
  const [rowsPerPage, setRowsPerPage] = useState(
    readStoredLangViewMode() === 'cards'
      ? LANG_DEFAULT_CARD_ROWS
      : LANG_DEFAULT_LIST_ROWS,
  );
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

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleViewModeChange = (mode: LangViewMode) => {
    try {
      localStorage.setItem(LANG_VIEW_STORAGE_KEY, mode);
    } catch {}
    setViewMode(mode);
    const cardRows = LANG_CARD_ROWS as readonly number[];
    const listRows = LANG_LIST_ROWS as readonly number[];
    if (mode === 'cards' && !cardRows.includes(rowsPerPage)) {
      setRowsPerPage(LANG_DEFAULT_CARD_ROWS);
      setPage(0);
    } else if (mode === 'list' && !listRows.includes(rowsPerPage)) {
      setRowsPerPage(LANG_DEFAULT_LIST_ROWS);
      setPage(0);
    }
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
    return filteredAndSortedLanguages.slice(
      startIndex,
      startIndex + rowsPerPage,
    );
  }, [filteredAndSortedLanguages, page, rowsPerPage]);

  const maxWeight = useMemo(
    () =>
      filteredAndSortedLanguages.reduce(
        (m, l) => Math.max(m, parseFloat(l.weight) || 0),
        0,
      ),
    [filteredAndSortedLanguages],
  );

  const chartOption = useMemo(() => {
    const chartData = paginatedLanguages;
    const textColor = echartsStrongAxisLabelColor(theme);
    const gridColor = theme.palette.border.subtle;
    const font = echartsFontFamily(theme);

    const xAxisData = chartData.map((item) => item.extension);
    const seriesData = chartData.map((item) => {
      const val = parseFloat(item.weight as string);
      return isNaN(val) ? 0 : val;
    });

    return {
      ...echartsTransparentBackground(),
      title: echartsBarChartTitle(
        theme,
        'Language Weight Distribution',
        'Values match the current table sort and page',
      ),
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...echartsAxisTooltipChrome(theme),
      },
      grid: echartsGridBarWithTitle(),
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: {
          color: textColor,
          fontFamily: font,
          rotate: 45,
          interval: 0,
        },
        axisLine: { lineStyle: { color: gridColor } },
      },
      yAxis: {
        type: 'value',
        name: 'Weight',
        nameTextStyle: { color: textColor, fontFamily: font },
        axisLabel: { color: textColor, fontFamily: font },
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
  }, [paginatedLanguages, theme]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [rowsPerPage]);

  const sortLabelHeaderSx = {
    '& .MuiTableSortLabel-root:hover': { color: 'secondary.main' },
    '& .MuiTableSortLabel-root.Mui-active': { color: 'secondary.main' },
    '& .MuiTableSortLabel-root.Mui-active .MuiTableSortLabel-icon': {
      color: 'secondary.main',
    },
  } as const;

  const columns = useMemo<DataTableColumn<LanguageRow, SortField>[]>(
    () => [
      {
        key: 'extension',
        header: 'Extension',
        sortKey: 'extension',
        headerSx: sortLabelHeaderSx,
        renderCell: (lang) => lang.extension,
      },
      {
        key: 'language',
        header: 'Language',
        sortKey: 'language',
        headerSx: sortLabelHeaderSx,
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
              sx={{ color: theme.palette.status.success, fontSize: '1.2rem' }}
            />
          ) : (
            <Close
              sx={{ color: theme.palette.status.error, fontSize: '1.2rem' }}
            />
          ),
      },
      {
        key: 'weight',
        header: 'Weight',
        align: 'right',
        sortKey: 'weight',
        headerSx: sortLabelHeaderSx,
        renderCell: (lang) => lang.weight,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme.palette.status.success, theme.palette.status.error],
  );

  const validRows = viewMode === 'cards' ? LANG_CARD_ROWS : LANG_LIST_ROWS;

  const pagination = (
    <TablePagination
      rowsPerPageOptions={[]}
      component="div"
      count={filteredAndSortedLanguages.length}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={handleChangePage}
      onRowsPerPageChange={() => {}}
      showFirstButton
      showLastButton
    />
  );

  return (
    <Box ref={containerRef}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: viewMode === 'cards' ? 0 : 3,
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

          <ViewModeToggle viewMode={viewMode} onChange={handleViewModeChange} />
        </Box>
      </Box>

      {/* Sort controls (card view only) */}
      {viewMode === 'cards' && (
        <Box
          sx={{
            mt: 1,
            mb: 3,
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
            value={sortField}
            onChange={(e) => handleSort(e.target.value as SortField)}
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
            {LANG_CARD_SORT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          <Tooltip title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}>
            <IconButton
              onClick={() => handleSort(sortField)}
              size="small"
              aria-label={
                sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'
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
              {sortOrder === 'asc' ? (
                <ArrowUpwardIcon fontSize="small" />
              ) : (
                <ArrowDownwardIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Collapse in={showChart}>
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.border.light}`,
            height: '500px',
            backgroundColor: alpha(theme.palette.common.black, 0.2),
          }}
        >
          {showChart && paginatedLanguages.length > 0 && (
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
            />
          )}
        </Box>
      </Collapse>

      {isLoading ? (
        viewMode === 'cards' ? (
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {Array.from({ length: LANG_DEFAULT_CARD_ROWS }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton
                  variant="rounded"
                  height={140}
                  sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.06) }}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={48}
                sx={{ mb: 1, borderRadius: 1 }}
              />
            ))}
          </Box>
        )
      ) : viewMode === 'cards' ? (
        <>
          {paginatedLanguages.length > 0 ? (
            <Grid container spacing={2}>
              {paginatedLanguages.map((lang) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={lang.extension}>
                  <LanguageCard lang={lang} maxWeight={maxWeight} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>No languages found!</Typography>
            </Box>
          )}
          {pagination}
        </>
      ) : (
        <>
          <Box
            sx={{
              maxHeight: '800px',
              overflowY: 'auto',
              backgroundColor: 'transparent',
              ...scrollbarSx,
            }}
          >
            <DataTable<LanguageRow, SortField>
              columns={columns}
              rows={paginatedLanguages}
              getRowKey={(lang) => lang.extension}
              isLoading={false}
              stickyHeader
              emptyState={null}
              getRowSx={() => ({
                '&:hover': { backgroundColor: 'action.hover' },
              })}
              sort={{
                field: sortField,
                order: sortOrder,
                onChange: handleSort,
              }}
            />
          </Box>
          {pagination}
          {filteredAndSortedLanguages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>No languages found!</Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default LanguageWeightsTable;

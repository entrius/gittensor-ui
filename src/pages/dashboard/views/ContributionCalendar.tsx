import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  CONTRIBUTION_HEATMAP_SCALE,
  TEXT_OPACITY,
  scrollbarSx,
} from '../../../theme';
import { pluralize } from '../../../utils/format';
import { type DashboardContributionCalendar } from '../dashboardData';

interface ContributionCalendarProps {
  calendar: DashboardContributionCalendar;
  isLoading?: boolean;
  onMonthChange?: (month: string) => void;
}

const HEATMAP_EMPTY_COLOR = '#161b22';
const HEATMAP_LOW_COLOR = '#0e4429';
const HEATMAP_HIGH_COLOR = '#39d353';
const HOUR_LABELS = new Set([0, 6, 12, 18, 23]);

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '');
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
};

const toHex = (value: number): string =>
  Math.round(value).toString(16).padStart(2, '0');

const mixHex = (from: string, to: string, amount: number): string => {
  const [fr, fg, fb] = hexToRgb(from);
  const [tr, tg, tb] = hexToRgb(to);
  const clamped = Math.max(0, Math.min(1, amount));
  return `#${toHex(fr + (tr - fr) * clamped)}${toHex(
    fg + (tg - fg) * clamped,
  )}${toHex(fb + (tb - fb) * clamped)}`;
};

const parseMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, monthIndex: month - 1 };
};

const formatMonthLabel = (monthKey: string, compact = false) => {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: compact ? 'short' : 'long',
    year: 'numeric',
  });
};

const formatHourTooltip = (timestamp: string, count: number) => {
  const [dateKey, hourKey] = timestamp.split('T');
  return `${pluralize(count, 'contribution')} during ${dateKey} ${hourKey}:00`;
};

const formatTooltipDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatHourWindow = (hour: number) =>
  `${String(hour).padStart(2, '0')}:00 - ${String((hour + 1) % 24).padStart(
    2,
    '0',
  )}:00`;

const getHourEndMs = (dateKey: string, hour: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, hour + 1).getTime();
};

const HeatmapTooltipTitle: React.FC<{
  date: string;
  hour: number;
  count: number;
}> = ({ date, hour, count }) => {
  const theme = useTheme();
  const hasActivity = count > 0;

  return (
    <Box sx={{ minWidth: 168 }}>
      <Typography
        sx={{
          color: theme.palette.text.primary,
          fontFamily: theme.typography.fontFamily,
          fontSize: '0.72rem',
          fontWeight: 700,
          lineHeight: 1.25,
        }}
      >
        {formatTooltipDate(date)}
      </Typography>
      <Typography
        sx={{
          mt: 0.35,
          color: alpha(theme.palette.text.primary, TEXT_OPACITY.secondary),
          fontFamily: theme.typography.fontFamily,
          fontSize: '0.64rem',
          lineHeight: 1.25,
        }}
      >
        {formatHourWindow(hour)}
      </Typography>
      <Box
        sx={{
          mt: 0.8,
          pt: 0.7,
          borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
        }}
      >
        <Typography
          sx={{
            color: hasActivity
              ? theme.palette.status.success
              : alpha(theme.palette.text.primary, TEXT_OPACITY.tertiary),
            fontFamily: theme.typography.fontFamily,
            fontSize: '0.72rem',
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          {pluralize(count, 'contribution')}
        </Typography>
      </Box>
    </Box>
  );
};

const ContributionCalendarLegend: React.FC = () => {
  const theme = useTheme();
  const monoFontFamily = theme.typography.fontFamily;
  const legendColor = alpha(theme.palette.text.primary, TEXT_OPACITY.tertiary);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      spacing={0.5}
      useFlexGap
      flexWrap="wrap"
    >
      <Typography
        component="span"
        sx={{
          fontFamily: monoFontFamily,
          fontSize: { xs: '0.62rem', sm: '0.65rem' },
          color: legendColor,
        }}
      >
        Less
      </Typography>
      {CONTRIBUTION_HEATMAP_SCALE.map((color) => (
        <Box
          key={color}
          sx={{
            width: { xs: 9, sm: 10 },
            height: { xs: 9, sm: 10 },
            borderRadius: '2px',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
      ))}
      <Typography
        component="span"
        sx={{
          fontFamily: monoFontFamily,
          fontSize: { xs: '0.62rem', sm: '0.65rem' },
          color: legendColor,
        }}
      >
        More
      </Typography>
    </Stack>
  );
};

const ContributionCalendar: React.FC<ContributionCalendarProps> = ({
  calendar,
  isLoading = false,
  onMonthChange,
}) => {
  const theme = useTheme();
  const monoFontFamily = theme.typography.fontFamily;
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [heatmapWidth, setHeatmapWidth] = useState(0);
  const currentMs = Date.now();

  const isEmpty = calendar.hours.every((hour) => hour.count === 0);
  const peakContributionCount = useMemo(
    () => Math.max(0, ...calendar.hours.map((hour) => hour.count)),
    [calendar.hours],
  );

  const monthDays = useMemo(
    () => Array.from(new Set(calendar.hours.map((hour) => hour.date))).sort(),
    [calendar.hours],
  );
  const concludedMonthDays = useMemo(
    () => monthDays.filter((dateKey) => getHourEndMs(dateKey, 0) <= currentMs),
    [currentMs, monthDays],
  );
  const timelineMonths = useMemo(
    () => [...calendar.availableMonths].reverse(),
    [calendar.availableMonths],
  );
  const hourMap = useMemo(
    () => new Map(calendar.hours.map((hour) => [hour.timestamp, hour])),
    [calendar.hours],
  );
  const blockSize = isMobile ? 7 : 10;
  const blockGap = isMobile ? 3 : 3;
  const labelColumnWidth = isMobile ? 28 : 34;
  const baseHeatmapCellStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'block',
      width: blockSize,
      height: blockSize,
      borderRadius: 2,
    }),
    [blockSize],
  );
  const hiddenHeatmapCellStyle = useMemo<React.CSSProperties>(
    () => ({
      ...baseHeatmapCellStyle,
      visibility: 'hidden',
    }),
    [baseHeatmapCellStyle],
  );
  const visibleDayCapacity = useMemo(() => {
    if (heatmapWidth <= labelColumnWidth) return concludedMonthDays.length;
    return Math.max(
      1,
      Math.floor((heatmapWidth - labelColumnWidth) / (blockSize + blockGap)),
    );
  }, [
    blockGap,
    blockSize,
    concludedMonthDays.length,
    heatmapWidth,
    labelColumnWidth,
  ]);
  const visibleMonthDays = useMemo(
    () =>
      concludedMonthDays.slice(
        Math.max(0, concludedMonthDays.length - visibleDayCapacity),
      ),
    [concludedMonthDays, visibleDayCapacity],
  );

  const getHeatmapBlockColor = useCallback(
    (count: number) => {
      if (count <= 0) return HEATMAP_EMPTY_COLOR;
      if (peakContributionCount <= 1) return HEATMAP_HIGH_COLOR;

      const intensity = Math.log1p(count) / Math.log1p(peakContributionCount);
      return mixHex(HEATMAP_LOW_COLOR, HEATMAP_HIGH_COLOR, intensity);
    },
    [peakContributionCount],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isEmpty || isLoading) return;
    el.scrollLeft = el.scrollWidth;
  }, [calendar.hours, isEmpty, isLoading]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateWidth = () => setHeatmapWidth(el.clientWidth);
    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rangeTrendPositive =
    calendar.rangeOverRangePercent !== null &&
    calendar.rangeOverRangePercent >= 0;
  const rangeTrendColor =
    calendar.rangeOverRangePercent === null
      ? alpha(theme.palette.text.primary, TEXT_OPACITY.muted)
      : rangeTrendPositive
        ? theme.palette.status.success
        : theme.palette.status.closed;
  const rangeDeltaLabel =
    calendar.rangeOverRangePercent === null
      ? 'n/a'
      : `${calendar.rangeOverRangePercent >= 0 ? '+' : ''}${Math.round(
          calendar.rangeOverRangePercent,
        )}%`;
  const showRangeComparison = calendar.rangeOverRangePercent !== null;
  const monthTrendPositive =
    calendar.monthOverMonthPercent !== null &&
    calendar.monthOverMonthPercent >= 0;
  const monthTrendColor =
    calendar.monthOverMonthPercent === null
      ? alpha(theme.palette.text.primary, TEXT_OPACITY.muted)
      : monthTrendPositive
        ? theme.palette.status.success
        : theme.palette.status.closed;
  const monthDeltaLabel =
    calendar.monthOverMonthPercent === null
      ? 'n/a'
      : `${calendar.monthOverMonthPercent >= 0 ? '+' : ''}${Math.round(
          calendar.monthOverMonthPercent,
        )}%`;
  const showMonthComparison = calendar.monthOverMonthPercent !== null;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        mt: 1.35,
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          mb: 1.1,
          color: theme.palette.text.primary,
          fontSize: { xs: '1.02rem', sm: '1.1rem' },
          fontWeight: 700,
        }}
      >
        Contribution Calendar
      </Typography>

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: 'transparent',
          maxWidth: '100%',
        }}
      >
        <CardContent
          sx={{
            p: { xs: 1.35, sm: 1.5 },
            '&:last-child': { pb: { xs: 1.35, sm: 1.5 } },
            minWidth: 0,
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                minHeight: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {timelineMonths.length > 0 && (
                  <Box
                    sx={{
                      mb: 1.1,
                      maxWidth: '100%',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      pb: 0.35,
                      ...scrollbarSx,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{
                        position: 'relative',
                        width: 'max-content',
                        minWidth: 'max-content',
                        alignItems: 'center',
                        px: 0.15,
                        py: 0.25,
                      }}
                    >
                      {timelineMonths.map((month) => {
                        const isSelected = month === calendar.selectedMonth;
                        return (
                          <Box
                            key={month}
                            component="button"
                            type="button"
                            onClick={() => onMonthChange?.(month)}
                            disabled={isSelected}
                            aria-pressed={isSelected}
                            aria-label={`Show ${formatMonthLabel(month)}`}
                            sx={{
                              // No border or fill: the selected month is
                              // marked by its text turning green, matching
                              // the other dashboard controls.
                              appearance: 'none',
                              position: 'relative',
                              zIndex: 1,
                              border: 0,
                              borderRadius: 999,
                              px: 0.6,
                              py: 0.55,
                              backgroundColor: 'transparent',
                              color: isSelected
                                ? theme.palette.status.success
                                : alpha(
                                    theme.palette.text.primary,
                                    TEXT_OPACITY.secondary,
                                  ),
                              cursor: isSelected ? 'default' : 'pointer',
                              fontFamily: monoFontFamily,
                              fontSize: { xs: '0.64rem', sm: '0.68rem' },
                              fontWeight: isSelected ? 700 : 600,
                              lineHeight: 1.1,
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              transition: 'color 120ms ease',
                              '&:hover': {
                                color: isSelected
                                  ? theme.palette.status.success
                                  : theme.palette.text.primary,
                              },
                              '&:disabled': {
                                opacity: 1,
                              },
                            }}
                          >
                            {formatMonthLabel(month, true)}
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
                <Box
                  ref={scrollRef}
                  sx={{
                    width: '100%',
                    maxWidth: '100%',
                    overflowX: 'hidden',
                    overflowY: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-x',
                    pb: 0.5,
                    ...scrollbarSx,
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: `${labelColumnWidth}px repeat(${visibleMonthDays.length}, ${blockSize}px)`,
                      gridAutoRows: `${blockSize}px`,
                      gap: `${blockGap}px`,
                      width: 'max-content',
                      minWidth: 'max-content',
                      alignItems: 'center',
                    }}
                  >
                    <Box />
                    {visibleMonthDays.map((dateKey, index) => {
                      const [year, month, day] = dateKey.split('-').map(Number);
                      const isMonthStart = day === 1 || index === 0;
                      const showLabel = isMonthStart || day === 15;
                      return (
                        <Typography
                          key={dateKey}
                          component="span"
                          sx={{
                            color: alpha(
                              theme.palette.text.primary,
                              showLabel
                                ? TEXT_OPACITY.tertiary
                                : TEXT_OPACITY.ghost,
                            ),
                            fontFamily: monoFontFamily,
                            fontSize: { xs: '0.55rem', sm: '0.6rem' },
                            lineHeight: 1,
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            visibility: showLabel ? 'visible' : 'hidden',
                          }}
                        >
                          {isMonthStart
                            ? new Date(year, month - 1, day).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                },
                              )
                            : day}
                        </Typography>
                      );
                    })}
                    {Array.from({ length: 24 }, (_, hour) => (
                      <React.Fragment key={hour}>
                        <Typography
                          component="span"
                          sx={{
                            color: alpha(
                              theme.palette.text.primary,
                              HOUR_LABELS.has(hour)
                                ? TEXT_OPACITY.tertiary
                                : TEXT_OPACITY.ghost,
                            ),
                            fontFamily: monoFontFamily,
                            fontSize: { xs: '0.52rem', sm: '0.58rem' },
                            lineHeight: 1,
                            textAlign: 'right',
                            visibility: HOUR_LABELS.has(hour)
                              ? 'visible'
                              : 'hidden',
                          }}
                        >
                          {String(hour).padStart(2, '0')}
                        </Typography>
                        {visibleMonthDays.map((dateKey) => {
                          const timestamp = `${dateKey}T${String(hour).padStart(
                            2,
                            '0',
                          )}`;
                          const isConcluded =
                            getHourEndMs(dateKey, hour) <= currentMs;
                          if (!isConcluded) {
                            return (
                              <span
                                key={timestamp}
                                aria-hidden="true"
                                style={hiddenHeatmapCellStyle}
                              />
                            );
                          }
                          const bucket = hourMap.get(timestamp);
                          const count = bucket?.count ?? 0;
                          const label = formatHourTooltip(timestamp, count);
                          const blockStyle: React.CSSProperties = {
                            ...baseHeatmapCellStyle,
                            backgroundColor: getHeatmapBlockColor(count),
                            boxShadow:
                              count > 0
                                ? `0 0 0 1px ${alpha(
                                    theme.palette.common.white,
                                    0.02,
                                  )} inset`
                                : `0 0 0 1px ${alpha(
                                    theme.palette.common.white,
                                    0.025,
                                  )} inset`,
                            cursor: count > 0 ? 'default' : 'initial',
                          };

                          if (count <= 0) {
                            return (
                              <span
                                key={timestamp}
                                aria-label={label}
                                style={blockStyle}
                              />
                            );
                          }

                          return (
                            <Tooltip
                              key={timestamp}
                              title={
                                <HeatmapTooltipTitle
                                  date={dateKey}
                                  hour={hour}
                                  count={count}
                                />
                              }
                              arrow
                              disableInteractive
                              enterDelay={120}
                              enterNextDelay={40}
                              placement="top"
                            >
                              <span aria-label={label} style={blockStyle} />
                            </Tooltip>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </Box>
                </Box>
                <Box
                  sx={{
                    mt: 1,
                    pt: 1,
                    borderTop: `1px solid ${theme.palette.border.light}`,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: monoFontFamily,
                      fontSize: { xs: '0.62rem', sm: '0.65rem' },
                      color: alpha(
                        theme.palette.text.primary,
                        TEXT_OPACITY.muted,
                      ),
                      lineHeight: 1.35,
                    }}
                  >
                    {calendar.rangeCount.toLocaleString()} contribution
                    {calendar.rangeCount === 1 ? '' : 's'} in{' '}
                    {calendar.rangeLabel}
                    {showRangeComparison && (
                      <>
                        <Box
                          component="span"
                          sx={{
                            mx: 0.85,
                            color: alpha(
                              theme.palette.text.primary,
                              TEXT_OPACITY.ghost,
                            ),
                          }}
                        >
                          /
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            color: rangeTrendColor,
                            fontWeight: 700,
                          }}
                        >
                          {rangeTrendPositive ? '↑ ' : '↓ '}
                          {rangeDeltaLabel}
                        </Box>
                      </>
                    )}
                    <Box
                      component="span"
                      sx={{
                        mx: 0.85,
                        color: alpha(
                          theme.palette.text.primary,
                          TEXT_OPACITY.ghost,
                        ),
                      }}
                    >
                      /
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        color: alpha(
                          theme.palette.text.primary,
                          TEXT_OPACITY.secondary,
                        ),
                      }}
                    >
                      {calendar.selectedMonthCount.toLocaleString()} in{' '}
                      {calendar.selectedMonthLabel} vs{' '}
                      {calendar.previousMonthCount.toLocaleString()} in{' '}
                      {calendar.previousMonthLabel}
                    </Box>
                    {showMonthComparison && (
                      <Box
                        component="span"
                        sx={{
                          ml: 0.6,
                          color: monthTrendColor,
                          fontWeight: 700,
                        }}
                      >
                        {monthTrendPositive ? '↑ ' : '↓ '}
                        {monthDeltaLabel}
                      </Box>
                    )}
                  </Typography>
                  {!isEmpty && <ContributionCalendarLegend />}
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ContributionCalendar;

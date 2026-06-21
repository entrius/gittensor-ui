import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ContributionHeatmap from '../../../components/ContributionHeatmap';
import { CONTRIBUTION_HEATMAP_SCALE, TEXT_OPACITY } from '../../../theme';
import { type DashboardContributionCalendar } from '../dashboardData';

interface ContributionCalendarProps {
  calendar: DashboardContributionCalendar;
  isLoading?: boolean;
}

const CALENDAR_BLOCK = {
  mobile: { size: 10, margin: 3, fontSize: 10 },
  desktop: { size: 14, margin: 4, fontSize: 12 },
} as const;

const HEATMAP_EMPTY_COLOR = '#161b22';
const HEATMAP_LOW_COLOR = '#0e4429';
const HEATMAP_HIGH_COLOR = '#39d353';

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
}) => {
  const theme = useTheme();
  const monoFontFamily = theme.typography.fontFamily;
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const scrollRef = useRef<HTMLDivElement>(null);

  const isEmpty = calendar.days.every((day) => day.count === 0);
  const totalContributions = useMemo(
    () => calendar.days.reduce((sum, day) => sum + day.count, 0),
    [calendar.days],
  );
  const activeDays = useMemo(
    () => calendar.days.filter((day) => day.count > 0).length,
    [calendar.days],
  );
  const peakContributionCount = useMemo(
    () => Math.max(0, ...calendar.days.map((day) => day.count)),
    [calendar.days],
  );

  const blockConfig = isMobile ? CALENDAR_BLOCK.mobile : CALENDAR_BLOCK.desktop;

  const getHeatmapBlockColor = useCallback(
    (activity: { count: number }) => {
      if (activity.count <= 0) return HEATMAP_EMPTY_COLOR;
      if (peakContributionCount <= 1) return HEATMAP_HIGH_COLOR;

      const intensity =
        Math.log1p(activity.count) / Math.log1p(peakContributionCount);
      return mixHex(HEATMAP_LOW_COLOR, HEATMAP_HIGH_COLOR, intensity);
    },
    [peakContributionCount],
  );

  const heatmapScrollSx = useMemo(
    () => ({
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-x',
      pb: 0.5,
      '& .react-activity-calendar': {
        display: 'inline-block',
        width: 'max-content',
        minWidth: 'max-content',
      },
      '& .react-activity-calendar svg': {
        display: 'block',
      },
      '& .react-activity-calendar text': {
        fill: alpha(theme.palette.text.primary, TEXT_OPACITY.tertiary),
        fontFamily: monoFontFamily,
      },
    }),
    [monoFontFamily, theme.palette.text.primary],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isEmpty || isLoading) return;
    el.scrollLeft = el.scrollWidth;
  }, [calendar.days, isEmpty, isLoading]);

  const weekTrendPositive =
    calendar.weekOverWeekPercent !== null && calendar.weekOverWeekPercent >= 0;
  const weekTrendColor =
    calendar.weekOverWeekPercent === null
      ? alpha(theme.palette.text.primary, TEXT_OPACITY.muted)
      : weekTrendPositive
        ? theme.palette.status.success
        : theme.palette.status.closed;
  const rollingDeltaLabel =
    calendar.weekOverWeekPercent === null
      ? 'n/a'
      : `${calendar.weekOverWeekPercent >= 0 ? '+' : ''}${Math.round(
          calendar.weekOverWeekPercent,
        )}%`;

  const summaryMetricSx = {
    minWidth: 0,
    p: { xs: 0.85, sm: 0.95, md: 1 },
    borderRadius: 2,
    border: `1px solid ${theme.palette.border.light}`,
    backgroundColor: alpha(theme.palette.text.primary, 0.018),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  const summaryLabelSx = {
    color: alpha(theme.palette.text.primary, TEXT_OPACITY.muted),
    fontFamily: monoFontFamily,
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };

  const summaryValueSx = {
    mt: 0.45,
    fontFamily: monoFontFamily,
    fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.3rem' },
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  };

  const summaryStack = (
    <Box
      sx={{
        display: { xs: 'grid', md: 'flex' },
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        flexDirection: 'column',
        gap: 1,
        minWidth: 0,
        width: { xs: '100%', md: 160 },
        flexShrink: 0,
        '& > *': {
          flex: { md: '0 0 auto' },
        },
      }}
    >
      <Box sx={summaryMetricSx}>
        <Typography sx={summaryLabelSx}>Last 7 days</Typography>
        <Typography
          sx={{ ...summaryValueSx, color: theme.palette.diff.additions }}
        >
          {calendar.thisWeekCount.toLocaleString()}
        </Typography>
      </Box>

      <Box sx={summaryMetricSx}>
        <Typography sx={summaryLabelSx}>Prior 7d</Typography>
        <Stack
          direction="row"
          spacing={0.35}
          alignItems="center"
          sx={{ mt: 0.55 }}
        >
          {calendar.weekOverWeekPercent !== null &&
            (weekTrendPositive ? (
              <ArrowUpwardIcon
                sx={{ fontSize: '1rem', color: weekTrendColor }}
              />
            ) : (
              <ArrowDownwardIcon
                sx={{ fontSize: '1rem', color: weekTrendColor }}
              />
            ))}
          <Typography
            sx={{
              color: weekTrendColor,
              fontFamily: monoFontFamily,
              fontSize: { xs: '1.05rem', sm: '1.12rem', md: '1.05rem' },
              fontWeight: 700,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {rollingDeltaLabel}
          </Typography>
        </Stack>
      </Box>

      <Box sx={summaryMetricSx}>
        <Typography sx={summaryLabelSx}>Active days</Typography>
        <Typography
          sx={{ ...summaryValueSx, color: theme.palette.text.primary }}
        >
          {activeDays.toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );

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
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 160px' },
                gap: { xs: 1.25, md: 1.5 },
                alignItems: 'stretch',
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
                <ContributionHeatmap
                  bare
                  showHeader={false}
                  data={calendar.days}
                  contributionsLast30Days={calendar.thisWeekCount}
                  totalDaysShown={calendar.totalDaysShown}
                  subtitle="network contribution(s) in the last 7 days"
                  emptySubtitle="Activity will appear here once PRs merge and issues resolve"
                  blockSize={blockConfig.size}
                  blockMargin={blockConfig.margin}
                  fontSize={blockConfig.fontSize}
                  weekStart={0}
                  showWeekdayLabels={['mon', 'wed', 'fri']}
                  showTotalCount={false}
                  showColorLegend={false}
                  scrollContainerRef={scrollRef}
                  scrollContainerSx={heatmapScrollSx}
                  getBlockColor={getHeatmapBlockColor}
                />
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
                    {totalContributions.toLocaleString()} contribution
                    {totalContributions === 1 ? '' : 's'} in the last year
                  </Typography>
                  {!isEmpty && <ContributionCalendarLegend />}
                </Box>
              </Box>
              {summaryStack}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ContributionCalendar;

import React, { useEffect, useMemo, useRef } from 'react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
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
import { ActivityCalendar } from 'react-activity-calendar';
import {
  CONTRIBUTION_HEATMAP_SCALE,
  scrollbarSx,
  TEXT_OPACITY,
} from '../../../theme';
import { type DashboardContributionCalendar } from '../dashboardData';

interface ContributionCalendarProps {
  calendar: DashboardContributionCalendar;
  isLoading?: boolean;
}

/** GitHub-style fixed cells — never shrink to fit (enables horizontal swipe on mobile). */
const CALENDAR_BLOCK = {
  mobile: { size: 10, margin: 3, fontSize: 10 },
  desktop: { size: 11, margin: 3, fontSize: 11 },
} as const;

const formatActivityDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ContributionCalendarLegend: React.FC = () => {
  const theme = useTheme();
  const monoFontFamily = theme.typography.fontFamily;

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
          color: alpha(theme.palette.text.primary, 0.45),
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
          color: alpha(theme.palette.text.primary, 0.45),
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

  const heatmapLevels = [...CONTRIBUTION_HEATMAP_SCALE];
  const heatmapTheme = { light: heatmapLevels, dark: heatmapLevels };
  const isEmpty = calendar.days.every((day) => day.count === 0);
  const totalContributions = useMemo(
    () => calendar.days.reduce((sum, day) => sum + day.count, 0),
    [calendar.days],
  );

  const blockConfig = isMobile ? CALENDAR_BLOCK.mobile : CALENDAR_BLOCK.desktop;

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

  const weekSummaryCard = (
    <Box
      sx={{
        flexShrink: 0,
        width: { xs: '100%', md: 148 },
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: theme.palette.surface.subtle,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography
        sx={{
          color: alpha(theme.palette.text.primary, TEXT_OPACITY.muted),
          fontFamily: monoFontFamily,
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        This week
      </Typography>
      <Typography
        sx={{
          mt: 0.75,
          color: theme.palette.diff.additions,
          fontFamily: monoFontFamily,
          fontSize: { xs: '2rem', md: '2.35rem' },
          fontWeight: 700,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {calendar.thisWeekCount.toLocaleString()}
      </Typography>
      <Typography
        sx={{
          mt: 0.35,
          color: alpha(theme.palette.text.primary, TEXT_OPACITY.faint),
          fontFamily: monoFontFamily,
          fontSize: '0.72rem',
        }}
      >
        Contributions
      </Typography>
      <Stack
        direction="row"
        spacing={0.25}
        alignItems="center"
        sx={{ mt: 1.1 }}
      >
        {calendar.weekOverWeekPercent !== null &&
          (weekTrendPositive ? (
            <ArrowUpwardIcon
              sx={{ fontSize: '0.95rem', color: weekTrendColor }}
            />
          ) : (
            <ArrowDownwardIcon
              sx={{ fontSize: '0.95rem', color: weekTrendColor }}
            />
          ))}
        <Typography
          sx={{
            color: weekTrendColor,
            fontFamily: monoFontFamily,
            fontSize: '0.68rem',
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {calendar.weekOverWeekLabel}
        </Typography>
      </Stack>
    </Box>
  );

  const heatmapPanel = (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          pb: 0.5,
          ...scrollbarSx,
          '& .react-activity-calendar': {
            display: 'inline-block',
            width: 'max-content',
            minWidth: 'max-content',
          },
          '& .react-activity-calendar svg': {
            display: 'block',
          },
          '& .react-activity-calendar text': {
            fill: alpha(theme.palette.text.primary, 0.45),
            fontFamily: monoFontFamily,
          },
        }}
      >
        {isEmpty ? (
          <Box
            sx={{
              py: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
              width: '100%',
            }}
          >
            <Typography
              sx={{
                color: alpha(theme.palette.text.primary, TEXT_OPACITY.muted),
                fontSize: '0.85rem',
                textAlign: 'center',
              }}
            >
              No contributions yet
            </Typography>
            <Typography
              sx={{
                color: alpha(theme.palette.text.primary, TEXT_OPACITY.ghost),
                fontSize: '0.75rem',
                textAlign: 'center',
                mt: 0.5,
              }}
            >
              Activity will appear here once PRs merge and issues resolve
            </Typography>
          </Box>
        ) : (
          <ActivityCalendar
            data={calendar.days}
            theme={heatmapTheme}
            labels={{
              legend: { less: 'Less', more: 'More' },
              months: [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ],
              totalCount: `{{count}} contribution(s) in the last ${calendar.totalDaysShown} day(s)`,
              weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            }}
            blockSize={blockConfig.size}
            blockMargin={blockConfig.margin}
            fontSize={blockConfig.fontSize}
            style={{ color: theme.palette.text.primary }}
            weekStart={0}
            showWeekdayLabels={['mon', 'wed', 'fri']}
            showTotalCount={false}
            showColorLegend={false}
            renderBlock={(block, activity) => (
              <Tooltip
                title={`${activity.count} contribution${activity.count !== 1 ? 's' : ''} on ${formatActivityDateLabel(activity.date)}`}
                arrow
                placement="top"
                enterDelay={0}
                enterNextDelay={0}
                leaveDelay={0}
                disableInteractive
              >
                {block}
              </Tooltip>
            )}
          />
        )}
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
            color: alpha(theme.palette.text.primary, 0.4),
            lineHeight: 1.35,
          }}
        >
          {totalContributions.toLocaleString()} contribution
          {totalContributions === 1 ? '' : 's'} in the last year
        </Typography>
        {!isEmpty && <ContributionCalendarLegend />}
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
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 1.5, md: 1.75 }}
              alignItems="stretch"
              sx={{ minWidth: 0 }}
            >
              {heatmapPanel}
              {weekSummaryCard}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ContributionCalendar;

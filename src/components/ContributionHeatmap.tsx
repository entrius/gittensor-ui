import React from 'react';
import {
  Box,
  Card,
  Typography,
  Tooltip,
  alpha,
  useTheme,
  type SxProps,
  type Theme,
} from '@mui/material';
import { ActivityCalendar } from 'react-activity-calendar';

import {
  CONTRIBUTION_HEATMAP_SCALE,
  TEXT_OPACITY,
  scrollbarSx,
} from '../theme';
import { pluralize } from '../utils/format';

export interface ContributionData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type WeekdayLabel = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

const formatActivityDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export interface ContributionHeatmapProps {
  data: ContributionData[];
  contributionsLast30Days: number;
  totalDaysShown: number;
  subtitle?: string;
  footerText?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  bare?: boolean;
  showHeader?: boolean;
  selectedDate?: string;
  onDayClick?: (date: string) => void;
  blockSize?: number;
  blockMargin?: number;
  fontSize?: number;
  weekStart?: DayIndex;
  showWeekdayLabels?: boolean | WeekdayLabel[];
  showTotalCount?: boolean;
  showColorLegend?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  scrollContainerSx?: SxProps<Theme>;
  getBlockColor?: (activity: {
    count: number;
    date: string;
  }) => string | undefined;
}

const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  data,
  contributionsLast30Days,
  totalDaysShown,
  subtitle = 'network contribution(s) in the last 30 days',
  footerText,
  emptyTitle = 'No contributions yet',
  emptySubtitle = 'Activity will appear here once PRs are merged',
  bare = false,
  showHeader = true,
  selectedDate,
  onDayClick,
  blockSize = 11,
  blockMargin = 3,
  fontSize = 11,
  weekStart,
  showWeekdayLabels = false,
  showTotalCount,
  showColorLegend,
  scrollContainerRef,
  scrollContainerSx,
  getBlockColor,
}) => {
  const theme = useTheme();
  const heatmapLevels = [...CONTRIBUTION_HEATMAP_SCALE];
  const heatmapTheme = { light: heatmapLevels, dark: heatmapLevels };
  const isEmpty = data.length === 0;
  const interactive = !!onDayClick;

  const heatmapScroll = (
    <Box
      ref={scrollContainerRef}
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        mb: showHeader || footerText ? 1 : 0,
        ...scrollbarSx,
        ...scrollContainerSx,
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
            minHeight: 100,
            width: '100%',
          }}
        >
          <Typography
            sx={{
              color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
              fontSize: '0.85rem',
              textAlign: 'center',
            }}
          >
            {emptyTitle}
          </Typography>
          {emptySubtitle && (
            <Typography
              sx={{
                color: alpha(theme.palette.common.white, TEXT_OPACITY.ghost),
                fontSize: '0.75rem',
                textAlign: 'center',
                mt: 0.5,
              }}
            >
              {emptySubtitle}
            </Typography>
          )}
        </Box>
      ) : (
        <ActivityCalendar
          data={data}
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
            totalCount: `{{count}} contribution(s) in the last ${totalDaysShown} day(s)`,
            weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          }}
          blockSize={blockSize}
          blockMargin={blockMargin}
          fontSize={fontSize}
          style={{ color: theme.palette.text.primary }}
          weekStart={weekStart}
          showWeekdayLabels={showWeekdayLabels}
          showTotalCount={showTotalCount}
          showColorLegend={showColorLegend}
          renderBlock={(block, activity) => {
            const clickable = interactive;
            const isSelected = selectedDate === activity.date;
            const blockColor = getBlockColor?.(activity);
            const coloredBlock = blockColor
              ? React.cloneElement(block as React.ReactElement, {
                  fill: blockColor,
                })
              : block;
            const highlighted =
              clickable && isSelected
                ? React.cloneElement(coloredBlock as React.ReactElement, {
                    stroke: theme.palette.text.primary,
                    strokeWidth: 1.5,
                  })
                : coloredBlock;
            const wrapped = clickable ? (
              <g
                onClick={() => onDayClick?.(activity.date)}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={`View ${pluralize(activity.count, 'contribution')} on ${activity.date}`}
              >
                {highlighted}
              </g>
            ) : (
              highlighted
            );
            return (
              <Tooltip
                title={`${pluralize(activity.count, 'contribution')} on ${formatActivityDateLabel(activity.date)}${clickable ? ' — click to view PRs' : ''}`}
                arrow
                placement="top"
                enterDelay={0}
                enterNextDelay={0}
                leaveDelay={0}
                disableInteractive
                slotProps={{
                  popper: {
                    sx: {
                      zIndex: theme.zIndex.tooltip,
                    },
                  },
                }}
              >
                {wrapped}
              </Tooltip>
            );
          }}
        />
      )}
    </Box>
  );

  const content = (
    <>
      {showHeader && (
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{
              color: 'text.primary',
              fontWeight: 700,
              fontSize: '2.5rem',
              lineHeight: 1,
            }}
          >
            {contributionsLast30Days.toLocaleString()}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: alpha(theme.palette.common.white, TEXT_OPACITY.faint),
              fontSize: '0.85rem',
              mt: 0.5,
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      )}

      {heatmapScroll}

      {footerText && (
        <Typography
          variant="caption"
          sx={{
            color: alpha(theme.palette.common.white, 0.25),
            display: 'block',
            fontStyle: 'italic',
            fontSize: '0.7rem',
          }}
        >
          {footerText}
        </Typography>
      )}
    </>
  );

  if (bare) {
    return <Box>{content}</Box>;
  }

  return <Card sx={{ height: '100%', p: 3 }}>{content}</Card>;
};

export default ContributionHeatmap;

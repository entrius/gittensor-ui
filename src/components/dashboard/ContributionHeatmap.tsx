import React from 'react';
import { Box, Card, Typography, Tooltip, alpha, useTheme } from '@mui/material';
import { ActivityCalendar } from 'react-activity-calendar';

interface ContributionData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ContributionHeatmapProps {
  data: ContributionData[];
  contributionsLast30Days: number;
  totalDaysShown: number;
  subtitle?: string;
  footerText?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  bare?: boolean;
}

const HEATMAP_THEME = {
  light: ['#e0e0e0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  data,
  contributionsLast30Days,
  totalDaysShown,
  subtitle = 'network contributions in the last 30 days',
  footerText,
  emptyTitle = 'No contributions yet',
  emptySubtitle = 'Activity will appear here once PRs are merged',
  bare = false,
}) => {
  const theme = useTheme();
  const isEmpty = data.length === 0;

  const content = (
    <>
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            color: theme.palette.text.primary,
            fontFamily: '"JetBrains Mono", monospace',
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
            color: alpha(theme.palette.text.primary, 0.4),
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            mt: 0.5,
          }}
        >
          {subtitle}
        </Typography>
      </Box>

      <Box sx={{ width: '100%', overflowX: 'auto', mb: 1 }}>
        {isEmpty ? (
          <Box
            sx={{
              py: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 100,
            }}
          >
            <Typography
              sx={{
                color: 'text.secondary',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.85rem',
                textAlign: 'center',
              }}
            >
              {emptyTitle}
            </Typography>
            {emptySubtitle && (
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontFamily: '"JetBrains Mono", monospace',
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
            theme={HEATMAP_THEME}
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
              totalCount: `{{count}} contributions in the last ${totalDaysShown} days`,
              weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            }}
            blockSize={11}
            blockMargin={3}
            fontSize={11}
            style={{ color: theme.palette.text.primary }}
            showWeekdayLabels={false}
            renderBlock={(block, activity) => (
              <Tooltip
                title={`${activity.count} contribution${activity.count !== 1 ? 's' : ''} on ${new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                arrow
                placement="top"
              >
                {block}
              </Tooltip>
            )}
          />
        )}
      </Box>

      {footerText && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
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

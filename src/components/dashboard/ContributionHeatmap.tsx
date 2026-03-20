import React, { useMemo } from 'react';
import { Box, Card, Typography, Tooltip } from '@mui/material';
import { ActivityCalendar } from 'react-activity-calendar';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

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
  light: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
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
  const isEmpty = data.length === 0;

  const computeRollingData = (windowSize: number) => {
    if (!data || data.length === 0) return [];
    const result: { date: string; value: number }[] = [];
    const startIdx = data.length >= windowSize ? windowSize - 1 : 0;

    for (let i = startIdx; i < data.length; i++) {
      let sum = 0;
      const lookback = Math.min(i, windowSize - 1);
      for (let j = i - lookback; j <= i; j++) {
        sum += data[j].count;
      }
      result.push({ date: data[i].date, value: sum });
    }
    return result;
  };

  const trend7 = useMemo(() => computeRollingData(7), [data]);
  const trend30 = useMemo(() => computeRollingData(30), [data]);
  const trend90 = useMemo(() => computeRollingData(90), [data]);

  const renderTrendChart = (
    subtitleText: string,
    windowData: { date: string; value: number }[],
    tooltipSuffix: string,
  ) => {
    if (windowData.length === 0) return null;
    const values = windowData.map((d) => d.value);
    const currentValue = values[values.length - 1] || 0;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const yMin = Math.max(0, minVal - (maxVal - minVal) * 0.2);

    const option = {
      grid: { top: 2, right: 0, bottom: 2, left: 0 },
      xAxis: {
        type: 'category',
        show: false,
        data: windowData.map((d) => d.date),
      },
      yAxis: { type: 'value', show: false, min: yMin },
      series: [
        {
          data: values,
          type: 'line',
          smooth: true,
          showSymbol: false,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(57, 211, 83, 0.4)' },
              { offset: 1, color: 'rgba(57, 211, 83, 0.05)' },
            ]),
          },
          lineStyle: { color: '#39d353', width: 2 },
        },
      ],
      tooltip: {
        trigger: 'axis',
        appendToBody: true,
        formatter: (params: any) => {
          const d = new Date(params[0].name).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          return `${d}<br/><b style="color: #39d353">${params[0].value}</b> ${tooltipSuffix}`;
        },
        backgroundColor: 'rgba(13, 17, 23, 0.9)',
        borderColor: 'rgba(57, 211, 83, 0.3)',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
        },
      },
    };

    return (
      <Box
        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <Box sx={{ mb: 0.5 }}>
          <Typography
            sx={{
              color: '#fff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '1rem', xl: '1.25rem' },
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {currentValue.toLocaleString()}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.65rem',
              mt: 0.5,
              lineHeight: 1.2,
            }}
          >
            {subtitleText}
          </Typography>
        </Box>
        <Box sx={{ width: '100%', flex: 1, minHeight: 0 }}>
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </Box>
      </Box>
    );
  };

  const leftCardContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 0,
      }}
    >
      <Box sx={{ mb: { xs: 1.5, md: 2.5 } }}>
        <Typography
          sx={{
            color: '#fff',
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
            lineHeight: 1,
          }}
        >
          {contributionsLast30Days.toLocaleString()}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: { xs: '0.7rem', md: '0.85rem' },
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
                color: 'rgba(255, 255, 255, 0.5)',
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
                  color: 'rgba(255, 255, 255, 0.3)',
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
            style={{ color: '#fff' }}
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
            color: 'rgba(255, 255, 255, 0.25)',
            display: 'block',
            fontStyle: 'italic',
            fontSize: '0.7rem',
            mt: 'auto',
          }}
        >
          {footerText}
        </Typography>
      )}
    </Box>
  );

  const rightCardContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 1.5 }}>
      {renderTrendChart('last 7 days', trend7, 'contributions (7d rolling)')}
      {renderTrendChart('last 30 days', trend30, 'contributions (30d rolling)')}
      {renderTrendChart('last 90 days', trend90, 'contributions (90d rolling)')}
    </Box>
  );

  const containerSx = {
    display: 'flex',
    gap: 2,
    height: '100%',
    flexDirection: { xs: 'column', sm: 'row' },
  };

  if (bare) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: '100%',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, pr: { sm: 3 } }}>
          {leftCardContent}
        </Box>

        {!isEmpty && trend7.length > 0 && (
          <>
            <Box
              sx={{
                display: { xs: 'none', sm: 'block' },
                width: '1px',
                bgcolor: 'border.light',
                my: -3,
              }}
            />
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                width: { sm: 160, md: 180, lg: 200, xl: 240 },
                flexDirection: 'column',
                pl: { sm: 3 },
              }}
            >
              {rightCardContent}
            </Box>
          </>
        )}
      </Box>
    );
  }

  return (
    <Box sx={containerSx}>
      <Card
        sx={{
          flex: 1,
          p: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {leftCardContent}
      </Card>
      {!isEmpty && trend7.length > 0 && (
        <Card
          sx={{
            display: { xs: 'none', sm: 'flex' },
            width: { sm: 170, md: 190, lg: 220, xl: 260 },
            p: { xs: 2, md: 3 },
            flexDirection: 'column',
          }}
        >
          {rightCardContent}
        </Card>
      )}
    </Box>
  );
};

export default ContributionHeatmap;

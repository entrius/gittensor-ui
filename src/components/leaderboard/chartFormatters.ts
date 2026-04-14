import { type CommitLog } from '../../api/models/Dashboard';
import theme from '../../theme';

export interface RankedRepositoryStats {
  repository: string;
  totalScore: number;
  totalPRs: number;
  uniqueMiners: Set<string>;
  weight: number;
  rank?: number;
}

type RankedPR = CommitLog & { rank?: number };

const textColor = 'rgba(255, 255, 255, 0.85)';
const gridColor = 'rgba(255, 255, 255, 0.08)';

const getBaseChartOption = (params: {
  title: string;
  subtitle: string;
  useLogScale: boolean;
  yAxisName: string;
  yAxisLabelFormatter: (value: number) => string;
}) => ({
  backgroundColor: 'transparent',
  title: {
    text: params.title,
    subtext: params.subtitle,
    left: 'center',
    top: 20,
    textStyle: {
      color: '#ffffff',
      fontFamily: 'JetBrains Mono',
      fontSize: 18,
      fontWeight: 600,
    },
    subtextStyle: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: 'JetBrains Mono',
      fontSize: 11,
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
  yAxis: {
    type: params.useLogScale ? 'log' : 'value',
    min: params.useLogScale ? 1 : 0,
    logBase: 10,
    name: params.yAxisName,
    nameTextStyle: {
      color: textColor,
      fontFamily: 'JetBrains Mono',
      fontSize: 12,
      padding: [0, 0, 0, 0],
    },
    axisLabel: {
      color: textColor,
      fontFamily: 'JetBrains Mono',
      fontSize: 11,
      formatter: params.yAxisLabelFormatter,
    },
    splitLine: {
      lineStyle: {
        color: gridColor,
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
});

export const getPRChartOption = (params: {
  prs: RankedPR[];
  useLogScale: boolean;
}) => {
  const chartData = params.prs.slice(0, 50);
  const chartColor = theme.palette.primary.main;

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
    ...getBaseChartOption({
      title: 'Pull Request Performance Ranking',
      subtitle: 'Individual PR scores ranked by performance',
      useLogScale: params.useLogScale,
      yAxisName: 'PR Score',
      yAxisLabelFormatter: (value: number) => {
        if (value < 0.01) return value.toExponential(1);
        return value.toFixed(2);
      },
    }),
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
      backgroundColor: 'rgba(10, 10, 12, 0.98)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontFamily: 'JetBrains Mono',
        fontSize: 12,
      },
      padding: [14, 18],
      formatter: (rawParams: unknown) => {
        const chartParams = rawParams as Array<{ data?: (typeof dotData)[0] }>;
        const data = chartParams[0]?.data || chartParams[1]?.data;
        if (!data) return '';

        return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="font-weight: 700; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 8px;">
                PR #${data.prNumber}
              </div>
              <div style="margin-bottom: 10px; color: rgba(255,255,255,0.85); font-size: 11px; max-width: 300px; white-space: normal; word-break: break-word; line-height: 1.4;">
                ${data.title}
              </div>
              <div style="display: grid; gap: 6px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Rank:</span>
                  <span style="color: #fff; font-weight: 600;">#${data.rank}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Score:</span>
                  <span style="color: #fff; font-weight: 600;">${data.value.toFixed(4)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Author:</span>
                  <span style="color: #fff; font-weight: 600;">${data.author}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Repository:</span>
                  <span style="color: #fff; font-weight: 600;">${data.repository.split('/')[1] || data.repository}</span>
                </div>
              </div>
            </div>
          `;
      },
    },
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
          color: gridColor,
          width: 1,
        },
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
            borderColor: '#fff',
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

export const getRepositoryChartOption = (params: {
  repositories: RankedRepositoryStats[];
  useLogScale: boolean;
}) => {
  const chartData = params.repositories.slice(0, 50);

  const barGradient = {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: 'rgba(139, 148, 158, 0.8)' },
      { offset: 0.5, color: 'rgba(139, 148, 158, 0.6)' },
      { offset: 1, color: 'rgba(100, 108, 118, 0.4)' },
    ],
  };

  const xAxisData = chartData.map((item) => ({
    name: (item?.repository || '').split('/')[1] || item?.repository || '',
    fullName: item?.repository || '',
  }));

  const seriesData = chartData.map((item, index) => ({
    value: Number(item?.totalScore) || 0,
    rank: item?.rank || index + 1,
    repository: item?.repository || '',
    weight: item?.weight || 0,
    prs: item?.totalPRs || 0,
    contributors: item?.uniqueMiners?.size || 0,
    itemStyle: {
      color: barGradient,
      borderRadius: [6, 6, 0, 0],
      shadowColor: 'rgba(100, 100, 100, 0.2)',
      shadowBlur: 12,
    },
  }));

  return {
    ...getBaseChartOption({
      title: 'Repository Score Performance',
      subtitle: 'Total score generated by repository contributions',
      useLogScale: params.useLogScale,
      yAxisName: 'Total Score',
      yAxisLabelFormatter: (value: number) => {
        if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
        return value.toFixed(0);
      },
    }),
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
      backgroundColor: 'rgba(15, 15, 18, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontFamily: 'JetBrains Mono',
        fontSize: 12,
      },
      padding: [12, 16],
      formatter: (rawParams: unknown) => {
        const chartParams = rawParams as Array<{ dataIndex: number }>;
        const item = seriesData[chartParams[0].dataIndex];

        return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">
                #${item.rank} ${item.repository}
              </div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="color: rgba(255,255,255,0.7); margin-bottom: 4px;">Total Score: <span style="color: #fff; font-weight: 600;">${item.value.toFixed(2)}</span></div>
                <div style="color: rgba(255,255,255,0.7); margin-bottom: 4px;">Weight: <span style="color: #fff; font-weight: 600;">${item.weight.toFixed(2)}</span></div>
                <div style="color: rgba(255,255,255,0.7); margin-bottom: 4px;">Pull Requests: <span style="color: #fff; font-weight: 600;">${item.prs}</span></div>
                <div style="color: rgba(255,255,255,0.7);">Contributors: <span style="color: #fff; font-weight: 600;">${item.contributors}</span></div>
              </div>
            </div>
          `;
      },
    },
    xAxis: {
      type: 'category',
      data: xAxisData.map((item) => item.name),
      axisLabel: {
        color: textColor,
        fontFamily: 'JetBrains Mono',
        fontSize: 11,
        interval: 0,
        rotate: 45,
        margin: 12,
        formatter: (label: string) =>
          label.length > 15 ? `${label.substring(0, 12)}...` : label,
      },
      axisLine: {
        lineStyle: {
          color: gridColor,
          width: 1,
        },
      },
      axisTick: {
        show: false,
      },
    },
    series: [
      {
        data: seriesData,
        type: 'bar',
        barWidth: '60%',
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(255, 255, 255, 0.02)',
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(88, 166, 255, 0.5)',
          },
        },
        animationDuration: 1000,
        animationEasing: 'cubicOut',
      },
    ],
  };
};

import React, { useMemo } from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { TEXT_OPACITY } from '../../theme';
import { type MinerStats } from '../leaderboard/types';

export const COMPARISON_COLORS = [
  '#3fb950',
  '#58a6ff',
  '#f59e0b',
  '#a78bfa',
] as const;

interface Metric {
  label: string;
  display: string;
  floor: number;
  get: (m: MinerStats) => number;
  format: (v: number) => string;
}

const formatCount = (v: number) => v.toLocaleString();

const METRICS: readonly Metric[] = [
  {
    label: 'Credibility',
    display: 'Credibility',
    floor: 0.01,
    get: (m) => m.credibility || 0,
    format: (v) => v.toFixed(2),
  },
  {
    label: 'Complexity',
    display: 'Complexity',
    floor: 1,
    get: (m) => m.linesChanged || 0,
    format: formatCount,
  },
  {
    label: 'Merged PRs',
    display: 'Merged\nPRs',
    floor: 1,
    get: (m) => m.totalMergedPrs || 0,
    format: formatCount,
  },
  {
    label: 'Unique Repos',
    display: 'Unique\nRepos',
    floor: 1,
    get: (m) => m.uniqueReposCount || 0,
    format: formatCount,
  },
  {
    label: 'Total PRs',
    display: 'Total\nPRs',
    floor: 1,
    get: (m) => m.totalPRs || 0,
    format: formatCount,
  },
];

interface MinerComparisonRadarProps {
  miners: MinerStats[];
  allMiners: MinerStats[];
}

const displayName = (m: MinerStats) => m.author || m.githubId;

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string,
  );

const MinerComparisonRadar: React.FC<MinerComparisonRadarProps> = ({
  miners,
  allMiners,
}) => {
  const theme = useTheme();

  const chartOption = useMemo(() => {
    const maxes = METRICS.map((m) =>
      Math.max(...allMiners.map(m.get), m.floor),
    );
    const rawByMiner = miners.map((miner) => METRICS.map((m) => m.get(miner)));

    const data = miners.map((miner, i) => {
      const color = COMPARISON_COLORS[i % COMPARISON_COLORS.length];
      return {
        name: displayName(miner),
        value: rawByMiner[i].map((v, j) => (v / maxes[j]) * 100),
        symbol: 'circle',
        symbolSize: 4,
        itemStyle: { color },
        lineStyle: { width: 2, color },
        areaStyle: { color: `${color}22` },
      };
    });

    const textPrimary = theme.palette.text.primary;
    const textSecondary = alpha(textPrimary, 0.66);
    const axisColor = alpha(theme.palette.common.white, TEXT_OPACITY.secondary);
    const barTrack = alpha(textPrimary, 0.08);

    return {
      backgroundColor: 'transparent',
      legend: {
        data: miners.map(displayName),
        textStyle: { color: axisColor, fontSize: 11 },
        top: 4,
        itemGap: 16,
        icon: 'circle',
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.palette.surface.tooltip,
        borderColor: alpha(textPrimary, 0.14),
        borderWidth: 1,
        padding: [10, 12],
        textStyle: {
          color: textPrimary,
          fontFamily: theme.typography.fontFamily,
          fontSize: 11,
        },
        extraCssText: 'border-radius:6px;',
        formatter: (params: {
          name: string;
          color: string;
          dataIndex: number;
          value: number[];
        }) => {
          const raw = rawByMiner[params.dataIndex];
          const rows = METRICS.map((metric, j) => {
            const pct = Math.round(params.value[j]);
            return `<div style="display:flex;align-items:center;gap:10px;">
                <span style="color:${textSecondary};min-width:92px;">${metric.label}</span>
                <span style="flex:1;height:4px;background:${barTrack};border-radius:2px;overflow:hidden;min-width:60px;">
                  <span style="display:block;height:100%;width:${pct}%;background:${params.color};"></span>
                </span>
                <span style="color:${textPrimary};font-weight:600;min-width:44px;text-align:right;">${metric.format(raw[j])}</span>
              </div>`;
          }).join('');
          return `<div style="display:grid;gap:6px;min-width:220px;">
              <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:${textPrimary};">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${params.color};"></span>
                <span>${escapeHtml(params.name)}</span>
              </div>
              ${rows}
            </div>`;
        },
      },
      radar: {
        indicator: METRICS.map((m) => ({ name: m.display, max: 100 })),
        center: ['50%', '58%'],
        radius: '62%',
        shape: 'circle',
        splitNumber: 5,
        axisName: { color: axisColor, fontSize: 10, lineHeight: 12 },
        splitLine: {
          lineStyle: {
            color: Array(5).fill(alpha(theme.palette.common.white, 0.05)),
          },
        },
        splitArea: { show: false },
        axisLine: {
          lineStyle: { color: alpha(theme.palette.common.white, 0.1) },
        },
      },
      series: [{ type: 'radar', data, emphasis: { lineStyle: { width: 3 } } }],
    };
  }, [miners, allMiners, theme]);

  return (
    <Box sx={{ height: 380, width: '100%' }}>
      <ReactECharts
        option={chartOption}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge
      />
    </Box>
  );
};

export default MinerComparisonRadar;

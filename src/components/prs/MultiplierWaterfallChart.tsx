import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import type {
  TooltipComponentFormatterCallbackParams,
  DefaultLabelFormatterCallbackParams,
} from 'echarts';
import type { WaterfallStep } from '../../utils/multiplierDefs';
import { CHART_COLORS, STATUS_COLORS, TEXT_OPACITY } from '../../theme';

interface MultiplierWaterfallChartProps {
  steps: WaterfallStep[];
  isOpen: boolean;
}

type BarTone = 'base' | 'total' | 'increase' | 'decrease';

const MONO = "'JetBrains Mono', monospace";

const TONE_COLOR: Record<BarTone, string> = {
  base: STATUS_COLORS.info,
  total: STATUS_COLORS.award,
  increase: CHART_COLORS.merged,
  decrease: CHART_COLORS.closed,
};

const TONE_LABEL: Record<BarTone, string> = {
  base: 'Starting point',
  total: 'Final value',
  increase: 'Raises score',
  decrease: 'Lowers score',
};

const toneFor = (step: WaterfallStep): BarTone => {
  if (step.kind === 'base') return 'base';
  if (step.kind === 'total') return 'total';
  return step.runningAfter >= step.runningBefore ? 'increase' : 'decrease';
};

const formatFactor = (step: WaterfallStep): string => {
  if (step.factor == null) return '';
  if (step.kind === 'additive') {
    const sign = step.factor >= 0 ? '+' : '−';
    return `${sign}${Math.abs(step.factor).toFixed(2)}`;
  }
  return `×${step.factor.toFixed(2)}`;
};

const gradientFor = (hex: string) => ({
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: alpha(hex, 0.95) },
    { offset: 0.5, color: alpha(hex, 0.7) },
    { offset: 1, color: alpha(hex, 0.3) },
  ],
});

const MultiplierWaterfallChart: React.FC<MultiplierWaterfallChartProps> = ({
  steps,
  isOpen,
}) => {
  const theme = useTheme();

  const option = useMemo(() => {
    const white = theme.palette.common.white;
    const textPrimary = theme.palette.text.primary;
    const labelColor = alpha(white, TEXT_OPACITY.secondary);
    const axisLineColor = alpha(white, TEXT_OPACITY.ghost);
    const gridLineColor = alpha(white, 0.06);
    const connectorColor = alpha(white, 0.32);
    const tooltipBg = theme.palette.surface.tooltip;
    const tooltipBorder = alpha(white, 0.15);

    const categories = steps.map((s) => s.label);
    const floors = steps.map((s) => Math.min(s.runningBefore, s.runningAfter));
    const deltas = steps.map((s) => {
      const tone = toneFor(s);
      return {
        value: Math.abs(s.runningAfter - s.runningBefore),
        itemStyle: {
          color: gradientFor(TONE_COLOR[tone]),
          borderRadius: [5, 5, 0, 0],
          shadowColor: alpha(TONE_COLOR[tone], 0.35),
          shadowBlur: 10,
        },
      };
    });

    const connectorPairs = steps
      .slice(0, -1)
      .map((s, i) => [
        { coord: [i, s.runningAfter] },
        { coord: [i + 1, s.runningAfter] },
      ]);

    const runningPoints = steps.map((s, i) => [i, s.runningAfter]);

    return {
      backgroundColor: 'transparent',
      animationDuration: 800,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: gridLineColor } },
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: textPrimary, fontSize: 12, fontFamily: MONO },
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          const list = Array.isArray(params) ? params : [params];
          const dataIndex = list[0]?.dataIndex;
          if (typeof dataIndex !== 'number') return '';
          const step = steps[dataIndex];
          const tone = toneFor(step);
          const factor = formatFactor(step);

          const body =
            step.kind === 'base' || step.kind === 'total'
              ? `<div style="color:${labelColor}">${step.kind === 'base' ? 'Starting' : 'Final'} value: <b style="color:${textPrimary}">${step.runningAfter.toFixed(2)}</b></div>`
              : `
                <div style="display:flex;justify-content:space-between;gap:16px;">
                  <span style="color:${labelColor}">Before</span>
                  <b style="color:${textPrimary}">${step.runningBefore.toFixed(2)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;gap:16px;">
                  <span style="color:${labelColor}">Change</span>
                  <b style="color:${TONE_COLOR[tone]}">${factor}</b>
                </div>
                <div style="display:flex;justify-content:space-between;gap:16px;">
                  <span style="color:${labelColor}">After</span>
                  <b style="color:${textPrimary}">${step.runningAfter.toFixed(2)}</b>
                </div>
              `;

          return `
            <div style="font-family:${MONO}; min-width:180px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="width:10px;height:10px;border-radius:2px;background:${TONE_COLOR[tone]};box-shadow:0 0 8px ${alpha(TONE_COLOR[tone], 0.5)};"></span>
                <span style="font-weight:600;font-size:13px;">${step.label}</span>
              </div>
              <div style="color:${alpha(white, TEXT_OPACITY.muted)};font-size:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${TONE_LABEL[tone]}</div>
              <div style="padding-top:8px;border-top:1px solid ${tooltipBorder};display:flex;flex-direction:column;gap:4px;font-size:11px;">
                ${body}
              </div>
            </div>
          `;
        },
      },
      grid: { left: 52, right: 24, top: 36, bottom: 68, containLabel: false },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          color: labelColor,
          fontSize: 10,
          interval: 0,
          rotate: 30,
          margin: 12,
          fontFamily: MONO,
        },
        axisLine: { lineStyle: { color: axisLineColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: labelColor, fontSize: 10, fontFamily: MONO },
        splitLine: {
          lineStyle: { color: gridLineColor, type: 'dashed', opacity: 0.6 },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'floor',
          type: 'bar',
          stack: 'waterfall',
          silent: true,
          itemStyle: { color: 'transparent', borderColor: 'transparent' },
          emphasis: { itemStyle: { color: 'transparent' } },
          data: floors,
        },
        {
          name: isOpen ? 'Collateral step' : 'Score step',
          type: 'bar',
          stack: 'waterfall',
          barWidth: '55%',
          data: deltas,
          label: {
            show: true,
            position: 'insideTop',
            color: alpha(white, 0.92),
            fontSize: 9,
            fontWeight: 700,
            fontFamily: MONO,
            distance: 4,
            formatter: (p: DefaultLabelFormatterCallbackParams) => {
              const s = steps[p.dataIndex];
              if (s.kind === 'base' || s.kind === 'total') return '';
              return formatFactor(s);
            },
          },
          markLine: {
            symbol: 'none',
            silent: true,
            animation: false,
            lineStyle: {
              type: 'dashed',
              color: connectorColor,
              width: 1,
              opacity: 0.7,
            },
            label: { show: false },
            data: connectorPairs,
          },
        },
        {
          name: 'running-total',
          type: 'scatter',
          silent: true,
          symbol: 'none',
          data: runningPoints,
          label: {
            show: true,
            position: 'top',
            color: textPrimary,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: MONO,
            distance: 8,
            formatter: (p: DefaultLabelFormatterCallbackParams) => {
              const raw = Array.isArray(p.data) ? p.data[1] : p.data;
              return Number(raw).toFixed(2);
            },
          },
          z: 5,
        },
      ],
    };
  }, [steps, isOpen, theme]);

  const legendItems: Array<{ tone: BarTone; label: string }> = [
    { tone: 'base', label: 'Base' },
    { tone: 'increase', label: 'Raises' },
    { tone: 'decrease', label: 'Lowers' },
    { tone: 'total', label: isOpen ? 'Collateral' : 'Earned' },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1,
        }}
      >
        <Typography
          sx={{
            color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontWeight: 600,
          }}
        >
          Score Waterfall
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          {legendItems.map(({ tone, label }) => (
            <Box
              key={tone}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '2px',
                  backgroundColor: TONE_COLOR[tone],
                  boxShadow: `0 0 6px ${alpha(TONE_COLOR[tone], 0.5)}`,
                }}
              />
              <Typography
                sx={{
                  color: alpha(
                    theme.palette.common.white,
                    TEXT_OPACITY.secondary,
                  ),
                  fontSize: '0.7rem',
                  fontFamily: MONO,
                }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ height: 300, width: '100%' }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
          notMerge
        />
      </Box>
    </Box>
  );
};

export default MultiplierWaterfallChart;

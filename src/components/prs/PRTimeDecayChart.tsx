import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { type Theme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import { useGeneralConfig } from '../../api';
import { TEXT_OPACITY } from '../../theme';
import {
  echartsAxisTooltipChrome,
  echartsFontFamily,
  echartsMutedCartesianAxisColors,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';
import {
  PR_LOOKBACK_DAYS,
  buildDecayCurve,
  buildDecayProjection,
  buildDecaySubline,
  type DecayParams,
  type DecayProjection,
  resolveDecayParams,
} from './prTimeDecayModel';

interface PRTimeDecayChartProps {
  mergedAt: string | null;
  prState: string;
  timeDecayMultiplier?: string | number | null;
  earnedScore?: string | number | null;
}

interface CartesianAxisColors {
  labelColor: string;
  axisLineColor: string;
  splitLineColor: string;
}

interface NowMarker {
  day: number;
  multiplier: number;
}

type GradientColors = [string, string, string, string];
const GRADIENT_OFFSETS = [0, 0.3, 0.65, 1] as const;

function getGradientColors(palette: Theme['palette']): GradientColors {
  return [
    palette.status.success,
    palette.status.warning,
    palette.status.warningOrange,
    palette.status.error,
  ];
}

function getGradientCss(colors: GradientColors): string {
  return `linear-gradient(90deg, ${colors[0]} 0%, ${colors[1]} 30%, ${colors[2]} 65%, ${colors[3]} 100%)`;
}

function buildGradient(colors: GradientColors, opacities?: number[]) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 1,
    y2: 0,
    colorStops: GRADIENT_OFFSETS.map((offset, i) => ({
      offset,
      color: opacities ? alpha(colors[i], opacities[i]) : colors[i],
    })),
  };
}

function resolveNowMarker(projection: DecayProjection): NowMarker | null {
  if (!projection.isMerged || !projection.inWindow) return null;
  if (projection.daysSinceMerge == null) return null;
  if (projection.chartNowMultiplier == null) return null;
  return {
    day: +projection.daysSinceMerge.toFixed(2),
    multiplier: projection.chartNowMultiplier,
  };
}

function injectNowPoint(
  curve: [number, number][],
  marker: NowMarker | null,
): [number, number][] {
  if (marker == null) return curve;
  const filtered = curve.filter(([x]) => x !== marker.day);
  filtered.push([marker.day, marker.multiplier]);
  filtered.sort((a, b) => a[0] - b[0]);
  return filtered;
}

function buildMarkPointData(marker: NowMarker | null, nowColor: string) {
  if (marker == null) return [];
  return [
    {
      name: 'Now',
      coord: [marker.day, marker.multiplier],
      itemStyle: { color: nowColor },
    },
  ];
}

function formatPercentTick(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function formatNowMarkerLabel(point: {
  name: string;
  data: { coord: number[] };
}): string {
  const value = point.data?.coord?.[1];
  if (value == null) return point.name;
  return `${point.name} ${value.toFixed(2)}×`;
}

function formatTooltipBody(
  day: number,
  multiplier: number,
  preDecayScore: number | null,
  mutedHex: string,
): string {
  const header = `<div style="font-weight:600;margin-bottom:2px">Day ${day.toFixed(1)}</div>`;
  const multiplierLine = `<div><span style="color:${mutedHex}">Multiplier</span> <b>${multiplier.toFixed(2)}×</b></div>`;
  if (preDecayScore == null) return header + multiplierLine;
  const score = preDecayScore * multiplier;
  const scoreLine = `<div style="margin-top:2px"><span style="color:${mutedHex}">Score</span> <b>${score.toFixed(2)}</b></div>`;
  return header + multiplierLine + scoreLine;
}

function buildTooltipFormatter(preDecayScore: number | null, mutedHex: string) {
  return function formatChartTooltip(raw: unknown): string {
    const first = (Array.isArray(raw) ? raw : [raw])[0] as
      | { data?: [number, number] }
      | undefined;
    if (!first?.data) return '';
    const [day, multiplier] = first.data;
    return formatTooltipBody(day, multiplier, preDecayScore, mutedHex);
  };
}

function buildTooltip(
  theme: Theme,
  preDecayScore: number | null,
  mutedHex: string,
) {
  return {
    trigger: 'axis',
    ...echartsAxisTooltipChrome(theme),
    formatter: buildTooltipFormatter(preDecayScore, mutedHex),
  };
}

function buildXAxis(axis: CartesianAxisColors, fontFamily: string) {
  return {
    type: 'value',
    min: 0,
    max: PR_LOOKBACK_DAYS,
    name: 'days since merge',
    nameLocation: 'middle',
    nameGap: 22,
    nameTextStyle: { color: axis.labelColor, fontSize: 10, fontFamily },
    axisLine: { lineStyle: { color: axis.axisLineColor } },
    axisTick: { show: false },
    axisLabel: { color: axis.labelColor, fontSize: 10 },
    splitLine: { lineStyle: { color: axis.splitLineColor } },
  };
}

function buildYAxis(axis: CartesianAxisColors) {
  return {
    type: 'value',
    min: 0,
    max: 1,
    interval: 0.25,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: axis.labelColor,
      fontSize: 10,
      formatter: formatPercentTick,
    },
    splitLine: { lineStyle: { color: axis.splitLineColor } },
  };
}

function buildMarkLine(
  theme: Theme,
  axis: CartesianAxisColors,
  midpoint: number,
) {
  return {
    symbol: 'none',
    silent: true,
    lineStyle: {
      color: alpha(theme.palette.text.primary, 0.18),
      type: 'dashed',
    },
    label: { color: axis.labelColor, fontSize: 9, formatter: '{b}' },
    data: [{ name: '50% @ midpoint', xAxis: midpoint }],
  };
}

function buildMarkPoint(
  theme: Theme,
  marker: NowMarker | null,
  nowColor: string,
) {
  return {
    symbol: 'circle',
    symbolSize: 12,
    label: {
      show: true,
      color: theme.palette.text.primary,
      fontSize: 10,
      fontWeight: 600,
      formatter: formatNowMarkerLabel,
      position: 'top',
      distance: 10,
    },
    data: buildMarkPointData(marker, nowColor),
  };
}

function buildSeries(
  theme: Theme,
  axis: CartesianAxisColors,
  params: DecayParams,
  seriesData: [number, number][],
  marker: NowMarker | null,
  gradientColors: GradientColors,
) {
  return {
    type: 'line',
    data: seriesData,
    showSymbol: false,
    smooth: false,
    lineStyle: { width: 2.5, color: buildGradient(gradientColors) },
    areaStyle: {
      color: buildGradient(gradientColors, [0.22, 0.16, 0.12, 0.08]),
    },
    markLine: buildMarkLine(theme, axis, params.midpoint),
    markPoint: buildMarkPoint(theme, marker, gradientColors[0]),
  };
}

function buildChartOption(
  theme: Theme,
  params: DecayParams,
  projection: DecayProjection,
  gradientColors: GradientColors,
) {
  const axis = echartsMutedCartesianAxisColors(theme);
  const fontFamily = echartsFontFamily(theme);
  const mutedHex = alpha(theme.palette.text.primary, TEXT_OPACITY.tertiary);
  const marker = resolveNowMarker(projection);
  const seriesData = injectNowPoint(buildDecayCurve(params), marker);
  return {
    ...echartsTransparentBackground(),
    grid: { left: 44, right: 16, top: 28, bottom: 36 },
    tooltip: buildTooltip(theme, projection.preDecayScore, mutedHex),
    xAxis: buildXAxis(axis, fontFamily),
    yAxis: buildYAxis(axis),
    series: [
      buildSeries(theme, axis, params, seriesData, marker, gradientColors),
    ],
  };
}

function PRTimeDecayChart({
  mergedAt,
  prState,
  timeDecayMultiplier,
  earnedScore,
}: PRTimeDecayChartProps) {
  const theme = useTheme();
  const gradientColors = getGradientColors(theme.palette);
  const gradientCss = getGradientCss(gradientColors);
  const { data: generalConfig } = useGeneralConfig();
  const params = useMemo(
    () => resolveDecayParams(generalConfig),
    [generalConfig],
  );
  const projection = useMemo(
    () =>
      buildDecayProjection(
        { mergedAt, prState, timeDecayMultiplier, earnedScore },
        params,
      ),
    [earnedScore, mergedAt, params, prState, timeDecayMultiplier],
  );
  const option = useMemo(
    () => buildChartOption(theme, params, projection, gradientColors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, params, projection],
  );
  const showNow = projection.isMerged && projection.inWindow;
  const muted = alpha(theme.palette.text.primary, TEXT_OPACITY.muted);
  const tertiary = alpha(theme.palette.text.primary, TEXT_OPACITY.tertiary);

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 3,
        p: { xs: 2, sm: 2.5 },
        mb: 3,
        backgroundColor: alpha(theme.palette.text.primary, 0.015),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: alpha(theme.palette.text.primary, TEXT_OPACITY.secondary),
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 600,
            }}
          >
            Time Decay
          </Typography>
          <Typography sx={{ color: tertiary, fontSize: '0.72rem', mt: 0.25 }}>
            {buildDecaySubline(projection)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
          {showNow && projection.chartNowScore != null && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                sx={{
                  color: theme.palette.text.primary,
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {projection.chartNowScore.toFixed(2)}
              </Typography>
              <Typography sx={{ color: muted, fontSize: '0.65rem' }}>
                now score
              </Typography>
            </Box>
          )}
          {showNow && projection.chartNowMultiplier != null && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                sx={{
                  color: alpha(
                    theme.palette.text.primary,
                    TEXT_OPACITY.secondary,
                  ),
                  fontSize: '1rem',
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}
              >
                {projection.chartNowMultiplier.toFixed(2)}×
              </Typography>
              <Typography sx={{ color: muted, fontSize: '0.65rem' }}>
                multiplier
              </Typography>
            </Box>
          )}
          {!projection.isMerged && (
            <Typography
              sx={{ color: tertiary, fontSize: '0.85rem', fontWeight: 600 }}
            >
              Decay starts at merge
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ width: '100%', height: 200 }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
          notMerge
        />
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mt: 1,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ color: tertiary, fontSize: '0.7rem' }}>
            fresh
          </Typography>
          <Box
            sx={{
              width: 80,
              height: 6,
              borderRadius: 3,
              background: gradientCss,
            }}
          />
          <Typography sx={{ color: tertiary, fontSize: '0.7rem' }}>
            stale
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: gradientColors[0],
            }}
          />
          <Typography sx={{ color: tertiary, fontSize: '0.7rem' }}>
            Now
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default PRTimeDecayChart;

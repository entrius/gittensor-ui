import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';

interface SparklineProps {
  values: readonly number[];
  secondaryValues?: readonly number[];
  width?: number;
  height?: number;
  color?: string;
  secondaryColor?: string;
  label?: React.ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
  emphasis?: boolean;
}

interface BarSpec {
  x: number;
  barWidth: number;
  primaryY: number;
  primaryH: number;
  secondaryY: number;
  secondaryH: number;
}

const computeBars = (
  primary: readonly number[],
  secondary: readonly number[] | null,
  width: number,
  height: number,
  scaleMax: number,
  padV = 2,
): BarSpec[] => {
  const cols = primary.length;
  if (cols === 0) return [];
  const slot = width / cols;
  const barWidth = Math.max(1, slot * 0.72);
  const offset = (slot - barWidth) / 2;
  const usable = height - padV * 2;
  const baseline = height - padV;
  return primary.map((p, i) => {
    const s = secondary?.[i] ?? 0;
    const primaryH = scaleMax > 0 ? (p / scaleMax) * usable : 0;
    const secondaryH = scaleMax > 0 ? (s / scaleMax) * usable : 0;
    const x = i * slot + offset;
    return {
      x,
      barWidth,
      primaryY: baseline - primaryH,
      primaryH,
      secondaryY: baseline - primaryH - secondaryH,
      secondaryH,
    };
  });
};

const sumLast = (values: readonly number[], n: number): number =>
  values.slice(-n).reduce((a, b) => a + b, 0);

const Sparkline: React.FC<SparklineProps> = ({
  values,
  secondaryValues,
  width = 96,
  height = 22,
  color = STATUS_COLORS.merged,
  secondaryColor = STATUS_COLORS.info,
  label,
  primaryLabel = 'merged',
  secondaryLabel = 'discovery',
  emphasis = false,
}) => {
  const primaryOpacity = emphasis ? 0.95 : 0.78;
  const secondaryOpacity = emphasis ? 0.95 : 0.78;
  const hasSecondary =
    !!secondaryValues &&
    secondaryValues.length === values.length &&
    secondaryValues.some((v) => v > 0);

  const total = values.reduce((a, b) => a + b, 0);
  const totalSecondary = hasSecondary
    ? secondaryValues!.reduce((a, b) => a + b, 0)
    : 0;
  const last7 = sumLast(values, 7);
  const last7Secondary = hasSecondary ? sumLast(secondaryValues!, 7) : 0;
  const prior7 =
    values.length >= 14
      ? values.slice(-14, -7).reduce((a, b) => a + b, 0)
      : null;

  let trendText = '';
  if (prior7 !== null) {
    if (prior7 === 0 && last7 > 0) trendText = ' · new this week';
    else if (prior7 > 0) {
      const arrow = last7 > prior7 ? '↑' : last7 < prior7 ? '↓' : '·';
      const pct = Math.round((Math.abs(last7 - prior7) / prior7) * 100);
      trendText = ` · ${arrow}${pct}% vs prior 7d`;
    }
  }

  const defaultTooltip: React.ReactNode = (() => {
    if (total === 0 && totalSecondary === 0) {
      return `No PR activity in the last ${values.length} days`;
    }
    if (!hasSecondary) {
      return `${total} ${primaryLabel} in ${values.length}d · ${last7} in the last 7d${trendText}`;
    }
    return (
      <Box sx={{ lineHeight: 1.45 }}>
        <Box sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
          {values.length}d activity{trendText}
        </Box>
        <Box sx={{ fontSize: '0.72rem', opacity: 0.85, mt: '2px' }}>
          <Box component="span" sx={{ color }}>
            ● {primaryLabel}
          </Box>{' '}
          {total} ({last7} this week)
        </Box>
        <Box sx={{ fontSize: '0.72rem', opacity: 0.85 }}>
          <Box component="span" sx={{ color: secondaryColor }}>
            ● {secondaryLabel}
          </Box>{' '}
          {totalSecondary} ({last7Secondary} this week)
        </Box>
      </Box>
    );
  })();

  const tooltip = label ?? defaultTooltip;

  if (values.length === 0 || (total === 0 && totalSecondary === 0)) {
    const lookback = values.length || 30;
    return (
      <Tooltip
        title={tooltip}
        arrow
        placement="top"
        slotProps={tooltipSlotProps}
      >
        <Box
          sx={{
            width,
            height,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"JetBrains Mono", monospace',
            color: 'text.tertiary',
            ...(emphasis
              ? {
                  fontSize: '0.7rem',
                  letterSpacing: '0.3px',
                  opacity: 0.55,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }
              : { fontSize: '0.65rem', opacity: 0.3 }),
          }}
        >
          {emphasis ? `No activity · last ${lookback}d` : '—'}
        </Box>
      </Tooltip>
    );
  }

  const stackedTotals = values.map(
    (v, i) => v + (hasSecondary ? (secondaryValues?.[i] ?? 0) : 0),
  );
  const scaleMax = Math.max(...stackedTotals, 0);

  const bars = computeBars(
    values,
    hasSecondary ? secondaryValues! : null,
    width,
    height,
    scaleMax,
  );

  const cornerRadius = Math.min(1.5, bars[0]?.barWidth / 3 || 0);

  return (
    <Tooltip title={tooltip} arrow placement="top" slotProps={tooltipSlotProps}>
      <Box sx={{ display: 'inline-block', width, height, flexShrink: 0 }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block', overflow: 'hidden' }}
          aria-hidden
        >
          {bars.map((b, i) => (
            <React.Fragment key={i}>
              {b.primaryH > 0 && (
                <rect
                  x={b.x}
                  y={b.primaryY}
                  width={b.barWidth}
                  height={b.primaryH}
                  fill={color}
                  opacity={primaryOpacity}
                  rx={cornerRadius}
                  ry={cornerRadius}
                />
              )}
              {b.secondaryH > 0 && (
                <rect
                  x={b.x}
                  y={b.secondaryY}
                  width={b.barWidth}
                  height={b.secondaryH}
                  fill={secondaryColor}
                  opacity={secondaryOpacity}
                  rx={cornerRadius}
                  ry={cornerRadius}
                />
              )}
            </React.Fragment>
          ))}
        </svg>
      </Box>
    </Tooltip>
  );
};

export default Sparkline;

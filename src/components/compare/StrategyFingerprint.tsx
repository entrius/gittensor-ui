import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { type MinerFingerprint } from '../../hooks/useWatchlistIntel';
import { STATUS_COLORS } from '../../theme';

interface StrategyFingerprintProps {
  fingerprints: MinerFingerprint[];
  isLoading: boolean;
}

const MINER_COLORS = [
  STATUS_COLORS.merged,
  STATUS_COLORS.info,
  STATUS_COLORS.warning,
  STATUS_COLORS.error,
];

const AXES = [
  { key: 'prSize' as const, label: 'PR Size', unit: 'lines' },
  { key: 'tierFocus' as const, label: 'Repo Tier', unit: 'weight' },
  { key: 'cadence' as const, label: 'Cadence', unit: 'PRs/wk' },
  { key: 'diversity' as const, label: 'Diversity', unit: 'ratio' },
  { key: 'complexity' as const, label: 'Complexity', unit: 'tokens' },
];

export const StrategyFingerprint: React.FC<StrategyFingerprintProps> = ({
  fingerprints,
  isLoading,
}) => {
  const theme = useTheme();

  // Normalize each axis to 0–100 scale based on the group max
  const normalizedData = useMemo(() => {
    if (fingerprints.length === 0) return [];

    const maxes = AXES.map((axis) =>
      Math.max(
        ...fingerprints.map((f) => f[axis.key]),
        0.01, // avoid division by zero
      ),
    );

    return fingerprints.map((fp, i) => ({
      ...fp,
      color: MINER_COLORS[i % MINER_COLORS.length],
      normalized: AXES.map((axis, j) => (fp[axis.key] / maxes[j]) * 100),
      raw: AXES.map((axis) => fp[axis.key]),
    }));
  }, [fingerprints]);

  const chartOption = useMemo(() => {
    if (normalizedData.length === 0) return {};

    return {
      backgroundColor: 'transparent',
      legend: {
        data: normalizedData.map((d) => d.author),
        bottom: 0,
        textStyle: {
          color: theme.palette.text.secondary,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
      },
      radar: {
        indicator: AXES.map((axis) => ({
          name: axis.label,
          max: 100,
        })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: theme.palette.text.secondary,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: [
              alpha(theme.palette.common.white, 0.02),
              alpha(theme.palette.common.white, 0.04),
            ],
          },
        },
        splitLine: {
          lineStyle: {
            color: alpha(theme.palette.common.white, 0.08),
          },
        },
        axisLine: {
          lineStyle: {
            color: alpha(theme.palette.common.white, 0.1),
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: normalizedData.map((d) => ({
            name: d.author,
            value: d.normalized,
            areaStyle: {
              color: alpha(d.color, 0.15),
            },
            lineStyle: {
              color: d.color,
              width: 2,
            },
            itemStyle: {
              color: d.color,
            },
            symbol: 'circle',
            symbolSize: 6,
          })),
        },
      ],
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.palette.surface.tooltip,
        borderColor: alpha(theme.palette.common.white, 0.15),
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
        formatter: (params: any) => {
          const fp = normalizedData.find((d) => d.author === params.name);
          if (!fp) return '';
          const labelColor = alpha(theme.palette.text.primary, 0.7);
          const valueColor = theme.palette.text.primary;
          return `<div style="font-family: 'JetBrains Mono', monospace;">
            <div style="font-weight:700;margin-bottom:6px;">${fp.author}</div>
            ${AXES.map(
              (axis, i) =>
                `<div style="font-size:11px;color:${labelColor};">${axis.label}: <span style="color:${valueColor};font-weight:600;">${fp.raw[i].toFixed(1)} ${axis.unit}</span></div>`,
            ).join('')}
          </div>`;
        },
      },
    };
  }, [normalizedData, theme]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (fingerprints.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            color: 'text.secondary',
          }}
        >
          No PR data available to build fingerprints.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          Strategy Fingerprint
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.72rem',
            color: 'text.secondary',
          }}
        >
          Operating style based on merged PRs — not score, but how they earn it.
        </Typography>
      </Box>

      <Box
        sx={{
          height: 420,
          border: `1px solid ${theme.palette.border.light}`,
          borderRadius: 2,
          p: 2,
        }}
      >
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
        />
      </Box>

      {/* Raw values table */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `120px repeat(${normalizedData.length}, 1fr)`,
          gap: 0.5,
          fontSize: '0.7rem',
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        {/* Header */}
        <Box sx={{ color: 'text.secondary', fontWeight: 600, py: 0.5 }}>
          Metric
        </Box>
        {normalizedData.map((d) => (
          <Box
            key={d.githubId}
            sx={{
              color: d.color,
              fontWeight: 600,
              py: 0.5,
              textAlign: 'center',
            }}
          >
            {d.author}
          </Box>
        ))}

        {/* Rows */}
        {AXES.map((axis, i) => (
          <React.Fragment key={axis.key}>
            <Box
              sx={{
                color: 'text.secondary',
                py: 0.5,
                borderTop: `1px solid ${theme.palette.border.light}`,
              }}
            >
              {axis.label}
            </Box>
            {normalizedData.map((d) => (
              <Box
                key={d.githubId}
                sx={{
                  color: 'text.primary',
                  py: 0.5,
                  textAlign: 'center',
                  borderTop: `1px solid ${theme.palette.border.light}`,
                }}
              >
                {d.raw[i].toFixed(1)}{' '}
                <Typography
                  component="span"
                  sx={{ fontSize: '0.6rem', color: 'text.secondary' }}
                >
                  {axis.unit}
                </Typography>
              </Box>
            ))}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

import React from 'react';
import { Box, Typography } from '@mui/material';
import { CHART_COLORS } from '../../theme';
import { credibilityColor } from '../../utils/format';

interface MergeOutcomeBarProps {
  /** Merged PRs / solved issues. */
  merged: number;
  /** Open PRs / open issues. */
  open: number;
  /** Closed-unmerged PRs / closed issues. */
  closed: number;
  /** 0–1 merge/solve rate, shown as the headline figure. */
  credibility: number;
  /** Heading above the bar. */
  title: string;
  /** Label for the merged segment ("Merged" | "Solved"). */
  mergedLabel?: string;
  /** Label for the credibility figure ("Merge rate" | "Solve rate"). */
  rateLabel?: string;
}

const Legend: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
    <Box
      sx={{
        width: 7,
        height: 7,
        borderRadius: '2px',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
    <Typography sx={{ fontSize: '0.68rem', color: 'text.tertiary' }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color }}>
      {value.toLocaleString()}
    </Typography>
  </Box>
);

/**
 * A flat horizontal merged / open / closed bar — a clearer, lower-chrome
 * replacement for the credibility donut. Reads at a glance at any width and
 * stays on the app's border-driven aesthetic (no echarts). The merge/solve
 * rate is the headline figure; the bar shows the underlying split.
 */
const MergeOutcomeBar: React.FC<MergeOutcomeBarProps> = ({
  merged,
  open,
  closed,
  credibility,
  title,
  mergedLabel = 'Merged',
  rateLabel = 'Credibility',
}) => {
  const total = merged + open + closed;
  const rateColor = credibilityColor(credibility);
  const seg = (n: number) => (total > 0 ? `${(n / total) * 100}%` : '0%');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography variant="monoSmall" sx={{ color: 'text.tertiary' }}>
          {title}
        </Typography>
        {total > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography
              sx={{ fontSize: '1.05rem', fontWeight: 700, color: rateColor }}
            >
              {Math.round(credibility * 100)}%
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.tertiary' }}>
              {rateLabel}
            </Typography>
          </Box>
        )}
      </Box>

      {total > 0 ? (
        <>
          <Box
            sx={{
              display: 'flex',
              height: 10,
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: 'border.light',
            }}
          >
            {merged > 0 && (
              <Box
                sx={{
                  width: seg(merged),
                  backgroundColor: CHART_COLORS.merged,
                }}
              />
            )}
            {open > 0 && (
              <Box
                sx={{ width: seg(open), backgroundColor: CHART_COLORS.open }}
              />
            )}
            {closed > 0 && (
              <Box
                sx={{
                  width: seg(closed),
                  backgroundColor: CHART_COLORS.closed,
                }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Legend
              label={mergedLabel}
              value={merged}
              color={CHART_COLORS.merged}
            />
            <Legend label="Open" value={open} color={CHART_COLORS.open} />
            <Legend label="Closed" value={closed} color={CHART_COLORS.closed} />
          </Box>
        </>
      ) : (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.tertiary' }}>
          No activity yet.
        </Typography>
      )}
    </Box>
  );
};

export default MergeOutcomeBar;

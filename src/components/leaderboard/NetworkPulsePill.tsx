import React from 'react';
import { Box, Tooltip, alpha } from '@mui/material';
import theme, { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import { useMinerActivityIndex } from './useMinerActivityIndex';

export const NetworkPulsePill: React.FC = () => {
  const { network } = useMinerActivityIndex({ lookbackDays: 30 });
  const { last7, prior7 } = network;
  if (last7 === 0 && prior7 === 0) return null;
  let label: string;
  let color: string;
  // Low sample (<5 PRs) makes the % delta meaningless — show raw counts instead.
  const lowSample = prior7 < 5;
  if (prior7 === 0) {
    label = `${last7.toLocaleString()} new PR${last7 === 1 ? '' : 's'} this week`;
    color = STATUS_COLORS.success;
  } else if (lowSample) {
    label = `${last7}/${prior7} PRs · last vs prior 7d`;
    color = alpha(theme.palette.common.white, 0.5);
  } else {
    const delta = last7 - prior7;
    const pct = Math.round((Math.abs(delta) / prior7) * 100);
    const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '·';
    label = `${arrow}${pct}% · ${last7.toLocaleString()}/${prior7.toLocaleString()} PRs (7d)`;
    color =
      delta > 0
        ? STATUS_COLORS.success
        : delta < 0
          ? STATUS_COLORS.warningOrange
          : alpha(theme.palette.common.white, 0.5);
  }
  return (
    <Tooltip
      title={
        <Box sx={{ lineHeight: 1.45, maxWidth: 260 }}>
          <Box sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
            Network PR velocity
          </Box>
          <Box sx={{ fontSize: '0.7rem', opacity: 0.82, mt: '2px' }}>
            <Box
              component="span"
              sx={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {last7.toLocaleString()}
            </Box>{' '}
            merged PRs in the last 7 days vs{' '}
            <Box
              component="span"
              sx={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {prior7.toLocaleString()}
            </Box>{' '}
            the week before. Tracks rolling network activity — the daily
            emissions pool only shows the snapshot incentive rate.
          </Box>
        </Box>
      }
      arrow
      placement="top"
      slotProps={tooltipSlotProps}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          px: '8px',
          py: '3px',
          borderRadius: 999,
          fontSize: '0.66rem',
          fontWeight: 700,
          letterSpacing: '0.2px',
          color,
          backgroundColor: alpha(color, 0.12),
          border: `1px solid ${alpha(color, 0.3)}`,
          fontFamily: '"JetBrains Mono", monospace',
          cursor: 'help',
          alignSelf: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
};

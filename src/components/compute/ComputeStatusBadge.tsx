import React from 'react';
import { Box, Tooltip, alpha } from '@mui/material';
import type { ServingMinerStatus } from '../../api';
import { tooltipSlotProps } from '../../theme';
import { COMPUTE_STATUS_META } from './computeFormat';

interface ComputeStatusBadgeProps {
  status: ServingMinerStatus;
  size?: 'small' | 'medium';
}

/** Pill for the serving status — ready / probation / quarantined. */
export const ComputeStatusBadge: React.FC<ComputeStatusBadgeProps> = ({
  status,
  size = 'small',
}) => {
  const meta = COMPUTE_STATUS_META[status] ?? COMPUTE_STATUS_META.probation;
  const isMedium = size === 'medium';
  return (
    <Tooltip
      title={`${meta.label} · ${meta.hint}`}
      arrow
      placement="top"
      slotProps={tooltipSlotProps}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          px: isMedium ? '10px' : '7px',
          py: isMedium ? '4px' : '2px',
          borderRadius: '999px',
          backgroundColor: alpha(meta.color, 0.12),
          border: `1px solid ${alpha(meta.color, 0.32)}`,
          color: meta.color,
          fontSize: isMedium ? '0.78rem' : '0.64rem',
          fontWeight: 700,
          letterSpacing: '0.4px',
          lineHeight: 1,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Box
          component="span"
          aria-hidden
          sx={{
            width: isMedium ? 7 : 5,
            height: isMedium ? 7 : 5,
            borderRadius: '50%',
            backgroundColor: meta.color,
          }}
        />
        {meta.label}
      </Box>
    </Tooltip>
  );
};

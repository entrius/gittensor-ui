import React from 'react';
import { Box, Tooltip, alpha } from '@mui/material';
import { tooltipSlotProps } from '../../theme';
import { FLEET_STATUS_META, type FleetRowStatus } from './fleetFormat';

/** Pill for a card's state (or its box's, when the box has no proven cards). */
export const FleetStatusChip: React.FC<{ status: FleetRowStatus }> = ({
  status,
}) => {
  const meta = FLEET_STATUS_META[status];
  return (
    <Tooltip
      title={meta.hint}
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
          px: '7px',
          py: '2px',
          borderRadius: '999px',
          backgroundColor: alpha(meta.color, 0.12),
          border: `1px solid ${alpha(meta.color, 0.32)}`,
          color: meta.color,
          fontSize: '0.64rem',
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
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: meta.color,
          }}
        />
        {meta.label}
      </Box>
    </Tooltip>
  );
};

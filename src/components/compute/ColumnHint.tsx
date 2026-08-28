import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { tooltipSlotProps } from '../../theme';

interface ColumnHintProps {
  label: string;
  hint: string;
}

/** Column / KPI label with an explanatory tooltip. */
export const ColumnHint: React.FC<ColumnHintProps> = ({ label, hint }) => (
  <Tooltip title={hint} arrow placement="top" slotProps={tooltipSlotProps}>
    <Box
      component="span"
      sx={{
        textDecoration: 'underline dotted',
        textUnderlineOffset: 3,
        cursor: 'help',
      }}
    >
      {label}
    </Box>
  </Tooltip>
);

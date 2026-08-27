import React from 'react';
import { Box, Tooltip, useTheme } from '@mui/material';
import { tooltipSlotProps } from '../../theme';
import { classifyMissReason } from './computeFormat';

interface MissReasonTextProps {
  reason: string | null | undefined;
  /** Clamp width; the full text lives in the tooltip. */
  maxWidth?: number | string;
}

/** Single-line, clamped miss reason. Strikes red, everything else neutral. */
export const MissReasonText: React.FC<MissReasonTextProps> = ({
  reason,
  maxWidth = 260,
}) => {
  const theme = useTheme();
  const trimmed = reason?.trim();
  if (!trimmed) {
    return <Box sx={{ color: theme.palette.text.secondary }}>—</Box>;
  }
  const { label, severity } = classifyMissReason(trimmed);
  return (
    <Tooltip title={label} arrow placement="top" slotProps={tooltipSlotProps}>
      <Box
        component="span"
        sx={{
          display: 'block',
          maxWidth,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color:
            severity === 'strike'
              ? theme.palette.status.error
              : theme.palette.text.secondary,
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
};

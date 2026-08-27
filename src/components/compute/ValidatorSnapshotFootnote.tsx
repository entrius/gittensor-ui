import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { TEXT_OPACITY } from '../../theme';
import { CopyableHotkey } from './CopyableHotkey';

interface ValidatorSnapshotFootnoteProps {
  validatorHotkey: string | null | undefined;
}

/**
 * Required on every compute page: the numbers are one validator's audit,
 * not subnet consensus.
 */
export const ValidatorSnapshotFootnote: React.FC<
  ValidatorSnapshotFootnoteProps
> = ({ validatorHotkey }) => {
  const theme = useTheme();
  const muted = alpha(theme.palette.common.white, TEXT_OPACITY.muted);
  return (
    <Box
      component="footer"
      sx={{
        borderTop: `1px solid ${theme.palette.border.light}`,
        pt: 1.5,
        mt: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.5,
          color: muted,
          lineHeight: 1.5,
        }}
      >
        Snapshot as observed by validator{' '}
        {validatorHotkey ? (
          <CopyableHotkey
            hotkey={validatorHotkey}
            fontSize="0.72rem"
            label="Copy validator hotkey"
          />
        ) : (
          <Box component="span">(unknown)</Box>
        )}
        . Other validators run their own audits; scores and payouts shown here
        are estimates, not consensus.
      </Typography>
    </Box>
  );
};

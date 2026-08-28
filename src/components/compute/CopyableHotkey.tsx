import React from 'react';
import { Box, ButtonBase, Tooltip, alpha } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';
import { tooltipSlotProps } from '../../theme';
import { shortHotkey } from './computeFormat';

interface CopyableHotkeyProps {
  hotkey: string;
  /** Visible characters on each end of the truncated hotkey. */
  edge?: number;
  fontSize?: string;
  label?: string;
}

/** Truncated hotkey with click-to-copy; full hotkey in the tooltip. */
export const CopyableHotkey: React.FC<CopyableHotkeyProps> = ({
  hotkey,
  edge = 6,
  fontSize = '0.8rem',
  label = 'Copy hotkey',
}) => {
  const { copied, copy, liveRegion } = useClipboardCopy({
    copiedMessage: 'Hotkey copied to clipboard',
  });
  if (!hotkey) return null;
  return (
    <>
      <Tooltip
        title={copied ? 'Copied' : hotkey}
        arrow
        placement="top"
        slotProps={tooltipSlotProps}
      >
        <ButtonBase
          onClick={(event) => {
            event.stopPropagation();
            void copy(hotkey);
          }}
          aria-label={label}
          disableRipple
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            borderRadius: '4px',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize,
            color: (t) =>
              copied ? t.palette.status.success : t.palette.text.primary,
            transition: 'color 0.15s ease',
            '&:hover': { color: (t) => t.palette.primary.light },
            '&:focus-visible': {
              outline: (t) => `2px solid ${t.palette.primary.main}`,
              outlineOffset: '2px',
            },
          }}
        >
          <Box component="span">{shortHotkey(hotkey, edge)}</Box>
          {copied ? (
            <CheckIcon sx={{ fontSize: '0.9em' }} aria-hidden />
          ) : (
            <ContentCopyIcon
              sx={{
                fontSize: '0.85em',
                color: (t) => alpha(t.palette.text.primary, 0.5),
              }}
              aria-hidden
            />
          )}
        </ButtonBase>
      </Tooltip>
      {liveRegion}
    </>
  );
};

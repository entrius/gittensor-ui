import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { type KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

type ShortcutsHelpDialogProps = {
  open: boolean;
  shortcuts: KeyboardShortcut[];
  onClose: () => void;
};

const shortcutKeySx = {
  minWidth: 30,
  px: 0.8,
  py: 0.35,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'border.light',
  backgroundColor: 'surface.light',
  color: 'text.primary',
  fontSize: '0.72rem',
  lineHeight: 1,
  textAlign: 'center',
  fontWeight: 700,
} as const;

const ShortcutsHelpDialog: React.FC<ShortcutsHelpDialogProps> = ({
  open,
  shortcuts,
  onClose,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="xs"
    aria-labelledby="keyboard-shortcuts-title"
    PaperProps={{
      sx: (theme) => ({
        backgroundColor: theme.palette.background.paper,
        backgroundImage: 'none',
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 2,
      }),
    }}
  >
    <DialogTitle
      id="keyboard-shortcuts-title"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        pr: 1,
      }}
    >
      <Typography variant="h6" component="span">
        Keyboard shortcuts
      </Typography>
      <IconButton aria-label="close keyboard shortcuts" onClick={onClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
    <DialogContent sx={{ pt: 0, pb: 2.5 }}>
      <Stack spacing={1}>
        {shortcuts.map((shortcut) => (
          <Box
            key={`${shortcut.keys.join('-')}-${shortcut.label}`}
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              px: 1,
              py: 0.9,
              borderRadius: 1.5,
              backgroundColor: theme.palette.surface.subtle,
              border: `1px solid ${theme.palette.border.subtle}`,
            })}
          >
            <Typography sx={{ color: 'text.primary', fontSize: '0.9rem' }}>
              {shortcut.label}
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              aria-label={shortcut.keys.join(' then ')}
            >
              {shortcut.keys.map((key) => (
                <Typography
                  key={key}
                  component="kbd"
                  sx={(theme) => ({
                    ...shortcutKeySx,
                    fontFamily: theme.typography.fontFamily,
                  })}
                >
                  {key}
                </Typography>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </DialogContent>
  </Dialog>
);

export default ShortcutsHelpDialog;

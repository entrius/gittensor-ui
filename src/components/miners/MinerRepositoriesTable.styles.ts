import { type Theme, alpha } from '@mui/material';
import { type SxProps } from '@mui/system';
import { scrollbarSx } from '../../theme';

export const getHeaderCellStyle = (theme: Theme) => ({
  backgroundColor: theme.palette.surface.elevated,
  backdropFilter: 'blur(8px)',
  color: alpha(theme.palette.text.primary, 0.7),
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: `1px solid ${theme.palette.border.light}`,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
});

export const getBodyCellStyle = (theme: Theme) => ({
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.border.light}`,
  fontSize: '0.85rem',
});

export const sortLabelSx: SxProps<Theme> = {
  color: 'inherit',
  '&:hover': {
    color: (t: Theme) => alpha(t.palette.text.primary, 0.9),
  },
  '&.Mui-active': {
    color: (t: Theme) => alpha(t.palette.text.primary, 0.9),
    '& .MuiTableSortLabel-icon': {
      color: (t: Theme) => `${alpha(t.palette.text.primary, 0.9)} !important`,
    },
  },
};

export const searchFieldSx: SxProps<Theme> = {
  mt: 2,
  maxWidth: 400,
  minWidth: 350,
  '& .MuiOutlinedInput-root': {
    fontSize: '0.8rem',
    color: 'text.primary',
    backgroundColor: 'surface.subtle',
    borderRadius: 2,
    '& fieldset': { borderColor: 'border.light' },
    '&:hover fieldset': { borderColor: 'border.medium' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
};

export const tableContainerSx: SxProps<Theme> = {
  overflowY: 'auto',
  overflowX: 'auto',
  ...scrollbarSx,
};

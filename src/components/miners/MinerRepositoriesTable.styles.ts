import { type Theme } from '@mui/material';
import { type SxProps } from '@mui/system';

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

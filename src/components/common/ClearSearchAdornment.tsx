import CloseIcon from '@mui/icons-material/Close';
import {
  IconButton,
  InputAdornment,
  type SxProps,
  type Theme,
} from '@mui/material';
import type React from 'react';

interface ClearSearchAdornmentProps {
  visible: boolean;
  onClear: () => void;
  sx?: SxProps<Theme>;
}

export const ClearSearchAdornment: React.FC<ClearSearchAdornmentProps> = ({
  visible,
  onClear,
  sx = { color: 'text.tertiary' },
}) => {
  if (!visible) return null;

  return (
    <InputAdornment position="end">
      <IconButton
        size="small"
        onClick={onClear}
        onMouseDown={(e) => e.preventDefault()}
        edge="end"
        aria-label="clear search"
        sx={sx}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </InputAdornment>
  );
};

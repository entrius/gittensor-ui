import React from 'react';
import {
  Box,
  IconButton,
  Typography,
  alpha,
  type SxProps,
  type Theme,
} from '@mui/material';
import {
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

const navButtonSx: SxProps<Theme> = {
  p: 0.25,
  color: (t) => alpha(t.palette.text.primary, 0.6),
  '&:hover': { color: 'text.primary' },
  '&.Mui-focusVisible': {
    backgroundColor: (t) => alpha(t.palette.primary.main, 0.2),
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: '-2px',
    color: 'text.primary',
  },
  '&.Mui-disabled': { opacity: 0.3 },
};

const navIconSx = { fontSize: '1.2rem' };

const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 1.5,
        borderTop: '1px solid',
        borderColor: 'border.subtle',
      }}
    >
      <IconButton
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        aria-label="Previous page"
        size="small"
        sx={navButtonSx}
      >
        <PrevIcon sx={navIconSx} />
      </IconButton>
      <Typography
        sx={{
          fontSize: '0.75rem',
          color: (t) => alpha(t.palette.text.primary, 0.5),
        }}
      >
        {page + 1} / {totalPages}
      </Typography>
      <IconButton
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="Next page"
        size="small"
        sx={navButtonSx}
      >
        <NextIcon sx={navIconSx} />
      </IconButton>
    </Box>
  );
};

export default TablePagination;

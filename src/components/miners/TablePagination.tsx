import React from 'react';
import { Box, IconButton, Typography, alpha } from '@mui/material';
import {
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const canGoPrev = page > 0;
  const canGoNext = page < totalPages - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(page + 1);
    }
  };

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
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous page"
        size="small"
        sx={{
          p: 0.25,
          color: (t) => alpha(t.palette.text.primary, 0.6),
          '&:hover': { color: 'text.primary' },
          '&.Mui-disabled': { opacity: 0.3 },
        }}
      >
        <PrevIcon sx={{ fontSize: '1.2rem' }} />
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
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next page"
        size="small"
        sx={{
          p: 0.25,
          color: (t) => alpha(t.palette.text.primary, 0.6),
          '&:hover': { color: 'text.primary' },
          '&.Mui-disabled': { opacity: 0.3 },
        }}
      >
        <NextIcon sx={{ fontSize: '1.2rem' }} />
      </IconButton>
    </Box>
  );
};

export default TablePagination;

import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
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
      <Box
        onClick={handlePrev}
        sx={{
          cursor: canGoPrev ? 'pointer' : 'default',
          opacity: canGoPrev ? 1 : 0.3,
          display: 'flex',
          alignItems: 'center',
          color: (t) => alpha(t.palette.text.primary, 0.6),
          '&:hover': canGoPrev ? { color: 'text.primary' } : {},
        }}
      >
        <PrevIcon sx={{ fontSize: '1.2rem' }} />
      </Box>
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          color: (t) => alpha(t.palette.text.primary, 0.5),
        }}
      >
        {page + 1} / {totalPages}
      </Typography>
      <Box
        onClick={handleNext}
        sx={{
          cursor: canGoNext ? 'pointer' : 'default',
          opacity: canGoNext ? 1 : 0.3,
          display: 'flex',
          alignItems: 'center',
          color: (t) => alpha(t.palette.text.primary, 0.6),
          '&:hover': canGoNext ? { color: 'text.primary' } : {},
        }}
      >
        <NextIcon sx={{ fontSize: '1.2rem' }} />
      </Box>
    </Box>
  );
};

export default TablePagination;

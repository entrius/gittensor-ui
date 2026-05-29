import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';

interface TableSearchFilterProps {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  popoverTitle?: string;
  placeholder?: string;
}

export const TableSearchFilter: React.FC<TableSearchFilterProps> = ({
  value,
  onChange,
  label = 'Search',
  popoverTitle = 'Search',
  placeholder = 'Search…',
}) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const isOpen = Boolean(anchor);

  const open = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget);
  }, []);

  const close = useCallback(() => {
    setAnchor(null);
  }, []);

  const clear = useCallback(() => {
    onChange('');
    close();
  }, [onChange, close]);

  const isFiltering = Boolean(value.trim());

  return (
    <>
      <Button
        size="small"
        onClick={open}
        aria-haspopup="true"
        aria-expanded={isOpen}
        endIcon={<ArrowDropDownIcon sx={{ fontSize: '1rem' }} />}
        sx={{
          color: isFiltering ? 'text.primary' : 'text.tertiary',
          backgroundColor: isFiltering ? 'border.subtle' : 'transparent',
          borderRadius: '6px',
          px: 2,
          minWidth: 'auto',
          textTransform: 'none',
          fontSize: '0.8rem',
          border: '1px solid',
          borderColor: isFiltering ? 'border.light' : 'transparent',
          '&:hover': { backgroundColor: 'border.light' },
        }}
      >
        {!isFiltering ? (
          label
        ) : (
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Box
              component="span"
              sx={{
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {value.trim()}
            </Box>
            <Box
              component="span"
              role="button"
              aria-label="Clear search"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                clear();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation();
                  event.preventDefault();
                  clear();
                }
              }}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                color: 'text.tertiary',
                cursor: 'pointer',
                '&:hover': { color: 'text.primary' },
              }}
            >
              <CloseIcon sx={{ fontSize: '0.85rem' }} />
            </Box>
          </Stack>
        )}
      </Button>
      <Popover
        open={isOpen}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: {
              mt: 0.5,
              width: 280,
              backgroundColor: 'background.default',
              backgroundImage: 'none',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'border.light',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.secondary',
              }}
            >
              {popoverTitle}
            </Typography>
            {isFiltering && (
              <IconButton
                size="small"
                aria-label="Clear search"
                onClick={clear}
                sx={{
                  p: 0.25,
                  color: 'text.tertiary',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <CloseIcon sx={{ fontSize: '0.95rem' }} />
              </IconButton>
            )}
          </Stack>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ fontSize: '0.95rem', color: 'text.tertiary' }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.8rem',
                color: 'text.primary',
                backgroundColor: 'transparent',
                height: 30,
                borderRadius: 1.5,
                '& fieldset': { borderColor: 'border.light' },
                '&:hover fieldset': { borderColor: 'border.medium' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
            }}
          />
        </Box>
      </Popover>
    </>
  );
};

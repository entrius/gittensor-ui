import React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { TextField, InputAdornment } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ClearSearchAdornment } from './ClearSearchAdornment';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  width?: number | string;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  width = 180,
  placeholder = 'Search...',
}) => (
  <TextField
    placeholder={placeholder}
    size="small"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon
            sx={(theme) => ({
              color: theme.palette.text.tertiary,
              fontSize: '1rem',
            })}
          />
        </InputAdornment>
      ),
      endAdornment: (
        <ClearSearchAdornment
          visible={Boolean(value)}
          onClear={() => onChange('')}
        />
      ),
    }}
    sx={[
      (theme) => ({
        width,
        '& .MuiOutlinedInput-root': {
          color: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.background.default, 0.24),
          fontSize: '0.8rem',
          borderRadius: 2,
          height: 32,
          '& fieldset': { borderColor: theme.palette.border.light },
          '&:hover fieldset': { borderColor: theme.palette.border.medium },
          '&.Mui-focused fieldset': {
            borderColor: alpha(theme.palette.text.primary, 0.24),
          },
        },
      }),
    ]}
  />
);

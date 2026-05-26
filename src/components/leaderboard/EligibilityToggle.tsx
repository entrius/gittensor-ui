import React from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { FONTS } from './types';

export type EligibilityFilter = 'all' | 'eligible' | 'ineligible';

export const ELIGIBILITY_OPTIONS: Array<{
  value: EligibilityFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'eligible', label: 'Eligible' },
  { value: 'ineligible', label: 'Ineligible' },
];

interface EligibilityToggleProps {
  value: EligibilityFilter;
  onChange: (next: EligibilityFilter) => void;
  /** Tighter pills for the dual watchlist bar. */
  compact?: boolean;
}

export const EligibilityToggle: React.FC<EligibilityToggleProps> = ({
  value,
  onChange,
  compact = false,
}) => (
  <Box
    sx={(theme) => ({
      display: 'inline-flex',
      gap: compact ? 0.35 : 0.5,
      p: compact ? 0.35 : 0.5,
      borderRadius: 1.75,
      backgroundColor: theme.palette.surface.light,
      flexShrink: 0,
    })}
  >
    {ELIGIBILITY_OPTIONS.map((option) => {
      const isActive = value === option.value;
      return (
        <Box
          key={option.value}
          component="button"
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(option.value)}
          sx={(theme) => ({
            px: compact ? 1 : 1.5,
            height: compact ? 22 : 24,
            display: 'flex',
            alignItems: 'center',
            border: 0,
            borderRadius: 1.25,
            backgroundColor: isActive
              ? alpha(theme.palette.text.primary, 0.15)
              : 'transparent',
            color: isActive
              ? theme.palette.text.primary
              : theme.palette.text.tertiary,
            cursor: 'pointer',
            fontFamily: FONTS.mono,
            fontSize: compact ? '0.65rem' : '0.72rem',
            fontWeight: isActive ? 600 : 500,
            lineHeight: 1,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: alpha(theme.palette.text.primary, 0.1),
              color: theme.palette.text.primary,
            },
            '&:focus-visible': {
              outline: `1px solid ${theme.palette.border.medium}`,
              outlineOffset: 1,
            },
          })}
        >
          {option.label}
        </Box>
      );
    })}
  </Box>
);

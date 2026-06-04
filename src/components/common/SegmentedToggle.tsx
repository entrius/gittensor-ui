import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
  /** Optional muted count shown after the label. */
  count?: number;
}

interface SegmentedToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedToggleOption<T>>;
  ariaLabel?: string;
}

/**
 * Segmented pill toggle — a bordered container with one elevated active pill,
 * each segment optionally showing a muted count. Shared by the dashboard filter
 * switches (eligibility, PR status, issue status) so they read identically.
 */
function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: SegmentedToggleProps<T>) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_e, v: T | null) => v && onChange(v)}
      size="small"
      aria-label={ariaLabel}
      sx={{
        border: '1px solid',
        borderColor: 'border.light',
        borderRadius: 2,
        p: 0.5,
        gap: 0.5,
        flexWrap: 'wrap',
        // Each segment reads as its own pill, not a merged button group.
        '& .MuiToggleButtonGroup-grouped': {
          m: 0,
          border: '1px solid transparent',
          borderRadius: '6px !important',
        },
        '& .MuiToggleButton-root': {
          textTransform: 'none',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: 'text.secondary',
          px: 1.25,
          py: 0.4,
          lineHeight: 1.2,
          transition: 'all 0.2s',
          '&:hover': {
            color: 'text.primary',
            backgroundColor: 'surface.light',
          },
          '&.Mui-selected': {
            color: 'text.primary',
            fontWeight: 700,
            backgroundColor: 'surface.elevated',
            borderColor: 'border.medium',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
            '&:hover': { backgroundColor: 'surface.elevated' },
          },
        },
      }}
    >
      {options.map((o) => (
        <ToggleButton key={o.value} value={o.value}>
          {o.label}
          {o.count !== undefined && (
            <Box
              component="span"
              sx={{ ml: 0.6, color: 'text.tertiary', fontWeight: 600 }}
            >
              {o.count}
            </Box>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export default SegmentedToggle;

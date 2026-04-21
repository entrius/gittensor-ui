import React, { memo } from 'react';
import { Button, Box, alpha } from '@mui/material';

export type FilterButtonInactiveAppearance =
  | 'muted'
  | 'full-accent'
  | 'neutral'
  | 'icon-accent';

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  color: string;
  activeTextColor?: string;
  icon?: React.ReactNode;
  /** How the chip looks when not selected. Default `muted` matches generic tables. */
  inactiveAppearance?: FilterButtonInactiveAppearance;
}

/** Softer pill — less heavy than solid fill, still readable */
const BADGE_INACTIVE_BG = alpha('#30363d', 0.55);
const BADGE_INACTIVE_LABEL = alpha('#ffffff', 0.46);

/** Whitish tint of the accent (e.g. pale mint on green Open) — matches GitHub-style count pills */
const activeBadgeLabelColor = (accent: string) =>
  `color-mix(in srgb, ${accent} 26%, #ffffff 74%)`;

const FilterButton = memo(function FilterButton({
  label,
  isActive,
  onClick,
  count,
  color,
  activeTextColor = '',
  icon,
  inactiveAppearance = 'muted',
}: FilterButtonProps) {
  const activeForeground = isActive && activeTextColor ? activeTextColor : null;

  const inactiveBorder =
    inactiveAppearance === 'full-accent'
      ? alpha(color, 0.32)
      : alpha('#ffffff', 0.12);

  const inactiveLabelColor =
    inactiveAppearance === 'full-accent'
      ? color
      : inactiveAppearance === 'neutral'
        ? 'text.primary'
        : inactiveAppearance === 'icon-accent'
          ? 'text.secondary'
          : 'text.secondary';

  const inactiveIconColor =
    inactiveAppearance === 'full-accent'
      ? color
      : inactiveAppearance === 'neutral'
        ? color
        : inactiveAppearance === 'icon-accent'
          ? color
          : 'text.tertiary';

  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{
        color: isActive ? activeTextColor || color : inactiveLabelColor,
        backgroundColor: isActive ? alpha(color, 0.22) : 'transparent',
        borderRadius: '8px',
        px: 1.25,
        py: 0.65,
        minWidth: 'auto',
        textTransform: 'none',
        fontSize: '0.82rem',
        fontWeight: isActive ? 700 : 500,
        alignItems: 'center',
        border: isActive ? `1px solid ${color}` : `1px solid ${inactiveBorder}`,
        boxShadow: isActive
          ? `0 0 0 1px ${alpha(color, 0.35)}, 0 2px 8px ${alpha(color, 0.12)}`
          : 'none',
        '&:hover': {
          backgroundColor: isActive
            ? alpha(color, 0.28)
            : alpha('#ffffff', 0.04),
          borderColor: isActive ? color : alpha('#ffffff', 0.2),
        },
      }}
    >
      {icon ? (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            mr: 0.8,
            color: isActive ? activeTextColor || color : inactiveIconColor,
            lineHeight: 0,
          }}
        >
          {icon}
        </Box>
      ) : null}
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          lineHeight: 1,
        }}
      >
        {label}
      </Box>
      {count !== undefined && (
        <Box
          component="span"
          sx={{
            ml: 0.8,
            boxSizing: 'border-box',
            minWidth: 20,
            height: 20,
            px: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
            flexShrink: 0,
            borderRadius: '10px',
            fontSize: '0.6875rem',
            fontWeight: isActive ? 700 : 600,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: '20px',
            color: isActive
              ? activeForeground
                ? `color-mix(in srgb, ${activeForeground} 82%, #ffffff 18%)`
                : activeBadgeLabelColor(color)
              : BADGE_INACTIVE_LABEL,
            backgroundColor: isActive
              ? alpha(color, activeForeground ? 0.24 : 0.22)
              : BADGE_INACTIVE_BG,
            textAlign: 'center',
          }}
        >
          {count}
        </Box>
      )}
    </Button>
  );
});

export default FilterButton;

import React from 'react';
import { alpha, Box } from '@mui/material';
import type { Percentile } from '../../utils/minerBenchmark';
import { STATUS_COLORS } from '../../theme';

interface PercentileBadgeProps {
  percentile: Percentile | null | undefined;
  /** Kept for call-site compatibility; layout is identical either way. */
  inline?: boolean;
}

/**
 * Peer-standing pill — "top 8%" / "bottom 12%". Top-half standings read in the
 * success tone with a tinted fill; the rest stay muted so they inform without
 * alarming. Renders nothing when the percentile can't be computed.
 */
const PercentileBadge: React.FC<PercentileBadgeProps> = ({ percentile }) => {
  if (!percentile) return null;
  const strong = percentile.topPct <= 0.5;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 0.6,
        py: 0.15,
        borderRadius: 0.75,
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
        color: strong ? STATUS_COLORS.success : 'text.tertiary',
        backgroundColor: strong
          ? alpha(STATUS_COLORS.success, 0.14)
          : 'surface.light',
        border: `1px solid ${
          strong ? alpha(STATUS_COLORS.success, 0.3) : 'transparent'
        }`,
      }}
    >
      {percentile.label}
    </Box>
  );
};

export default PercentileBadge;

import React from 'react';
import { Box, Tooltip, Typography, alpha } from '@mui/material';
import { tooltipSlotProps } from '../../theme';
import {
  formatAlphaPerDay,
  formatTaoPerDay,
  formatUsdPerDay,
  hasEarningsPrediction,
  type PredictedEarningsInput,
} from '../../utils/predictedEarnings';
import { isOpenPr } from '../../utils/prStatus';

interface PredictedEarningsCellProps {
  pr: PredictedEarningsInput;
  compact?: boolean;
}

const EmDash: React.FC = () => (
  <Typography
    component="span"
    sx={{
      fontSize: { xs: '0.7rem', sm: '0.75rem' },
      color: (t) => alpha(t.palette.text.primary, 0.3),
    }}
  >
    —
  </Typography>
);

const TooltipBody: React.FC<{ pr: PredictedEarningsInput }> = ({ pr }) => {
  const alphaStr = formatAlphaPerDay(pr.predictedAlphaPerDay);
  const taoStr = formatTaoPerDay(pr.predictedTaoPerDay);
  const potential = pr.potentialScore;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography
        sx={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          opacity: 0.7,
        }}
      >
        If merged now
      </Typography>
      {alphaStr && (
        <Typography sx={{ fontSize: '0.72rem' }}>α/day: {alphaStr}</Typography>
      )}
      {taoStr && (
        <Typography sx={{ fontSize: '0.72rem' }}>TAO/day: {taoStr}</Typography>
      )}
      {potential != null && Number.isFinite(potential) && (
        <Typography sx={{ fontSize: '0.72rem' }}>
          Potential score: {potential.toFixed(2)}
        </Typography>
      )}
      <Typography
        sx={{
          fontSize: '0.68rem',
          opacity: 0.55,
          mt: 0.5,
        }}
      >
        Estimate only. Actual payout depends on validator consensus and network
        share at merge time.
      </Typography>
    </Box>
  );
};

const PredictedEarningsCell: React.FC<PredictedEarningsCellProps> = ({
  pr,
  compact,
}) => {
  if (!isOpenPr(pr)) return <EmDash />;
  if (!hasEarningsPrediction(pr)) return <EmDash />;

  const usdLabel = formatUsdPerDay(pr.predictedUsdPerDay);
  if (!usdLabel) return <EmDash />;

  return (
    <Tooltip
      title={<TooltipBody pr={pr} />}
      arrow
      placement="left"
      slotProps={tooltipSlotProps}
    >
      <Box
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          cursor: 'help',
        }}
      >
        <Typography
          sx={{
            fontSize: compact ? '0.72rem' : { xs: '0.72rem', sm: '0.78rem' },
            fontWeight: 600,
            color: 'status.success',
            lineHeight: 1.15,
          }}
        >
          ~{usdLabel}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.6rem',
            color: (t) => alpha(t.palette.text.primary, 0.5),
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          /day
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default PredictedEarningsCell;

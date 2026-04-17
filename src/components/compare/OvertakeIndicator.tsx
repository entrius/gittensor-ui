import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { STATUS_COLORS } from '../../theme';
import { computeOvertakeEta } from '../../hooks/usePulseBoard';

interface OvertakeIndicatorProps {
  nameA: string;
  scoreA: number;
  velocityA: number | null;
  nameB: string;
  scoreB: number;
  velocityB: number | null;
}

export const OvertakeIndicator: React.FC<OvertakeIndicatorProps> = ({
  nameA,
  scoreA,
  velocityA,
  nameB,
  scoreB,
  velocityB,
}) => {
  const theme = useTheme();

  if (velocityA === null || velocityB === null) return null;

  // Determine who is the leader and who is the chaser
  const aLeads = scoreA >= scoreB;
  const leader = aLeads
    ? { name: nameA, score: scoreA, velocity: velocityA }
    : { name: nameB, score: scoreB, velocity: velocityB };
  const chaser = aLeads
    ? { name: nameB, score: scoreB, velocity: velocityB }
    : { name: nameA, score: scoreA, velocity: velocityA };

  const eta = computeOvertakeEta(
    leader.score,
    leader.velocity,
    chaser.score,
    chaser.velocity,
  );

  const gap = leader.score - chaser.score;
  const dailyGain = chaser.velocity - leader.velocity;

  // Only show if the chaser is actually gaining
  if (dailyGain <= 0 || eta === null) {
    // Show a stable message instead
    if (gap > 0) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 1.5,
            px: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontFamily: '"JetBrains Mono", monospace',
              color: 'text.secondary',
              textAlign: 'center',
            }}
          >
            {leader.name} leads by {gap.toFixed(2)} pts — gap is stable or
            widening
          </Typography>
        </Box>
      );
    }
    return null;
  }

  // Progress bar: how much of the gap has been closed
  // If the chaser started further behind and is now closer, show progress
  const progressPct = Math.max(
    0,
    Math.min(100, (1 - gap / (gap + dailyGain * (eta ?? 60))) * 100),
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        border: `1px dashed ${theme.palette.border.light}`,
        backgroundColor: alpha(STATUS_COLORS.info, 0.04),
      }}
    >
      <Typography
        sx={{
          fontSize: '0.72rem',
          fontFamily: '"JetBrains Mono", monospace',
          color: 'text.primary',
          textAlign: 'center',
          fontWeight: 600,
        }}
      >
        {chaser.name} is gaining on {leader.name} at +{dailyGain.toFixed(2)}{' '}
        pts/day
      </Typography>
      <Typography
        sx={{
          fontSize: '0.68rem',
          fontFamily: '"JetBrains Mono", monospace',
          color: STATUS_COLORS.info,
          textAlign: 'center',
        }}
      >
        Overtake in ~{Math.ceil(eta)} {Math.ceil(eta) === 1 ? 'day' : 'days'} if
        pace holds
      </Typography>

      {/* Progress bar */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 200,
          height: 6,
          borderRadius: 1,
          backgroundColor: 'border.light',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${progressPct}%`,
            borderRadius: 1,
            backgroundColor: STATUS_COLORS.info,
            transition: 'width 0.6s ease',
          }}
        />
      </Box>
      <Typography
        sx={{
          fontSize: '0.62rem',
          color: 'text.secondary',
        }}
      >
        {progressPct.toFixed(0)}% gap closed
      </Typography>
    </Box>
  );
};

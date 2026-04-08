import React from 'react';
import { Box, Card, Typography, useTheme } from '@mui/material';
import { TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { useMinerStats } from '../../api';
import { parseNumber } from '../../utils/ExplorerUtils';

interface MinerFocusCardProps {
  githubId: string;
}

export const MinerFocusCard: React.FC<MinerFocusCardProps> = ({ githubId }) => {
  const theme = useTheme();
  const { data: minerStats } = useMinerStats(githubId);

  if (!minerStats) return null;

  const usdPerDay = parseNumber(minerStats.usdPerDay);
  const totalScore = parseNumber(minerStats.totalScore);
  const isEligible = minerStats.isEligible ?? false;
  const usdDisplay = Number(usdPerDay).toFixed(2);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        backgroundColor: theme.palette.surface.subtle,
        p: { xs: 2, sm: 2.5 },
      }}
      elevation={0}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <TrendingUpIcon
          sx={{ color: 'primary.main', fontSize: 28, mt: 0.25 }}
        />
        <Box>
          <Typography
            sx={{
              color: 'text.primary',
              fontFamily: theme.typography.mono.fontFamily,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Earnings & score at a glance
          </Typography>
          <Typography
            sx={{
              color: (t) => t.palette.text.secondary,
              fontFamily: theme.typography.mono.fontFamily,
              fontSize: '0.8rem',
              mt: 0.5,
            }}
          >
            {isEligible ? 'Eligible' : 'Ineligible'} · ${usdDisplay}/day est. ·
            Score {totalScore.toFixed(2)}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default MinerFocusCard;

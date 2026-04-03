import React, { useState } from 'react';
import { Box, Card, Typography, Grid } from '@mui/material';
import { MinerCard } from './MinerCard';
import { STATUS_COLORS } from '../../theme';
import { type MinerStats, type RankColorSet, FONTS } from './types';

interface MinerSectionProps {
  title?: string;
  miners: MinerStats[];
  color: RankColorSet;
  onSelectMiner: (githubId: string) => void;
  defaultExpanded?: boolean;
}

export const MinerSection: React.FC<MinerSectionProps> = ({
  title,
  miners,
  color,
  onSelectMiner,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Determine how many items to show
  // Show at least top 3 in every section without expanding
  const INITIAL_DISPLAY_COUNT = 3;

  // If not expanded, show INITIAL_DISPLAY_COUNT. If expanded, show all.
  const visibleMiners = expanded
    ? miners
    : miners.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreMiners = miners.length > INITIAL_DISPLAY_COUNT;

  return (
    <Card
      sx={{
        backgroundColor: '#000000',
        border: `1px solid ${color.border}`,
        borderRadius: 3,
        boxShadow:
          color.text !== STATUS_COLORS.open
            ? `0 0 20px -10px ${color.border}`
            : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
      elevation={0}
    >
      {title && <SectionHeader title={title} color={color} />}

      <Box sx={{ p: 1.5, pt: 1, flex: 1 }}>
        <Grid container spacing={2}>
          {visibleMiners.map((miner) => (
            <Grid item xs={12} sm={12} md={6} lg={4} xl={4} key={miner.githubId || miner.hotkey}>
              <MinerCard
                miner={miner}
                onClick={() =>
                  onSelectMiner(miner.githubId || miner.author || '')
                }
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Footer Toggle Button */}
      {hasMoreMiners && (
        <SectionFooter
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
          remainingCount={miners.length - INITIAL_DISPLAY_COUNT}
          color={color}
        />
      )}
    </Card>
  );
};

interface SectionHeaderProps {
  title: string;
  color: RankColorSet;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, color }) => (
  <Box
    sx={{
      px: 2,
      pt: 1.5,
      pb: 0.5,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <Typography
      variant="h6"
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '1rem',
        fontWeight: 700,
        color: color.text,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}
    >
      {title}
    </Typography>
  </Box>
);

interface SectionFooterProps {
  expanded: boolean;
  onToggle: () => void;
  remainingCount: number;
  color: RankColorSet;
}

const SectionFooter: React.FC<SectionFooterProps> = ({
  expanded,
  onToggle,
  remainingCount,
  color,
}) => (
  <Box
    onClick={onToggle}
    sx={{
      py: 1,
      borderTop: `1px solid ${color.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      color: 'text.secondary',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        color: 'text.primary',
      },
    }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}
    >
      {expanded ? 'Show Less' : `View ${remainingCount} More`}
    </Typography>
  </Box>
);

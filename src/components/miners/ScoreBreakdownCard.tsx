import React, { useState } from 'react';
import { Box, Typography, Collapse, Button, alpha } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { STATUS_COLORS } from '../../theme';

const summary =
  'Your total score comes from each merged PR: base score × repo weight × credibility × issue bonus × uniqueness × time decay. Open PRs hold collateral (deducted if you exceed the open PR limit). ' +
  'Your total is the sum of each merged PR’s earned score. Click any PR in the table below to see how that PR’s score was calculated.';

const details = [
  'Base score — starting points per merged PR.',
  'Repo weight — higher for Gold/Silver/Bronze tier repos.',
  'Credibility — your merge rate (merged ÷ total attempts) scales the multiplier.',
  'Issue bonus — PRs linked to open issues get a boost.',
  'Uniqueness — first contribution to a repo in a window gets a boost.',
  'Time decay — newer merges count slightly more.',
  'Token score — code is analyzed at the token level (structural vs leaf); details on each PR page.',
];

const ScoreBreakdownCard: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        p: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <InfoOutlinedIcon
          sx={{
            color: alpha(STATUS_COLORS.info, 0.9),
            fontSize: '1.1rem',
            mt: 0.2,
          }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}
          >
            {summary}
          </Typography>
          <Collapse in={expanded}>
            <Box
              component="ul"
              sx={{
                m: 0,
                mt: 1.5,
                pl: 2.5,
                color: 'rgba(255,255,255,0.7)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                lineHeight: 1.8,
              }}
            >
              {details.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </Box>
          </Collapse>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              color: 'primary.main',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              textTransform: 'none',
              mt: 1,
              minWidth: 'auto',
              p: 0,
            }}
          >
            {expanded ? 'Less' : 'How is my score calculated?'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ScoreBreakdownCard;

import React, { useState } from 'react';
import {
  Box,
  Card,
  Collapse,
  Typography,
  IconButton,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as ExternalIcon,
} from '@mui/icons-material';
import { STATUS_COLORS } from '../../theme';

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

interface ScoreSection {
  title: string;
  items: string[];
}

const SCORE_SECTIONS: ScoreSection[] = [
  {
    title: 'Base Score',
    items: [
      'code_density = min(token_score / total_lines, 3.0)',
      'base_score = (30 × code_density) + contribution_bonus',
      'Contribution bonus: up to 30 points based on token score (capped at 2000 tokens)',
      'PRs with < 5 token score receive 0 base score',
      'Token score uses AST analysis (tree-sitter), not simple line counts',
      'Non-code files (md, json, yaml) do NOT count toward token score',
      'Test files receive reduced weight (0.05x)',
    ],
  },
  {
    title: 'Multipliers Applied to Merged PRs',
    items: [
      'Repository weight (0.01–100): assigned by the subnet per repo',
      'Issue multiplier (1.0–2.0x): bonus for solving older issues via "Closes #X"',
      'Open PR spam multiplier: 1.0x if under threshold, 0.0x if over (score zeroed)',
      'Time decay: 12h grace period, ~88% at 5 days, ~50% at 10 days, ~5% min at 20+ days',
      'Uniqueness multiplier (1.0–1.4x): rewards contributions to less-popular repos',
      'Credibility multiplier: merged/(merged+closed), raised to tier scalar (Bronze ^1, Silver ^1.5, Gold ^2)',
    ],
  },
  {
    title: 'Collateral Deduction',
    items: [
      'Each open PR costs 20% of its potential score as collateral',
      'Total collateral is summed across all open PRs and deducted from earned score',
      'final_score = max(0, total_earned − total_collateral)',
    ],
  },
];

const FORMULA_LABEL =
  'earned_score = base_score × repo_weight × issue_multiplier × spam_multiplier × time_decay × uniqueness × credibility';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const mono = '"JetBrains Mono", monospace';

const MinerScoreCalculationCard: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
        }}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <Typography
          sx={{ color: '#ffffff', fontFamily: mono, fontSize: '1rem', fontWeight: 600 }}
        >
          How your score is calculated
        </Typography>
        <IconButton
          size="small"
          aria-label={open ? 'Collapse' : 'Expand'}
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 0 }}>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.6)',
              fontFamily: mono,
              fontSize: '0.78rem',
              mb: 2,
              lineHeight: 1.5,
            }}
          >
            Scoring rounds run every 2 hours. Only merged PRs to incentivized
            repositories earn score. Your final score is the sum of all earned
            PR scores minus open PR collateral, then normalized across all miners.
          </Typography>

          {/* Formula highlight */}
          <Box
            sx={{
              mb: 2.5,
              p: 1.5,
              borderRadius: 1.5,
              border: `1px solid ${alpha(STATUS_COLORS.info, 0.25)}`,
              backgroundColor: alpha(STATUS_COLORS.info, 0.06),
              overflowX: 'auto',
            }}
          >
            <Typography
              sx={{
                color: alpha(STATUS_COLORS.info, 0.85),
                fontFamily: mono,
                fontSize: '0.68rem',
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              Per-PR formula
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.8)',
                fontFamily: mono,
                fontSize: { xs: '0.65rem', sm: '0.74rem' },
                lineHeight: 1.5,
                whiteSpace: { xs: 'normal', sm: 'nowrap' },
                wordBreak: 'break-word',
              }}
            >
              {FORMULA_LABEL}
            </Typography>
          </Box>

          {/* Sections */}
          {SCORE_SECTIONS.map((section, sIdx) => (
            <Box key={sIdx} sx={{ mb: 2 }}>
              <Typography
                sx={{
                  color: '#ffffff',
                  fontFamily: mono,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                {section.title}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {section.items.map((item, i) => (
                  <Box
                    component="li"
                    key={i}
                    sx={{
                      color: 'rgba(255,255,255,0.75)',
                      fontFamily: mono,
                      fontSize: '0.76rem',
                      lineHeight: 1.6,
                      mb: 0.5,
                    }}
                  >
                    {item}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}

          <Box
            component="a"
            href="https://docs.gittensor.io/oss-contributions.html"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: alpha(STATUS_COLORS.info, 0.8),
              fontFamily: mono,
              fontSize: '0.75rem',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Full scoring documentation
            <ExternalIcon sx={{ fontSize: '0.85rem' }} />
          </Box>
        </Box>
      </Collapse>
    </Card>
  );
};

export default MinerScoreCalculationCard;

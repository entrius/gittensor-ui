import React, { useState } from 'react';
import {
  Box,
  Card,
  Collapse,
  Typography,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  HelpOutline as HelpIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
  OpenInNew as ExternalIcon,
} from '@mui/icons-material';
import { STATUS_COLORS, TIER_COLORS } from '../../theme';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface RuleItem {
  icon: 'check' | 'error';
  text: string;
}

const KEY_RULES: RuleItem[] = [
  {
    icon: 'check',
    text: 'Only merged PRs to incentivized repositories earn score.',
  },
  {
    icon: 'check',
    text: 'You must unlock a tier (Bronze/Silver/Gold) before earning score in that tier.',
  },
  {
    icon: 'error',
    text: 'PRs to a Gold repo earn nothing if you haven\'t unlocked Gold.',
  },
  {
    icon: 'error',
    text: 'Solving an issue does not guarantee payment — the PR must be merged and meet all criteria.',
  },
  {
    icon: 'error',
    text: 'Exceeding the open PR threshold (10–30) zeros your entire merged score.',
  },
  {
    icon: 'check',
    text: 'Credibility = merged / (merged + closed). Higher credibility = higher score multiplier.',
  },
];

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'I solved an issue — why no payment?',
    answer:
      'Several conditions must be met: the PR must be merged (not just opened), ' +
      'it must target an incentivized repository, you must have the tier unlocked for that repo\'s tier, ' +
      'and if the PR references an issue, the issue must be linked via "Closes #X" syntax, ' +
      'created before the PR, not authored by you, and closed within 1 day of PR merge.',
  },
  {
    question: 'I made a PR to a Gold repo — why no score?',
    answer:
      'You must unlock the Gold tier first. Gold requires ≥60% credibility, ' +
      '≥500 total token score, and at least 3 qualified repos (each with ≥144 token score). ' +
      'If Gold is not unlocked, your credibility for Gold PRs is 0 — meaning score is zeroed. ' +
      'Start with Bronze and Silver repos to build up.',
  },
  {
    question: 'How do tiers affect my earnings?',
    answer:
      'Each tier has a credibility scalar that determines how harshly low credibility is penalized. ' +
      'Bronze uses your raw credibility (^1), Silver raises it to ^1.5, and Gold to ^2. ' +
      'For example, 80% credibility gives you 0.80x in Bronze, 0.72x in Silver, and only 0.64x in Gold. ' +
      'Higher tiers reward high-quality contributors more, but penalize low merge rates more severely.',
  },
  {
    question: 'What counts toward token score?',
    answer:
      'Token score is based on AST (Abstract Syntax Tree) analysis of your code — not simple line counts. ' +
      'Structural nodes (functions, classes, control flow) and leaf nodes (identifiers, literals, operators) ' +
      'are weighted by type and language. Non-code files (markdown, JSON, YAML) do NOT count toward token score. ' +
      'Test files receive reduced weight (0.05x).',
  },
  {
    question: 'Why is collateral deducted from my score?',
    answer:
      'Open PRs cost 20% of their potential score as collateral. This discourages opening many speculative PRs. ' +
      'Total collateral is summed across all your open PRs and subtracted from your earned score. ' +
      'Close or get PRs merged promptly to minimize collateral.',
  },
  {
    question: 'How does the open PR spam penalty work?',
    answer:
      'You have a dynamic threshold of 10–30 open PRs (base 10, +1 per 500 token score from unlocked tiers, capped at 30). ' +
      'If you exceed this threshold by even 1 PR, your entire merged score is zeroed. ' +
      'Monitor your open PR count on the dashboard.',
  },
  {
    question: 'How fast does my score decay?',
    answer:
      'After a 12-hour grace period post-merge, scores decay via sigmoid curve. ' +
      'At ~5 days you retain ~88%, at ~10 days ~50%, at ~15 days ~12%, and at ~20+ days it approaches the 5% minimum. ' +
      'Contribute regularly to keep your score high.',
  },
  {
    question: 'Does contributing to popular repos help or hurt?',
    answer:
      'There\'s a uniqueness multiplier (1.0x–1.4x) that rewards contributions to less-popular repos. ' +
      'If many miners contribute to the same repo, the multiplier is lower. ' +
      'Diversifying across repos can boost your score.',
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const RuleRow: React.FC<RuleItem> = ({ icon, text }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
    {icon === 'check' ? (
      <CheckIcon
        sx={{ fontSize: '1rem', color: STATUS_COLORS.success, mt: 0.25, flexShrink: 0 }}
      />
    ) : (
      <ErrorIcon
        sx={{ fontSize: '1rem', color: STATUS_COLORS.error, mt: 0.25, flexShrink: 0 }}
      />
    )}
    <Typography
      sx={{
        color: 'rgba(255,255,255,0.85)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.78rem',
        lineHeight: 1.55,
      }}
    >
      {text}
    </Typography>
  </Box>
);

const FAQAccordionItem: React.FC<FAQItem & { defaultOpen?: boolean }> = ({
  question,
  answer,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box
      sx={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
          px: 1,
          borderRadius: 1,
        }}
      >
        <Typography
          sx={{
            color: open ? '#ffffff' : 'rgba(255,255,255,0.75)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.82rem',
            fontWeight: open ? 600 : 400,
            pr: 2,
          }}
        >
          {question}
        </Typography>
        {open ? (
          <ExpandLessIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', flexShrink: 0 }} />
        ) : (
          <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', flexShrink: 0 }} />
        )}
      </Box>
      <Collapse in={open}>
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.65)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.76rem',
            lineHeight: 1.6,
            px: 1,
            pb: 1.5,
          }}
        >
          {answer}
        </Typography>
      </Collapse>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const MinerGuidanceCard: React.FC = () => {
  const [rulesOpen, setRulesOpen] = useState(true);
  const [faqOpen, setFaqOpen] = useState(true);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(TIER_COLORS.gold, 0.25)}`,
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
      elevation={0}
    >
      {/* Key Rules Section */}
      <Box
        onClick={() => setRulesOpen((o) => !o)}
        role="button"
        aria-expanded={rulesOpen}
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: rulesOpen ? '1px solid rgba(255,255,255,0.07)' : 'none',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: TIER_COLORS.gold, fontSize: '1.2rem' }} />
          <Typography
            sx={{
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Key Rules — Read Before Contributing
          </Typography>
        </Box>
        {rulesOpen ? (
          <ExpandLessIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
        ) : (
          <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
        )}
      </Box>

      <Collapse in={rulesOpen}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2 }}>
          {KEY_RULES.map((rule, i) => (
            <RuleRow key={i} {...rule} />
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
              mt: 1,
              color: alpha(TIER_COLORS.gold, 0.8),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Read full scoring documentation
            <ExternalIcon sx={{ fontSize: '0.85rem' }} />
          </Box>
        </Box>
      </Collapse>

      {/* FAQ Section */}
      <Box
        onClick={() => setFaqOpen((o) => !o)}
        role="button"
        aria-expanded={faqOpen}
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          borderBottom: faqOpen ? '1px solid rgba(255,255,255,0.07)' : 'none',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem' }} />
          <Typography
            sx={{
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Common Questions
          </Typography>
        </Box>
        {faqOpen ? (
          <ExpandLessIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
        ) : (
          <ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
        )}
      </Box>

      <Collapse in={faqOpen}>
        <Box sx={{ px: { xs: 1, sm: 1.5 }, py: 0.5 }}>
          {FAQ_ITEMS.map((item, i) => (
            <FAQAccordionItem key={i} {...item} />
          ))}
        </Box>
      </Collapse>
    </Card>
  );
};

export default MinerGuidanceCard;

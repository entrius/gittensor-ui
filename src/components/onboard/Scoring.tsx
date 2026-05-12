import React, { useState } from 'react';
import { Box, Typography, ButtonBase, Button, alpha } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CREDIBILITY_COLORS } from '../../theme';

const MONO = '"JetBrains Mono", monospace';
const AMBER = CREDIBILITY_COLORS.moderate;

type ScoringCategory = 'oss' | 'discovery';

const SCORING_RULES: {
  category: ScoringCategory;
  num: string;
  title: string;
  desc: string;
  highlight?: string;
}[] = [
  {
    category: 'oss',
    num: '01',
    title: 'Repository Weight',
    desc: 'Target high-weight repos like Bitcoin, Ethereum, or PyTorch. Repo weight directly multiplies your contribution score.',
    highlight: 'higher weight = higher score',
  },
  {
    category: 'oss',
    num: '02',
    title: 'Code Quality',
    desc: 'AST-based token scoring rewards structural changes — functions, classes, logic — over text edits, configs, or whitespace.',
    highlight: 'structure beats volume',
  },
  {
    category: 'oss',
    num: '03',
    title: 'Time Decay',
    desc: 'PR scores decay over a 35-day window. Merge frequently and promptly to maintain rolling earnings.',
    highlight: '35 day window',
  },
  {
    category: 'oss',
    num: '04',
    title: 'Credibility',
    desc: 'Maintain ≥80% merged-to-total ratio (one closed-PR mulligan). Need 5 valid merged PRs to be eligible.',
    highlight: '80% merge rate',
  },
  {
    category: 'discovery',
    num: '01',
    title: 'Open Issues',
    desc: 'Open detailed, actionable issues on whitelisted repos. Quality issues attract solvers and earn discovery rewards.',
    highlight: 'detail wins',
  },
  {
    category: 'discovery',
    num: '02',
    title: 'Issue Multiplier',
    desc: 'Solvers get a 1.33× boost when their PR closes a linked issue — 1.66× if the issue was opened by a project maintainer.',
    highlight: '1.33× / 1.66×',
  },
  {
    category: 'discovery',
    num: '03',
    title: 'Eligibility',
    desc: '7+ solved issues and 80% issue credibility unlock the discovery emission pool.',
    highlight: '7 solved · 80% cred',
  },
];

const CATEGORIES: {
  value: ScoringCategory;
  label: string;
  allocation: string;
  color: string;
  docsUrl: string;
}[] = [
  {
    value: 'oss',
    label: 'OSS Contributions',
    allocation: '30%',
    color: '#1d37fc',
    docsUrl: 'https://docs.gittensor.io/oss-contributions.html',
  },
  {
    value: 'discovery',
    label: 'Issue Discovery',
    allocation: '10%',
    color: AMBER,
    docsUrl: 'https://docs.gittensor.io/issue-discovery.html',
  },
];

export const Scoring: React.FC = () => {
  const [category, setCategory] = useState<ScoringCategory>('oss');
  const activeCategory = CATEGORIES.find((c) => c.value === category)!;
  const visibleRules = SCORING_RULES.filter((r) => r.category === category);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 6 }}>
        <Typography
          sx={{
            fontFamily: MONO,
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: alpha('#ffffff', 0.4),
            textTransform: 'uppercase',
            mb: 2,
          }}
        >
          ⟶ How rewards are calculated
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '2.5rem', md: '4rem' },
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          Maximize your
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '2.5rem', md: '4rem' },
            fontWeight: 200,
            fontStyle: 'italic',
            letterSpacing: '-0.03em',
            color: alpha('#ffffff', 0.5),
            lineHeight: 1,
          }}
        >
          rewards.
        </Typography>
      </Box>

      {/* Allocation toggle */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          mb: 4,
          border: `1px solid ${alpha('#ffffff', 0.1)}`,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.value;
          return (
            <ButtonBase
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              disableRipple
              sx={{
                p: { xs: 2.5, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                background: isActive
                  ? `linear-gradient(180deg, ${alpha(cat.color, 0.15)} 0%, ${alpha(cat.color, 0.05)} 100%)`
                  : 'transparent',
                borderRight:
                  cat.value === 'oss'
                    ? `1px solid ${alpha('#ffffff', 0.1)}`
                    : 'none',
                position: 'relative',
                transition: 'all 0.25s',
                '&:hover': {
                  background: isActive ? undefined : alpha('#ffffff', 0.02),
                },
                '&::after': isActive
                  ? {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: cat.color,
                      boxShadow: `0 0 12px ${cat.color}`,
                    }
                  : {},
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 1.5,
                  mb: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: MONO,
                    fontSize: { xs: '1.5rem', md: '2rem' },
                    fontWeight: 800,
                    color: isActive ? cat.color : alpha('#ffffff', 0.3),
                    letterSpacing: '-0.03em',
                    textShadow: isActive
                      ? `0 0 16px ${alpha(cat.color, 0.5)}`
                      : 'none',
                    transition: 'all 0.25s',
                  }}
                >
                  {cat.allocation}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: MONO,
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    letterSpacing: '0.18em',
                    color: alpha('#ffffff', 0.35),
                    textTransform: 'uppercase',
                  }}
                >
                  emissions
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: '0.95rem', md: '1.1rem' },
                  fontWeight: 600,
                  color: isActive ? '#ffffff' : alpha('#ffffff', 0.5),
                  letterSpacing: '-0.01em',
                }}
              >
                {cat.label}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Rules */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
          mb: 6,
        }}
      >
        {visibleRules.map((rule) => (
          <Box
            key={rule.title}
            sx={{
              p: { xs: 3, md: 3.5 },
              border: `1px solid ${alpha('#ffffff', 0.08)}`,
              borderRadius: 2,
              background: alpha('#ffffff', 0.02),
              transition: 'all 0.25s',
              '&:hover': {
                borderColor: alpha(activeCategory.color, 0.4),
                background: alpha('#ffffff', 0.03),
                '& .rule-num': {
                  color: activeCategory.color,
                  textShadow: `0 0 24px ${alpha(activeCategory.color, 0.5)}`,
                },
              },
            }}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 2 }}
            >
              <Typography
                className="rule-num"
                sx={{
                  fontFamily: MONO,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 200,
                  lineHeight: 1,
                  color: alpha('#ffffff', 0.2),
                  letterSpacing: '-0.04em',
                  transition: 'all 0.3s',
                }}
              >
                {rule.num}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1.15rem', md: '1.3rem' },
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.01em',
                  flex: 1,
                }}
              >
                {rule.title}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: '0.92rem',
                color: alpha('#ffffff', 0.65),
                lineHeight: 1.65,
                mb: rule.highlight ? 2 : 0,
              }}
            >
              {rule.desc}
            </Typography>
            {rule.highlight && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.4,
                  borderRadius: 1,
                  border: `1px solid ${alpha(activeCategory.color, 0.3)}`,
                  background: alpha(activeCategory.color, 0.08),
                }}
              >
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    bgcolor: activeCategory.color,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: MONO,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: activeCategory.color,
                    letterSpacing: '0.02em',
                  }}
                >
                  {rule.highlight}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Deep dive CTA */}
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 2,
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
          background: `linear-gradient(135deg, ${alpha(activeCategory.color, 0.08)} 0%, transparent 60%)`,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: activeCategory.color,
              textTransform: 'uppercase',
              mb: 0.75,
            }}
          >
            Deep dive · {activeCategory.label}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '1.1rem', md: '1.3rem' },
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            Exact formulas, multipliers, and weight calculations.
          </Typography>
        </Box>
        <Button
          href={activeCategory.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
          sx={{
            background: alpha(activeCategory.color, 0.15),
            border: `1px solid ${alpha(activeCategory.color, 0.4)}`,
            color: activeCategory.color,
            fontWeight: 600,
            fontSize: '0.9rem',
            textTransform: 'none',
            px: 2.5,
            py: 1,
            borderRadius: 1.5,
            whiteSpace: 'nowrap',
            '&:hover': {
              background: alpha(activeCategory.color, 0.25),
              borderColor: activeCategory.color,
            },
          }}
        >
          Read docs
        </Button>
      </Box>
    </Box>
  );
};

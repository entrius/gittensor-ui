import React, { useState } from 'react';
import { Box, Typography, Button, Grid, Tabs, Tab } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

type ScoringCategory = 'oss' | 'discovery';

interface ScoringCard {
  title: string;
  desc: string;
  category: ScoringCategory;
}

const SCORING_CARDS: ScoringCard[] = [
  {
    category: 'oss',
    title: 'Merge PRs',
    desc: 'Target high-weight repositories like Bitcoin, Ethereum, or PyTorch. Contribution scores decay over time — merge frequently and promptly. Requires at least 5 valid merged PRs to qualify.',
  },
  {
    category: 'oss',
    title: 'Code Quality',
    desc: 'Write meaningful code. AST-based token scoring rewards structural changes (functions, classes, logic) over simple text, configs, or whitespace edits.',
  },
  {
    category: 'oss',
    title: 'Credibility',
    desc: 'Keep your merge rate high. You need at least 80% credibility (merged / total, with one closed-PR mulligan) and 5 valid merged PRs to become eligible.',
  },
  {
    category: 'discovery',
    title: 'Issue Multiplier',
    desc: "Link your PR to the issue it resolves (e.g. 'Closes #123') for a 1.33× score boost — or 1.66× if the issue was opened by a project maintainer.",
  },
  {
    category: 'discovery',
    title: 'Issue Discovery',
    desc: 'Earn from a dedicated 30% emission pool by finding open issues that others later solve with a merged PR. Requires 7+ solved issues and 80% issue credibility to qualify.',
  },
];

const CATEGORIES: {
  value: ScoringCategory;
  label: string;
  docsUrl: string;
}[] = [
  {
    value: 'oss',
    label: 'OSS Contributions',
    docsUrl: 'https://docs.gittensor.io/oss-contributions.html',
  },
  {
    value: 'discovery',
    label: 'Issue Discovery',
    docsUrl: 'https://docs.gittensor.io/issue-discovery.html',
  },
];

export const Scoring: React.FC = () => {
  const [category, setCategory] = useState<ScoringCategory>('oss');
  const activeCategory =
    CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
  const visibleCards = SCORING_CARDS.filter((c) => c.category === category);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{
          mb: 4,
          fontFamily: '"JetBrains Mono", monospace',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        Maximize Your Rewards
      </Typography>

      <Box
        sx={{
          mb: 4,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Tabs
          value={category}
          onChange={(_e, v) => setCategory(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.55)',
              '&.Mui-selected': { color: '#fff' },
            },
            '& .MuiTabs-indicator': { backgroundColor: '#fff' },
          }}
        >
          {CATEGORIES.map((c) => (
            <Tab key={c.value} value={c.value} label={c.label} />
          ))}
        </Tabs>
      </Box>

      <Grid container spacing={3} justifyContent="center" sx={{ mb: 8 }}>
        {visibleCards.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.title}>
            <Box
              sx={{
                height: '100%',
                p: 3,
                borderRadius: 4,
                cursor: 'default',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid',
                borderColor: 'border.subtle',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: '#fff',
                  mb: 2,
                  fontSize: '1.1rem',
                }}
              >
                {item.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.6,
                }}
              >
                {item.desc}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box
        sx={{
          textAlign: 'center',
          p: 6,
          borderRadius: 4,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid',
          borderColor: 'border.subtle',
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ mb: 2, color: '#fff' }}
        >
          Dive Deeper
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
        >
          Learn about the exact formulas, multipliers, and weight calculations
          in our detailed documentation.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          href={activeCategory.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
          sx={{
            px: 5,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 'bold',
            borderRadius: '50px',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.2)',
            textTransform: 'none',
          }}
        >
          View {activeCategory.label} Documentation
        </Button>
      </Box>
    </Box>
  );
};

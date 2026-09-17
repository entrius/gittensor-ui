import React from 'react';
import { Box, Link, Typography, alpha, useTheme } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { TEXT_OPACITY } from '../theme';

// The compute pool (phase 1) replaced per-token serving on 2026-09-17. The controller that runs the pool keeps its
// state (cards, leases, pay) in its own files, not in the database this site reads, so the phase-0 KPIs, release card
// and fleet table are gone until that state is published. What stays is what a miner needs: how it pays, how to join.
const DOCS_URL = 'https://docs.gittensor.io/compute-mining.html';

const EXPLAINER =
  'The compute pool pays RTX 5090 miners for card-time, not tokens. You run one command on your GPU box; the ' +
  'subnet proves the card is a real, exclusive 5090 every 20 minutes, places a blessed workload on it when there ' +
  'is demand, and pays per card-hour: an idle rate while the card is proven and waiting, a leased rate while it ' +
  'serves. A signed scorecard sets each miner’s share of the compute emissions and the validator commits its ' +
  'hash on chain.';

const STATES: Array<[string, string]> = [
  ['IDLE', 'proven and waiting for a workload: earns the idle rate'],
  ['LEASED', 'serving a blessed workload: earns the leased rate'],
  [
    'CHECKING',
    'being re-proven after a workload left: unpaid, usually under a minute',
  ],
  ['BENCHED', 'failed a proof or a rule: unpaid until the bench ends'],
];

const JOIN = `# on the GPU box (RTX 5090, NVIDIA driver, Docker, nvidia-container-toolkit)
gitt up --wallet WALLET_NAME --hotkey WALLET_HOTKEY

# leave cleanly (drains the workload first; no penalty)
gitt down`;

const ComputePage: React.FC = () => {
  const theme = useTheme();
  const secondary = alpha(theme.palette.common.white, TEXT_OPACITY.secondary);

  return (
    <Page title="Compute">
      <SEO
        title="Compute"
        description="The Gittensor compute pool: RTX 5090 miners paid per card-hour. One command to join."
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'center',
          py: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            width: '100%',
            maxWidth: 1320,
            px: { xs: 2, md: 0 },
          }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, mb: 0.75 }}
            >
              Compute
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: secondary, maxWidth: 860, lineHeight: 1.55 }}
            >
              {EXPLAINER}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="sectionTitle"
              component="h2"
              sx={{ display: 'block', mb: 1.25 }}
            >
              Run a card
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.border.light}`,
                backgroundColor: alpha(theme.palette.common.white, 0.03),
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.6,
                overflowX: 'auto',
                whiteSpace: 'pre',
              }}
            >
              {JOIN}
            </Box>
            <Typography
              variant="body2"
              sx={{ color: secondary, mt: 1.25, maxWidth: 860 }}
            >
              That is the whole setup: no model downloads, no configuration.
              Prerequisites, ports, a wallet that is not on the GPU box, and
              what gets a box benched are in the{' '}
              <Link href={DOCS_URL} target="_blank" rel="noopener noreferrer">
                compute mining guide
              </Link>
              .
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="sectionTitle"
              component="h2"
              sx={{ display: 'block', mb: 1.25 }}
            >
              Card states
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {STATES.map(([state, meaning]) => (
                <Typography
                  key={state}
                  variant="body2"
                  sx={{ color: secondary }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontFamily: 'monospace',
                      color: theme.palette.common.white,
                      mr: 1,
                    }}
                  >
                    {state}
                  </Box>
                  {meaning}
                </Typography>
              ))}
            </Box>
            <Typography
              variant="body2"
              sx={{ color: secondary, mt: 1.5, maxWidth: 860 }}
            >
              A live fleet table (card status, workload, uptime) returns here
              once the pool publishes its state.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default ComputePage;

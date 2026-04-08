import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Tabs, Tab } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const MONO = '"JetBrains Mono", monospace';

const steps = [
  {
    step: 1,
    title: 'Create Wallet',
    subtitle: 'Coldkey & Hotkey',
  },
  {
    step: 2,
    title: 'Register',
    subtitle: 'To Subnet',
  },
  {
    step: 3,
    title: 'Create PAT',
    subtitle: 'GitHub Token',
  },
  {
    step: 4,
    title: 'Install CLI',
    subtitle: 'gittensor tools',
  },
  {
    step: 5,
    title: 'Broadcast',
    subtitle: 'PAT to Validators',
  },
  {
    step: 6,
    title: 'Verify',
    subtitle: 'Check Status',
  },
  {
    step: 7,
    title: 'Contribute',
    subtitle: 'Earn Rewards',
    active: true,
  },
];

const CodeBlock: React.FC<{
  children: string;
  label?: string;
}> = ({ children, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ mb: 2 }}>
      {label && (
        <Typography
          sx={{
            fontFamily: MONO,
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            mb: 0.5,
          }}
        >
          {label}
        </Typography>
      )}
      <Box
        sx={{
          position: 'relative',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 2,
          p: 2,
          pr: 5,
          overflow: 'auto',
        }}
      >
        <Typography
          component="pre"
          sx={{
            fontFamily: MONO,
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.85)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            m: 0,
            lineHeight: 1.6,
          }}
        >
          {children.trim()}
        </Typography>
        <Box
          onClick={handleCopy}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            cursor: 'pointer',
            color: copied ? 'success.main' : 'rgba(255,255,255,0.3)',
            '&:hover': { color: copied ? 'success.main' : 'rgba(255,255,255,0.6)' },
            transition: 'color 0.2s',
          }}
        >
          <ContentCopyIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>
    </Box>
  );
};

const StepDetail: React.FC<{ step: number }> = ({ step }) => {
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet');

  switch (step) {
    case 1:
      return (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
            Create a Bittensor wallet with a coldkey and hotkey. See the{' '}
            <Typography
              component="a"
              href="https://docs.learnbittensor.org/keys/working-with-keys"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              official Bittensor docs
            </Typography>{' '}
            for creating or importing wallets.
          </Typography>
        </Box>
      );

    case 2:
      return (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
            Register your hotkey to the Gittensor subnet.
          </Typography>
          <NetworkTabs network={network} onChange={setNetwork} />
          {network === 'mainnet' ? (
            <CodeBlock label="mainnet (subnet 74)">{`btcli subnet register --netuid 74 \\
  --wallet-name <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME>`}</CodeBlock>
          ) : (
            <CodeBlock label="testnet (subnet 422)">{`btcli subnet register --netuid 422 \\
  --wallet-name <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --network test`}</CodeBlock>
          )}
        </Box>
      );

    case 3:
      return (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
            Create a fine-grained personal access token in GitHub:
          </Typography>
          <Box component="ol" sx={{ pl: 2.5, color: 'text.secondary', '& li': { mb: 1, fontSize: '0.875rem', lineHeight: 1.7 } }}>
            <li>
              Go to <strong>Settings</strong> → <strong>Developer settings</strong> → <strong>Personal access tokens</strong> → <strong>Fine-grained tokens</strong>
            </li>
            <li>Click <strong>Generate new token</strong></li>
            <li>
              Set <strong>Token name</strong> to <code>gittensor</code>, <strong>Expiration</strong> to <code>No Expiration</code>, and <strong>Repository access</strong> to <code>Public repositories (read-only)</code>
            </li>
            <li>Click <strong>Generate token</strong> and copy it</li>
          </Box>
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <Typography variant="body2" sx={{ color: 'rgba(245, 158, 11, 0.9)', fontSize: '0.8rem', lineHeight: 1.6 }}>
              Some GitHub organizations forbid fine-grained PATs with indefinite lifetime. If so, create a PAT with an expiration and rotate it periodically.
            </Typography>
          </Box>
        </Box>
      );

    case 4:
      return (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
            Install the Gittensor CLI tool.
          </Typography>
          <CodeBlock>{`pip install uv
git clone git@github.com:entrius/gittensor.git
cd gittensor
uv venv && source .venv/bin/activate
uv pip install -e .`}</CodeBlock>
        </Box>
      );

    case 5:
      return (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
            Broadcast your GitHub PAT to validators so they can score your contributions.
          </Typography>
          <NetworkTabs network={network} onChange={setNetwork} />
          {network === 'mainnet' ? (
            <CodeBlock label="mainnet">{`gitt miner post --pat <YOUR_PAT> \\
  --wallet <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --netuid 74`}</CodeBlock>
          ) : (
            <CodeBlock label="testnet">{`gitt miner post --pat <YOUR_PAT> \\
  --wallet <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --netuid 422 --network test`}</CodeBlock>
          )}
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', mt: 1 }}>
            If you omit --pat, the CLI checks the GITTENSOR_MINER_PAT environment variable, then prompts interactively.
          </Typography>
        </Box>
      );

    case 6:
      return (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
            Confirm that validators received and validated your PAT.
          </Typography>
          <NetworkTabs network={network} onChange={setNetwork} />
          {network === 'mainnet' ? (
            <CodeBlock label="mainnet">{`gitt miner check \\
  --wallet <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --netuid 74`}</CodeBlock>
          ) : (
            <CodeBlock label="testnet">{`gitt miner check \\
  --wallet <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --netuid 422 --network test`}</CodeBlock>
          )}
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', mt: 1 }}>
            You should see a table showing which validators have your PAT stored and whether it's valid.
          </Typography>
        </Box>
      );

    case 7:
      return (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            You're all set! Open PRs to recognized repositories and your scores are calculated when PRs are merged. No miner process needs to be running — the validator scoring round runs every 2 hours.
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, mt: 2, color: 'text.secondary', '& li': { mb: 1, fontSize: '0.875rem', lineHeight: 1.7 } }}>
            <li>Browse recognized repositories in the <strong>Repositories</strong> tab</li>
            <li>Eligibility requires 5 merged PRs with token score &ge; 5, 75% credibility, and a 180-day-old GitHub account</li>
            <li>See the <strong>Scoring</strong> tab for how rewards are calculated</li>
          </Box>
        </Box>
      );

    default:
      return null;
  }
};

const NetworkTabs: React.FC<{
  network: 'mainnet' | 'testnet';
  onChange: (v: 'mainnet' | 'testnet') => void;
}> = ({ network, onChange }) => (
  <Tabs
    value={network}
    onChange={(_, v) => onChange(v)}
    sx={{
      minHeight: 'auto',
      mb: 2,
      '& .MuiTab-root': {
        minHeight: 'auto',
        py: 0.5,
        px: 2,
        fontSize: '0.75rem',
        fontFamily: MONO,
        textTransform: 'none',
        color: 'rgba(255,255,255,0.4)',
        '&.Mui-selected': { color: '#fff' },
      },
      '& .MuiTabs-indicator': { backgroundColor: 'primary.main', height: 2 },
    }}
  >
    <Tab label="Mainnet" value="mainnet" />
    <Tab label="Testnet" value="testnet" />
  </Tabs>
);

export const GettingStarted: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{
          mb: 6,
          fontFamily: MONO,
          color: '#fff',
          textAlign: 'center',
        }}
      >
        Miner Setup
      </Typography>

      {/* Step indicators */}
      <Box sx={{ position: 'relative', mb: 6 }}>
        {/* Connecting Line (Desktop) */}
        <Box
          sx={{
            position: 'absolute',
            top: 24,
            left: '3%',
            right: '3%',
            height: 2,
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 100%)',
            display: { xs: 'none', md: 'block' },
            zIndex: 0,
          }}
        />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2, md: 0 }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'flex-start' }}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          {steps.map((item, index) => (
            <Box
              key={index}
              onClick={() => setActiveStep(index)}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'row', md: 'column' },
                alignItems: 'center',
                gap: { xs: 1.5, md: 1 },
                width: { xs: '100%', md: 'auto' },
                cursor: 'pointer',
                '&:hover .step-circle': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              <Box
                className="step-circle"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: activeStep === index ? 'rgba(29, 55, 252, 0.15)' : '#0b0b0b',
                  border: '2px solid',
                  borderColor:
                    item.active
                      ? 'secondary.main'
                      : activeStep === index
                        ? 'primary.main'
                        : 'rgba(255,255,255,0.1)',
                  color:
                    item.active
                      ? 'secondary.main'
                      : activeStep === index
                        ? 'primary.main'
                        : 'rgba(255, 255, 255, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: MONO,
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow:
                    item.active
                      ? '0 0 20px rgba(255, 215, 0, 0.15)'
                      : activeStep === index
                        ? '0 0 15px rgba(29, 55, 252, 0.2)'
                        : 'none',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {item.step}
              </Box>
              <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Typography
                  sx={{
                    fontFamily: MONO,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color:
                      item.active
                        ? 'secondary.main'
                        : activeStep === index
                          ? '#fff'
                          : 'rgba(255,255,255,0.7)',
                    mb: 0.25,
                  }}
                >
                  {item.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    lineHeight: 1.3,
                    display: { xs: 'block', md: 'block' },
                    maxWidth: { md: 100 },
                    mx: { md: 'auto' },
                  }}
                >
                  {item.subtitle}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Step detail panel */}
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
          mb: 6,
          minHeight: 200,
        }}
      >
        <Typography
          sx={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: '1.1rem',
            color: '#fff',
            mb: 3,
          }}
        >
          Step {steps[activeStep].step}: {steps[activeStep].title}
        </Typography>
        <StepDetail step={steps[activeStep].step} />
      </Box>

      {/* CTA */}
      <Box
        sx={{
          textAlign: 'center',
          p: 5,
          borderRadius: 4,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: '#fff' }}>
          Full Documentation
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}
        >
          For advanced configuration and troubleshooting, see the complete miner guide.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          href="https://docs.gittensor.io/miner.html"
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
          View Miner Documentation
        </Button>
      </Box>
    </Box>
  );
};

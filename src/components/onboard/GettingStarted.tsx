import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  ButtonBase,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { alpha, darken } from '@mui/material/styles';
import { scrollbarSx, tooltipSlotProps } from '../../theme';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';

const MONO = '"JetBrains Mono", monospace';

const MAINNET_NETUID = 74;
const TESTNET_NETUID = 422;
const MAINNET_LABEL = `mainnet (subnet ${MAINNET_NETUID})`;
const TESTNET_LABEL = `testnet (subnet ${TESTNET_NETUID})`;

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
  const { copied, copy, liveRegion } = useClipboardCopy({
    copiedMessage: 'Command copied to clipboard',
  });
  const command = children.trim();

  return (
    <Box sx={{ mb: 2 }}>
      {label && (
        <Typography
          sx={{
            fontFamily: MONO,
            fontSize: '0.7rem',
            color: 'text.secondary',
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
          backgroundColor: (theme) =>
            alpha(theme.palette.background.default, 0.4),
          border: '1px solid',
          borderColor: 'border.subtle',
          borderRadius: 2,
          p: 2,
          pr: 5,
          overflow: 'auto',
          ...scrollbarSx,
        }}
      >
        <Typography
          component="pre"
          sx={{
            fontFamily: MONO,
            fontSize: '0.8rem',
            color: 'text.primary',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            m: 0,
            lineHeight: 1.6,
          }}
        >
          {command}
        </Typography>
        <Tooltip
          title={copied ? 'Copied!' : 'Copy'}
          placement="left"
          slotProps={tooltipSlotProps}
        >
          <ButtonBase
            onClick={() => void copy(command)}
            aria-label="Copy command"
            disableRipple
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              p: 0.5,
              borderRadius: '4px',
              color: copied ? 'success.main' : 'text.tertiary',
              '&:hover': {
                color: copied ? 'success.main' : 'text.secondary',
              },
              '&:focus-visible, &.Mui-focusVisible': {
                outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: '2px',
              },
              transition: 'color 0.2s',
            }}
          >
            {copied ? (
              <CheckIcon sx={{ fontSize: 16 }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            )}
          </ButtonBase>
        </Tooltip>
        {liveRegion}
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
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.7 }}
          >
            Create a Bittensor wallet with a coldkey and hotkey. See the{' '}
            <Typography
              component="a"
              href="https://docs.learnbittensor.org/keys/working-with-keys"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
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
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.7 }}
          >
            Register your hotkey to the Gittensor subnet.
          </Typography>
          <NetworkTabs network={network} onChange={setNetwork} />
          {network === 'mainnet' ? (
            <CodeBlock
              label={MAINNET_LABEL}
            >{`btcli subnet register --netuid ${MAINNET_NETUID} \\
  --wallet-name <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME>`}</CodeBlock>
          ) : (
            <CodeBlock
              label={TESTNET_LABEL}
            >{`btcli subnet register --netuid ${TESTNET_NETUID} \\
  --wallet-name <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --network test`}</CodeBlock>
          )}
        </Box>
      );

    case 3:
      return (
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.7 }}
          >
            Create a fine-grained personal access token in GitHub:
          </Typography>
          <Box
            component="ol"
            sx={{
              pl: 2.5,
              color: 'text.secondary',
              '& li': { mb: 1, fontSize: '0.875rem', lineHeight: 1.7 },
            }}
          >
            <li>
              Go to <strong>Settings</strong> →{' '}
              <strong>Developer settings</strong> →{' '}
              <strong>Personal access tokens</strong> →{' '}
              <strong>Fine-grained tokens</strong>
            </li>
            <li>
              Click <strong>Generate new token</strong>
            </li>
            <li>
              Set <strong>Token name</strong> to <code>gittensor</code>,{' '}
              <strong>Expiration</strong> to <code>No Expiration</code>, and{' '}
              <strong>Repository access</strong> to{' '}
              <code>Public repositories (read-only)</code>
            </li>
            <li>
              Click <strong>Generate token</strong> and copy it
            </li>
          </Box>
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              backgroundColor: (theme) =>
                alpha(theme.palette.status.warning, 0.08),
              border: (theme) =>
                `1px solid ${alpha(theme.palette.status.warning, 0.2)}`,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'status.warning',
                fontSize: '0.8rem',
                lineHeight: 1.6,
              }}
            >
              Some GitHub organizations forbid fine-grained PATs with indefinite
              lifetime. If so, create a PAT with an expiration and rotate it
              periodically.
            </Typography>
          </Box>
        </Box>
      );

    case 4:
      return (
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.7 }}
          >
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
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.7 }}
          >
            Broadcast your GitHub PAT to validators so they can score your
            contributions.
          </Typography>
          <NetworkTabs network={network} onChange={setNetwork} />
          {network === 'mainnet' ? (
            <CodeBlock
              label={MAINNET_LABEL}
            >{`gitt miner post --pat <YOUR_PAT> \\
  --wallet <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --netuid ${MAINNET_NETUID}`}</CodeBlock>
          ) : (
            <CodeBlock
              label={TESTNET_LABEL}
            >{`gitt miner post --pat <YOUR_PAT> \\
  --wallet <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --netuid ${TESTNET_NETUID} --network test`}</CodeBlock>
          )}
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 1 }}
          >
            If you omit --pat, the CLI checks the GITTENSOR_MINER_PAT
            environment variable, then prompts interactively.
          </Typography>
        </Box>
      );

    case 6:
      return (
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.7 }}
          >
            Confirm that validators received and validated your PAT.
          </Typography>
          <NetworkTabs network={network} onChange={setNetwork} />
          {network === 'mainnet' ? (
            <CodeBlock label={MAINNET_LABEL}>{`gitt miner check \\
  --wallet <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --netuid ${MAINNET_NETUID}`}</CodeBlock>
          ) : (
            <CodeBlock label={TESTNET_LABEL}>{`gitt miner check \\
  --wallet <WALLET_NAME> \\
  --hotkey <HOTKEY_NAME> \\
  --netuid ${TESTNET_NETUID} --network test`}</CodeBlock>
          )}
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 1 }}
          >
            You should see a table showing which validators have your PAT stored
            and whether it's valid.
          </Typography>
        </Box>
      );

    case 7:
      return (
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.7 }}
          >
            You're all set! Start contributing to whitelisted repositories — no
            miner process needs to run. Validators score your merged PRs
            automatically every 2 hours.
          </Typography>
          <Box
            component="ul"
            sx={{
              pl: 2.5,
              mt: 2,
              color: 'text.secondary',
              '& li': { mb: 1, fontSize: '0.875rem', lineHeight: 1.7 },
            }}
          >
            <li>
              Browse recognized repositories in the{' '}
              <strong>Repositories</strong> tab
            </li>
            <li>
              OSS eligibility: 5 valid merged PRs (token score &ge; 5) and 80%
              credibility (merged / total, with one closed-PR mulligan)
            </li>
            <li>
              Issue Discovery eligibility: 7+ solved issues and 80% issue
              credibility
            </li>
            <li>
              See the <strong>Scoring</strong> tab for how rewards are
              calculated
            </li>
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
        color: 'text.secondary',
        '&.Mui-selected': { color: 'text.primary' },
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
    <Box sx={{ width: '100%', maxWidth: '100%', py: 4 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{
          mb: 6,
          fontFamily: MONO,
          color: 'text.primary',
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
            left: '5%',
            right: '5%',
            height: 2,
            background: (theme) =>
              `linear-gradient(90deg, ${theme.palette.border.subtle} 0%, ${theme.palette.border.medium} 50%, ${theme.palette.border.subtle} 100%)`,
            display: { xs: 'none', md: 'block' },
            zIndex: 0,
          }}
        />

        <Box
          sx={{
            display: { xs: 'flex', md: 'grid' },
            flexDirection: { xs: 'column' },
            gap: { xs: 2, md: 0 },
            gridTemplateColumns: { md: 'repeat(7, minmax(0, 1fr))' },
            alignItems: { xs: 'flex-start', md: 'flex-start' },
            position: 'relative',
            zIndex: 1,
          }}
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
                width: { xs: '100%', md: '100%' },
                minWidth: 0,
                cursor: 'pointer',
                '&:hover .step-circle': {
                  borderColor: 'border.medium',
                },
              }}
            >
              <Box
                className="step-circle"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: (theme) =>
                    activeStep === index
                      ? index === steps.length - 1
                        ? darken(theme.palette.secondary.main, 0.85)
                        : darken(theme.palette.primary.main, 0.85)
                      : theme.palette.background.default,
                  border: '2px solid',
                  borderColor: item.active
                    ? 'secondary.main'
                    : activeStep === index
                      ? 'primary.main'
                      : 'border.subtle',
                  color: item.active
                    ? 'secondary.main'
                    : activeStep === index
                      ? 'primary.main'
                      : 'text.tertiary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: MONO,
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: item.active
                    ? (theme) =>
                        `0 0 20px ${alpha(theme.palette.secondary.main, 0.15)}`
                    : activeStep === index
                      ? (theme) =>
                          `0 0 15px ${alpha(theme.palette.primary.main, 0.2)}`
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
                    color: item.active
                      ? 'secondary.main'
                      : activeStep === index
                        ? 'text.primary'
                        : 'text.secondary',
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
        </Box>
      </Box>

      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.subtle',
          background: 'surface.subtle',
          mb: 6,
          minHeight: 200,
        }}
      >
        <Typography
          sx={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: '1.1rem',
            color: 'text.primary',
            mb: 3,
          }}
        >
          Step {steps[activeStep].step}: {steps[activeStep].title}
        </Typography>
        <StepDetail step={steps[activeStep].step} />
      </Box>

      <Box
        sx={{
          textAlign: 'center',
          p: 5,
          borderRadius: 4,
          background: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0)} 0%, ${theme.palette.surface.subtle} 100%)`,
          border: '1px solid',
          borderColor: 'border.subtle',
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ mb: 2, color: 'text.primary' }}
        >
          Full Documentation
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}
        >
          For advanced configuration and troubleshooting, see the complete miner
          guide.
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
            boxShadow: (theme) =>
              `0 0 20px ${alpha(theme.palette.background.default, 0.2)}`,
            textTransform: 'none',
          }}
        >
          View Miner Documentation
        </Button>
      </Box>
    </Box>
  );
};

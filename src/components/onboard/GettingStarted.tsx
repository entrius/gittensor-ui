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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { alpha, darken, useTheme } from '@mui/material/styles';
import {
  STATUS_COLORS,
  UI_COLORS,
  scrollbarSx,
  tooltipSlotProps,
} from '../../theme';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';

const GREEN = STATUS_COLORS.merged;
const BLUE = STATUS_COLORS.info;

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
            sx={{ lineHeight: 1.7, mb: 3 }}
          >
            You're all set! No miner process needs to run — validators score
            your contributions automatically every 2 hours. There are{' '}
            <strong>two ways to earn</strong>:
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              mb: 3,
            }}
          >
            {/* OSS Path */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 1.5,
                border: (t) =>
                  `1px solid ${alpha(t.palette.primary.main, 0.25)}`,
                background: (t) =>
                  `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.06)} 0%, transparent 100%)`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: MONO,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  color: 'primary.main',
                  textTransform: 'uppercase',
                  mb: 1,
                }}
              >
                OSS Path
              </Typography>
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: 1,
                }}
              >
                OSS Contributions
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  color: 'text.secondary',
                  lineHeight: 1.6,
                  mb: 1.5,
                }}
              >
                Submit pull requests to whitelisted repos. Higher repo weight
                and structural code changes earn more.
              </Typography>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: '0.72rem',
                  color: 'primary.main',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                ⟶ 5 valid merged PRs · 80% credibility
              </Box>
            </Box>

            {/* Issue Discovery Path */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 1.5,
                border: `1px solid ${alpha(STATUS_COLORS.warning, 0.3)}`,
                background: `linear-gradient(180deg, ${alpha(STATUS_COLORS.warning, 0.06)} 0%, transparent 100%)`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: MONO,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  color: STATUS_COLORS.warning,
                  textTransform: 'uppercase',
                  mb: 1,
                }}
              >
                Discovery Path
              </Typography>
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: 1,
                }}
              >
                Issue Discovery
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  color: 'text.secondary',
                  lineHeight: 1.6,
                  mb: 1.5,
                }}
              >
                Open detailed, actionable issues on mirror-enabled repos. You
                earn when another miner solves your issue with a merged PR.
              </Typography>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: '0.72rem',
                  color: STATUS_COLORS.warning,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                ⟶ 7+ solved issues · 80% issue credibility
              </Box>
            </Box>
          </Box>

          <Box
            component="ul"
            sx={{
              pl: 2.5,
              mt: 2,
              color: 'text.secondary',
              '& li': { mb: 0.75, fontSize: '0.85rem', lineHeight: 1.7 },
            }}
          >
            <li>
              Browse whitelisted repositories in the{' '}
              <strong>Repositories</strong> tab
            </li>
            <li>
              Find open bounties in the <strong>Bounties</strong> tab
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
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const current = steps[activeStep];
  const isFinal = activeStep === steps.length - 1;
  const accent = current.active ? GREEN : BLUE;
  const nextStepIndex = Math.min(steps.length - 1, activeStep + 1);
  const nextAccent = nextStepIndex === steps.length - 1 ? GREEN : BLUE;
  const progressPct =
    steps.length > 1 ? (activeStep / (steps.length - 1)) * 100 : 0;

  return (
    <Box sx={{ width: '100%' }}>
      {/* HERO — editorial split */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: BLUE,
              boxShadow: `0 0 12px ${BLUE}`,
            }}
          />
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: BLUE,
              textTransform: 'uppercase',
            }}
          >
            7 steps · about 10 minutes
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: { xs: '2.5rem', md: '4rem' },
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: UI_COLORS.white,
            lineHeight: 1,
          }}
        >
          Set up your
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '2.5rem', md: '4rem' },
            fontWeight: 200,
            fontStyle: 'italic',
            letterSpacing: '-0.03em',
            color: alpha(UI_COLORS.white, 0.5),
            lineHeight: 1,
          }}
        >
          miner
        </Typography>
      </Box>

      {/* PROGRESS STRIP */}
      <Box sx={{ position: 'relative', mb: 4 }}>
        {/* Track */}
        <Box
          sx={{
            position: 'absolute',
            top: 22,
            left: { xs: 22, md: '7%' },
            right: { xs: 'auto', md: '7%' },
            width: { xs: 2, md: 'auto' },
            height: { xs: 'calc(100% - 22px)', md: 2 },
            bgcolor: alpha(UI_COLORS.white, 0.08),
            zIndex: 0,
          }}
        />
        {/* Filled progress */}
        <Box
          sx={{
            position: 'absolute',
            top: 22,
            left: { xs: 22, md: '7%' },
            width: { xs: 2, md: `${progressPct * 0.86}%` },
            height: { xs: `${progressPct}%`, md: 2 },
            background: `linear-gradient(90deg, ${BLUE}, ${GREEN})`,
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 0,
            boxShadow: `0 0 12px ${alpha(BLUE, 0.5)}`,
          }}
        />

        <Box
          sx={{
            display: { xs: 'flex', md: 'grid' },
            flexDirection: { xs: 'column' },
            gap: { xs: 1.5, md: 0 },
            gridTemplateColumns: { md: 'repeat(7, minmax(0, 1fr))' },
            position: 'relative',
            zIndex: 1,
          }}
        >
          {steps.map((item, index) => {
            const isActive = activeStep === index;
            const isComplete = index < activeStep;
            const isLastStep = index === steps.length - 1;
            const stepAccent = isLastStep ? GREEN : BLUE;

            return (
              <ButtonBase
                key={index}
                onClick={() => setActiveStep(index)}
                disableRipple
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'row', md: 'column' },
                  alignItems: 'center',
                  gap: { xs: 1.5, md: 1 },
                  width: '100%',
                  cursor: 'pointer',
                  '&:hover .step-tile': {
                    borderColor: alpha(stepAccent, 0.5),
                  },
                  '&:focus-visible .step-tile': {
                    outline: `2px solid ${stepAccent}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <Box
                  className="step-tile"
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: 1.5,
                    bgcolor:
                      isActive || isComplete
                        ? darken(stepAccent, 0.7)
                        : theme.palette.background.default,
                    border: '1.5px solid',
                    borderColor:
                      isActive || isComplete
                        ? stepAccent
                        : alpha(UI_COLORS.white, 0.12),
                    color:
                      isActive || isComplete
                        ? stepAccent
                        : alpha(UI_COLORS.white, 0.45),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    boxShadow: isActive
                      ? `0 0 18px ${alpha(stepAccent, 0.4)}`
                      : 'none',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {isComplete ? (
                    <CheckIcon sx={{ fontSize: 18 }} />
                  ) : (
                    String(item.step).padStart(2, '0')
                  )}
                </Box>
                <Box
                  sx={{
                    textAlign: { xs: 'left', md: 'center' },
                    minWidth: 0,
                    flex: { xs: 1, md: 'unset' },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? UI_COLORS.white
                        : isComplete
                          ? alpha(UI_COLORS.white, 0.75)
                          : alpha(UI_COLORS.white, 0.55),
                      letterSpacing: '-0.005em',
                      mb: 0.25,
                      transition: 'color 0.2s',
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: MONO,
                      fontSize: '0.65rem',
                      color: alpha(UI_COLORS.white, 0.35),
                      letterSpacing: '0.02em',
                      maxWidth: { md: 110 },
                      mx: { md: 'auto' },
                      lineHeight: 1.3,
                    }}
                  >
                    {item.subtitle}
                  </Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      {/* STEP CONTENT CARD */}
      <Box
        sx={{
          position: 'relative',
          border: `1px solid ${alpha(UI_COLORS.white, 0.08)}`,
          borderRadius: 2,
          background: alpha(UI_COLORS.white, 0.02),
          overflow: 'hidden',
          mb: 5,
        }}
      >
        {/* Top accent strip */}
        <Box
          sx={{
            height: 2,
            background: `linear-gradient(90deg, ${accent}, transparent)`,
            boxShadow: `0 0 12px ${alpha(accent, 0.5)}`,
          }}
        />

        <Box sx={{ p: { xs: 3, md: 4 } }}>
          {/* Step header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: { xs: 2, md: 3 },
              mb: 3,
            }}
          >
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: { xs: '3rem', md: '4.5rem' },
                fontWeight: 200,
                lineHeight: 0.9,
                color: accent,
                letterSpacing: '-0.04em',
                textShadow: `0 0 24px ${alpha(accent, 0.4)}`,
                flexShrink: 0,
              }}
            >
              {String(current.step).padStart(2, '0')}
            </Typography>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: MONO,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  color: alpha(UI_COLORS.white, 0.4),
                  textTransform: 'uppercase',
                  mb: 0.5,
                }}
              >
                {current.subtitle}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 700,
                  color: UI_COLORS.white,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                {current.title}
              </Typography>
            </Box>
          </Box>

          {/* Step detail content */}
          <Box sx={{ mb: 3 }}>
            <StepDetail step={current.step} />
          </Box>

          {/* Prev / Next navigation */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pt: 3,
              borderTop: `1px solid ${alpha(UI_COLORS.white, 0.06)}`,
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Button
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
              disabled={activeStep === 0}
              startIcon={<ArrowBackIcon />}
              sx={{
                color: alpha(UI_COLORS.white, 0.7),
                fontWeight: 500,
                textTransform: 'none',
                px: 2,
                py: 0.75,
                borderRadius: 1.5,
                border: `1px solid ${alpha(UI_COLORS.white, 0.12)}`,
                '&:hover': {
                  background: alpha(UI_COLORS.white, 0.04),
                  borderColor: alpha(UI_COLORS.white, 0.25),
                },
                '&.Mui-disabled': {
                  color: alpha(UI_COLORS.white, 0.2),
                  borderColor: alpha(UI_COLORS.white, 0.06),
                },
              }}
            >
              {activeStep > 0 ? steps[activeStep - 1].title : 'Previous'}
            </Button>

            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '0.7rem',
                color: alpha(UI_COLORS.white, 0.4),
                letterSpacing: '0.1em',
              }}
            >
              {String(activeStep + 1).padStart(2, '0')} /{' '}
              {String(steps.length).padStart(2, '0')}
            </Typography>

            <Button
              onClick={() =>
                setActiveStep((s) => Math.min(steps.length - 1, s + 1))
              }
              disabled={isFinal}
              endIcon={<ArrowForwardIcon />}
              sx={{
                background: isFinal
                  ? 'transparent'
                  : `linear-gradient(135deg, ${nextAccent} 0%, ${alpha(nextAccent, 0.8)} 100%)`,
                color: nextAccent === BLUE ? UI_COLORS.black : UI_COLORS.white,
                fontWeight: 600,
                textTransform: 'none',
                px: 2.5,
                py: 0.75,
                borderRadius: 1.5,
                boxShadow: isFinal
                  ? 'none'
                  : `0 0 16px ${alpha(nextAccent, 0.4)}`,
                '&:hover': {
                  background: isFinal ? 'transparent' : nextAccent,
                  boxShadow: isFinal
                    ? 'none'
                    : `0 0 24px ${alpha(nextAccent, 0.55)}`,
                },
                '&.Mui-disabled': {
                  color: alpha(UI_COLORS.white, 0.2),
                },
              }}
            >
              {isFinal ? 'Done' : steps[activeStep + 1].title}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* DOCUMENTATION CTA */}
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 2,
          border: `1px solid ${alpha(UI_COLORS.white, 0.08)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(GREEN, 0.04)} 100%)`,
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
              color: GREEN,
              textTransform: 'uppercase',
              mb: 0.75,
            }}
          >
            Need more detail?
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '1.1rem', md: '1.3rem' },
              fontWeight: 600,
              color: UI_COLORS.white,
              letterSpacing: '-0.01em',
            }}
          >
            Advanced configuration and troubleshooting.
          </Typography>
        </Box>
        <Button
          href="https://docs.gittensor.io/miner.html"
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
          sx={{
            background: alpha(UI_COLORS.white, 0.08),
            border: `1px solid ${alpha(UI_COLORS.white, 0.2)}`,
            color: UI_COLORS.white,
            fontWeight: 600,
            fontSize: '0.9rem',
            textTransform: 'none',
            px: 2.5,
            py: 1,
            borderRadius: 1.5,
            whiteSpace: 'nowrap',
            '&:hover': {
              background: alpha(UI_COLORS.white, 0.15),
              borderColor: alpha(UI_COLORS.white, 0.35),
            },
          }}
        >
          Miner docs
        </Button>
      </Box>
    </Box>
  );
};

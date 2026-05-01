import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  alpha,
  keyframes,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useStats } from '../../api';
import {
  useDailyAlphaEmissions,
  useMonthlyRewards,
} from '../../hooks/useMonthlyRewards';

const VIEWBOX_W = 1200;
const VIEWBOX_H = 280;
const STAGE_X = { code: 180, ai: 600, output: 980 };
const AI_Y = VIEWBOX_H / 2;

const drift1 = keyframes`
  0%, 100% { transform: translate3d(-6%, -6%, 0); }
  50%      { transform: translate3d(6%, 4%, 0); }
`;
const drift2 = keyframes`
  0%, 100% { transform: translate3d(8%, 4%, 0); }
  50%      { transform: translate3d(-4%, -6%, 0); }
`;
const titleShimmer = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
`;
const dashFlow = keyframes`
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -40; }
`;
const haloPulse = keyframes`
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 0.9;  transform: scale(1.08); }
`;
const nodePulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1; }
`;

const aiNodes: Array<{ angle: number; r: number; delay: number }> = [
  { angle: 200, r: 110, delay: 0 },
  { angle: 240, r: 130, delay: 0.4 },
  { angle: 160, r: 130, delay: 0.8 },
  { angle: 320, r: 110, delay: 1.2 },
  { angle: 290, r: 140, delay: 1.6 },
  { angle: 30, r: 130, delay: 2 },
  { angle: 70, r: 110, delay: 2.4 },
];

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

// Subnet 74 emissions are split 18 / 41 / 41 between subnet owner /
// miners / validators+nominators on-chain. The hero only surfaces the
// miner slice — that is the audience for this product.
const MINER_SHARE = 0.41;

const HeroFlow: React.FC = () => {
  const { data: stats } = useStats();
  const taoPrice = stats?.prices?.tao?.data?.price ?? null;
  const alphaPrice = stats?.prices?.alpha?.data?.price ?? null;
  const dailyEmissions = useDailyAlphaEmissions();

  const minerDailyUsd = useMemo(() => {
    if (!taoPrice || !alphaPrice) return null;
    return taoPrice * alphaPrice * dailyEmissions * MINER_SHARE;
  }, [taoPrice, alphaPrice, dailyEmissions]);

  const aiCenter = { x: STAGE_X.ai, y: AI_Y };
  const nodePositions = aiNodes.map((n) => ({
    ...polar(aiCenter.x, aiCenter.y, n.r, n.angle),
    delay: n.delay,
  }));

  return (
    <Box
      sx={{
        position: 'relative',
        pt: { xs: 6, sm: 10 },
        pb: { xs: 4, sm: 5 },
        overflow: 'hidden',
      }}
    >
      <Ambient />

      <Stack
        alignItems="center"
        spacing={{ xs: 2, sm: 3 }}
        sx={{ position: 'relative', zIndex: 1, maxWidth: 1100, mx: 'auto' }}
      >
        <Typography
          variant="h1"
          fontWeight="bold"
          sx={(theme) => ({
            fontSize: { xs: '2.5rem', sm: '4rem', md: '5.5rem' },
            textAlign: 'center',
            letterSpacing: '0.02em',
            lineHeight: 1,
            background: `linear-gradient(110deg, ${theme.palette.text.primary} 0%, ${alpha(
              theme.palette.diff.additions,
              0.95,
            )} 35%, ${theme.palette.text.primary} 60%, ${alpha(
              theme.palette.status.award,
              0.9,
            )} 85%, ${theme.palette.text.primary} 100%)`,
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: `${titleShimmer} 8s ease-in-out infinite`,
          })}
        >
          GITTENSOR
        </Typography>
        <Stack alignItems="center" spacing={1.25}>
          <Box
            sx={(theme) => ({
              px: 1.25,
              py: 0.4,
              borderRadius: 999,
              border: `1px solid ${alpha(theme.palette.diff.additions, 0.45)}`,
              backgroundColor: alpha(theme.palette.diff.additions, 0.08),
              color: theme.palette.diff.additions,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            })}
          >
            Bittensor · Subnet 74
          </Box>
          <MarketStrip />
          <Typography
            sx={{
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
              textAlign: 'center',
              color: 'text.secondary',
              maxWidth: 580,
              lineHeight: 1.55,
            }}
          >
            Get paid for open source. On-chain AI evaluates every merged pull
            request and pays you in TAO — block by block.
          </Typography>
        </Stack>

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 1100,
            aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}`,
            mt: { xs: 1, sm: 2 },
          }}
        >
          <Box
            component="svg"
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            preserveAspectRatio="xMidYMid meet"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <defs>
              <radialGradient id="hf-aiHalo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>

            <Box
              component="g"
              sx={(theme) => ({ color: theme.palette.diff.additions })}
            >
              <circle
                cx={aiCenter.x}
                cy={aiCenter.y}
                r={170}
                fill="url(#hf-aiHalo)"
              />
            </Box>

            <Box
              component="g"
              sx={(theme) => ({
                color: theme.palette.diff.additions,
                stroke: 'currentColor',
                strokeWidth: 1.4,
                strokeOpacity: 0.45,
              })}
            >
              {nodePositions.map((n, i) => (
                <line
                  key={`edge-${i}`}
                  x1={n.x}
                  y1={n.y}
                  x2={aiCenter.x}
                  y2={aiCenter.y}
                />
              ))}
              {nodePositions.map((n, i) => {
                const next = nodePositions[(i + 2) % nodePositions.length];
                return (
                  <line
                    key={`cross-${i}`}
                    x1={n.x}
                    y1={n.y}
                    x2={next.x}
                    y2={next.y}
                    strokeOpacity={0.18}
                  />
                );
              })}
            </Box>

            {nodePositions.map((n, i) => (
              <Box
                key={`node-${i}`}
                component="circle"
                cx={n.x}
                cy={n.y}
                r={8}
                sx={(theme) => ({
                  fill: theme.palette.diff.additions,
                  animation: `${nodePulse} 2.4s ease-in-out ${n.delay}s infinite`,
                })}
              />
            ))}

            {/* Code → AI: dashed flow line */}
            <Box
              component="line"
              x1={STAGE_X.code + 60}
              y1={AI_Y}
              x2={STAGE_X.ai - 150}
              y2={AI_Y}
              sx={(theme) => ({
                stroke: theme.palette.diff.additions,
                strokeWidth: 2,
                strokeDasharray: '8 8',
                animation: `${dashFlow} 1.2s linear infinite`,
              })}
            />

            {/* AI → Miners: straight dashed flow line */}
            <Box
              component="line"
              x1={STAGE_X.ai + 150}
              y1={AI_Y}
              x2={STAGE_X.output - 60}
              y2={AI_Y}
              sx={(theme) => ({
                stroke: theme.palette.diff.additions,
                strokeWidth: 2.5,
                strokeDasharray: '8 8',
                animation: `${dashFlow} 1.2s linear infinite`,
              })}
            />
          </Box>

          {/* Stage overlays */}
          <StageBlock
            xPct={(STAGE_X.code / VIEWBOX_W) * 100}
            yPct={(AI_Y / VIEWBOX_H) * 100}
          >
            <CodeIcon />
            <StageLabel title="Code" sub="git push" />
          </StageBlock>

          <StageBlock
            xPct={(STAGE_X.ai / VIEWBOX_W) * 100}
            yPct={(AI_Y / VIEWBOX_H) * 100}
          >
            <LogoCore />
            <StageLabel title="AI evaluation" sub="subnet 74" />
          </StageBlock>

          <OutputNode
            xPct={(STAGE_X.output / VIEWBOX_W) * 100}
            yPct={(AI_Y / VIEWBOX_H) * 100}
            label="Miners (you)"
            dailyUsd={minerDailyUsd}
          />
        </Box>

        <MonthlyPoolTile />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            mt: { xs: 1, sm: 2 },
            width: '100%',
            maxWidth: HERO_BLOCK_MAX_WIDTH,
          }}
        >
          <Button
            component={RouterLink}
            to="/dashboard"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              flex: 1,
              borderRadius: 2,
            }}
          >
            Go to dashboard
          </Button>
          <Button
            component={RouterLink}
            to="/onboard"
            variant="outlined"
            size="large"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              flex: 1,
              borderRadius: 2,
            }}
          >
            How it works
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

const Ambient: React.FC = () => (
  <Box
    aria-hidden
    sx={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  >
    <Box
      sx={(theme) => ({
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '40vw',
        height: '40vw',
        maxWidth: 520,
        maxHeight: 520,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(
          theme.palette.diff.additions,
          0.18,
        )} 0%, ${alpha(theme.palette.diff.additions, 0)} 70%)`,
        filter: 'blur(40px)',
        animation: `${drift1} 30s ease-in-out infinite`,
        willChange: 'transform',
      })}
    />
    <Box
      sx={(theme) => ({
        position: 'absolute',
        top: '5%',
        right: '-5%',
        width: '38vw',
        height: '38vw',
        maxWidth: 480,
        maxHeight: 480,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(
          theme.palette.status.award,
          0.14,
        )} 0%, ${alpha(theme.palette.status.award, 0)} 70%)`,
        filter: 'blur(40px)',
        animation: `${drift2} 36s ease-in-out infinite`,
        willChange: 'transform',
      })}
    />
  </Box>
);

const StageBlock: React.FC<{
  xPct: number;
  yPct: number;
  children: React.ReactNode;
}> = ({ xPct, yPct, children }) => (
  <Stack
    alignItems="center"
    spacing={1}
    sx={{
      position: 'absolute',
      left: `${xPct}%`,
      top: `${yPct}%`,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }}
  >
    {children}
  </Stack>
);

const StageLabel: React.FC<{
  title: string;
  sub: string;
}> = ({ title, sub }) => (
  <Stack alignItems="center" spacing={0.25} sx={{ mt: 0.5 }}>
    <Typography
      sx={{
        fontSize: { xs: '0.85rem', sm: '0.95rem' },
        fontWeight: 700,
        color: 'text.primary',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {title}
    </Typography>
    <Typography
      sx={{
        fontSize: { xs: '0.65rem', sm: '0.7rem' },
        color: 'text.tertiary',
        fontFamily: '"JetBrains Mono", monospace',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {sub}
    </Typography>
  </Stack>
);

const CodeIcon: React.FC = () => (
  <Box
    sx={(theme) => ({
      width: { xs: 52, sm: 64 },
      height: { xs: 52, sm: 64 },
      borderRadius: 2,
      border: `1.5px solid ${alpha(theme.palette.diff.additions, 0.6)}`,
      display: 'grid',
      placeItems: 'center',
      backgroundColor: alpha(theme.palette.diff.additions, 0.08),
      color: theme.palette.diff.additions,
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 700,
      fontSize: { xs: '1.2rem', sm: '1.4rem' },
    })}
  >
    {'</>'}
  </Box>
);

const LogoCore: React.FC = () => (
  <Box
    sx={{
      position: 'relative',
      width: { xs: 88, sm: 120 },
      height: { xs: 88, sm: 120 },
      display: 'grid',
      placeItems: 'center',
    }}
  >
    <Box
      aria-hidden
      sx={(theme) => ({
        position: 'absolute',
        inset: -10,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(
          theme.palette.diff.additions,
          0.45,
        )} 0%, ${alpha(theme.palette.diff.additions, 0)} 70%)`,
        animation: `${haloPulse} 4s ease-in-out infinite`,
        willChange: 'opacity, transform',
      })}
    />
    <Box
      sx={(theme) => ({
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        border: `1.5px solid ${alpha(theme.palette.diff.additions, 0.55)}`,
        backgroundColor: alpha(theme.palette.background.default, 0.7),
      })}
    >
      <Box
        component="img"
        src="/gt-logo.svg"
        alt="Gittensor"
        sx={(theme) => ({
          width: '60%',
          height: '60%',
          filter: `grayscale(100%) invert(1) drop-shadow(0 0 6px ${alpha(
            theme.palette.diff.additions,
            0.6,
          )})`,
        })}
      />
    </Box>
  </Box>
);

const formatUsd = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const OutputNode: React.FC<{
  xPct: number;
  yPct: number;
  label: string;
  dailyUsd: number | null;
}> = ({ xPct, yPct, label, dailyUsd }) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={1.25}
    sx={(theme) => ({
      position: 'absolute',
      left: `${xPct}%`,
      top: `${yPct}%`,
      transform: 'translate(-50%, -50%)',
      px: { xs: 1.5, sm: 1.75 },
      py: { xs: 1, sm: 1.1 },
      borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.diff.additions, 0.5)}`,
      backgroundColor: alpha(theme.palette.diff.additions, 0.08),
      backdropFilter: 'blur(4px)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    })}
  >
    <Box
      sx={(theme) => ({
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: theme.palette.diff.additions,
        boxShadow: `0 0 6px ${theme.palette.diff.additions}`,
        flexShrink: 0,
      })}
    />
    <Stack spacing={0.4}>
      <Typography
        sx={{
          fontSize: { xs: '0.78rem', sm: '0.85rem' },
          color: 'text.secondary',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={(theme) => ({
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: { xs: '0.95rem', sm: '1.05rem' },
          fontWeight: 700,
          color: theme.palette.diff.additions,
          lineHeight: 1,
        })}
      >
        {dailyUsd !== null ? `${formatUsd(dailyUsd)} / day` : '—'}
      </Typography>
    </Stack>
  </Stack>
);

const HERO_BLOCK_MAX_WIDTH = 480;

const MonthlyPoolTile: React.FC = () => {
  const monthly = useMonthlyRewards();

  return (
    <Box
      sx={(theme) => ({
        mt: { xs: 2, sm: 2.5 },
        width: '100%',
        maxWidth: HERO_BLOCK_MAX_WIDTH,
        px: { xs: 3, sm: 4 },
        py: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        backdropFilter: 'blur(6px)',
        textAlign: 'center',
      })}
    >
      <Typography
        sx={{
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontWeight: 700,
          color: 'text.secondary',
          mb: 0.75,
        }}
      >
        Monthly emission pool
      </Typography>
      <Typography
        sx={(theme) => ({
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: { xs: '2rem', sm: '2.6rem' },
          fontWeight: 700,
          color: theme.palette.text.primary,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        })}
      >
        {monthly !== undefined
          ? `$${monthly.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : '—'}
      </Typography>
      <Typography
        sx={{
          mt: 0.85,
          fontSize: { xs: '0.78rem', sm: '0.85rem' },
          color: 'text.secondary',
          lineHeight: 1.5,
          maxWidth: 360,
          mx: 'auto',
        }}
      >
        Compete for rewards by contributing quality code to open source.
      </Typography>
    </Box>
  );
};

const MarketStrip: React.FC = () => {
  const { data: stats } = useStats();
  const taoData = stats?.prices?.tao?.data ?? null;
  const alphaData = stats?.prices?.alpha?.data ?? null;
  const taoPrice = taoData?.price ?? null;
  const alphaPrice = alphaData?.price ?? null;

  if (!taoPrice && !alphaPrice) return null;

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      justifyContent="center"
      alignItems="center"
      gap={{ xs: 0.75, sm: 1.25 }}
      sx={{ fontFamily: '"JetBrains Mono", monospace' }}
    >
      <MarketChip
        symbol="TAO"
        value={taoPrice !== null ? `$${taoPrice.toFixed(2)}` : '—'}
        change={taoData?.percentChange24h}
      />
      <Sep />
      <MarketChip
        symbol="α"
        value={alphaPrice !== null ? `${alphaPrice.toFixed(4)} τ` : '—'}
        change={alphaData?.percentChange24h}
      />
    </Stack>
  );
};

const Sep: React.FC = () => (
  <Box
    sx={(theme) => ({
      width: 4,
      height: 4,
      borderRadius: '50%',
      backgroundColor: alpha(theme.palette.text.primary, 0.25),
    })}
  />
);

const MarketChip: React.FC<{
  symbol: string;
  value: string;
  change?: number | null;
}> = ({ symbol, value, change }) => {
  const hasChange =
    change !== null && change !== undefined && Number.isFinite(change);
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.6}
      sx={(theme) => ({
        px: 1,
        py: 0.4,
        borderRadius: 999,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        fontSize: { xs: '0.78rem', sm: '0.85rem' },
        lineHeight: 1,
      })}
    >
      <Box
        component="span"
        sx={(theme) => ({
          px: 0.7,
          py: 0.2,
          borderRadius: 999,
          backgroundColor: alpha(theme.palette.diff.additions, 0.18),
          color: theme.palette.diff.additions,
          fontFamily: 'inherit',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        })}
      >
        {symbol}
      </Box>
      <Typography
        component="span"
        sx={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 700,
          color: 'text.primary',
        }}
      >
        {value}
      </Typography>
      {hasChange ? (
        <Stack
          component="span"
          direction="row"
          alignItems="center"
          sx={(theme) => ({
            color:
              (change as number) >= 0
                ? theme.palette.diff.additions
                : theme.palette.diff.deletions,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 700,
          })}
        >
          {(change as number) >= 0 ? (
            <ArrowDropUpIcon sx={{ fontSize: '1rem', mx: -0.25 }} />
          ) : (
            <ArrowDropDownIcon sx={{ fontSize: '1rem', mx: -0.25 }} />
          )}
          {Math.abs(change as number).toFixed(2)}%
        </Stack>
      ) : null}
    </Stack>
  );
};

export default HeroFlow;

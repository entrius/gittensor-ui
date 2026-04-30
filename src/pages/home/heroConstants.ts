import { UI_COLORS } from '../../theme';

export const HERO_VIEWBOX = { width: 1000, height: 500 } as const;

export const HERO_GEOMETRY = {
  centerX: HERO_VIEWBOX.width / 2,
  centerY: HERO_VIEWBOX.height / 2,
  sphereRadius: 88,
  diskWidth: 760,
  haloOuter: { rx: 340, ry: 210 },
  haloInner: { rx: 240, ry: 160 },
  arcLine: { rx: 232, ry: 156 },
  topArch: { rx: 250, ry: 168 },
} as const;

/** Reward summary width and negative top margin (percentages) so its top edge lands on the hero disk. */
export const CARD_LAYOUT = {
  widthPct: (HERO_GEOMETRY.diskWidth / HERO_VIEWBOX.width) * 100,
  marginPct:
    (1 - HERO_GEOMETRY.centerY / HERO_VIEWBOX.height) *
    (HERO_VIEWBOX.height / HERO_VIEWBOX.width) *
    100,
} as const;

export const HERO_TIMINGS = {
  haloBreathe: { idle: 5.4, hover: 3 },
  diskPulse: { idle: 4.4, hover: 2.4 },
  rippleShimmerBase: { idle: 5.4, hover: 2.6 },
  sparkTwinkle: { idle: 3.4, hover: 1.6 },
  glowWave: { idle: 5.4, hover: 3.2 },
  archGlow: { idle: 4.2, hover: 2.4 },
  archTravel: { idle: 14, hover: 8 },
} as const;

export const RIPPLE_RADII = [
  120, 175, 240, 320, 410, 510, 620, 740, 870,
] as const;

export const GLOW_WAVE_DELAYS = [0, 1.8, 3.6] as const;

export interface HeroSpark {
  x: number;
  y: number;
  r: number;
  durationSec: number;
  delaySec: number;
}

export const HERO_SPARKS: readonly HeroSpark[] = [
  { x: 220, y: 70, r: 1.6, durationSec: 3.4, delaySec: 0 },
  { x: 320, y: 40, r: 1.2, durationSec: 4.2, delaySec: 0.6 },
  { x: 420, y: 22, r: 2, durationSec: 3.8, delaySec: 1.2 },
  { x: 540, y: 36, r: 1.4, durationSec: 4.6, delaySec: 0.3 },
  { x: 640, y: 60, r: 1.8, durationSec: 3.2, delaySec: 1.8 },
  { x: 720, y: 90, r: 1.2, durationSec: 4, delaySec: 0.9 },
  { x: 180, y: 140, r: 1.4, durationSec: 3.6, delaySec: 2.2 },
  { x: 800, y: 130, r: 1.6, durationSec: 4.4, delaySec: 1.4 },
  { x: 380, y: 90, r: 1, durationSec: 3, delaySec: 2.6 },
  { x: 580, y: 100, r: 1, durationSec: 3.5, delaySec: 0.4 },
  { x: 460, y: 150, r: 1, durationSec: 3.7, delaySec: 1 },
  { x: 280, y: 180, r: 0.8, durationSec: 4.1, delaySec: 1.6 },
  { x: 660, y: 175, r: 1, durationSec: 3.9, delaySec: 2.4 },
  { x: 140, y: 60, r: 1, durationSec: 4.3, delaySec: 0.5 },
  { x: 860, y: 50, r: 1.2, durationSec: 3.6, delaySec: 1.7 },
];

/** RGB triplets for use inside @keyframes and inline filter strings; mirror UI_COLORS. */
export const PRIMARY_RGB = '29, 55, 252';
export const WHITE_RGB = '255, 255, 255';

if (import.meta.env.DEV && UI_COLORS.primary.toLowerCase() !== '#1d37fc') {
  console.warn(
    '[heroConstants] PRIMARY_RGB is out of sync with UI_COLORS.primary',
  );
}

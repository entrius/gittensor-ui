import { type Theme } from '@mui/material/styles';

/**
 * WCAG contrast utilities for the light/dark theme rollout.
 *
 * Light mode unblocks a class of accessibility regressions that the
 * dark-only design previously masked: text laid over coloured chips,
 * status badges, and tinted surfaces can drop below WCAG AA in light mode
 * even when the dark equivalent passed comfortably.
 *
 * These helpers let component code:
 *   - Pick the readable foreground colour for an arbitrary background.
 *   - Compute the contrast ratio and verify it meets a target level.
 *   - Auto-select between palette text tokens (`text.primary`,
 *     `background.default`) when contrast on a coloured surface is unclear.
 *
 * All inputs accept hex (`#rrggbb` / `#rgb`) and `rgb(…)` / `rgba(…)` strings.
 * Other CSS colour formats are not currently supported — callers should
 * resolve those upstream (e.g. via `theme.palette.x`).
 */

/* ── Constants ───────────────────────────────────────────────── */

/** WCAG 2.x AA target for normal text. */
export const WCAG_AA_NORMAL = 4.5;
/** WCAG 2.x AA target for large text (≥18pt or 14pt bold). */
export const WCAG_AA_LARGE = 3;
/** WCAG 2.x AAA target for normal text. */
export const WCAG_AAA_NORMAL = 7;
/** WCAG 2.x AAA target for large text. */
export const WCAG_AAA_LARGE = 4.5;

export type WcagLevel = 'AA' | 'AAA';
export type WcagSize = 'normal' | 'large';

/* ── Parsing ─────────────────────────────────────────────────── */

interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Parses a hex colour (`#rgb`, `#rrggbb`, or `#rrggbbaa`). Alpha ignored. */
function parseHex(hex: string): RGB | null {
  const trimmed = hex.replace(/^#/, '').trim();
  if (trimmed.length === 3) {
    const r = parseInt(trimmed[0] + trimmed[0], 16);
    const g = parseInt(trimmed[1] + trimmed[1], 16);
    const b = parseInt(trimmed[2] + trimmed[2], 16);
    return Number.isFinite(r + g + b) ? { r, g, b } : null;
  }
  if (trimmed.length === 6 || trimmed.length === 8) {
    const r = parseInt(trimmed.slice(0, 2), 16);
    const g = parseInt(trimmed.slice(2, 4), 16);
    const b = parseInt(trimmed.slice(4, 6), 16);
    return Number.isFinite(r + g + b) ? { r, g, b } : null;
  }
  return null;
}

/** Parses `rgb(…)` or `rgba(…)`. Alpha ignored. */
function parseRgb(input: string): RGB | null {
  const match = input.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i,
  );
  if (!match) return null;
  const [, r, g, b] = match;
  return {
    r: Math.round(Number(r)),
    g: Math.round(Number(g)),
    b: Math.round(Number(b)),
  };
}

/**
 * Parses a CSS colour string into an `{ r, g, b }` triple. Returns `null`
 * for unsupported formats (e.g. named colours, hsl).
 */
export function parseColor(input: string): RGB | null {
  if (!input) return null;
  if (input.startsWith('#')) return parseHex(input);
  if (input.startsWith('rgb')) return parseRgb(input);
  return null;
}

/* ── Luminance + contrast ────────────────────────────────────── */

/** Linearises an sRGB component per the WCAG relative-luminance formula. */
function linearise(channel: number): number {
  const v = channel / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Computes the WCAG 2.x relative luminance of a colour. Returns a value
 * between 0 (black) and 1 (white). Returns `0` for unparseable colours.
 */
export function relativeLuminance(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) return 0;
  const r = linearise(rgb.r);
  const g = linearise(rgb.g);
  const b = linearise(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Returns the WCAG contrast ratio between two colours. `1` = same colour,
 * `21` = pure black on pure white. Anything below 4.5 fails AA for normal
 * text.
 */
export function contrastRatio(foreground: string, background: string): number {
  const lf = relativeLuminance(foreground);
  const lb = relativeLuminance(background);
  const lighter = Math.max(lf, lb);
  const darker = Math.min(lf, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ── Threshold checks ────────────────────────────────────────── */

/** Returns the WCAG threshold for a given (level, size) combination. */
export function wcagThreshold(level: WcagLevel, size: WcagSize): number {
  if (level === 'AAA') {
    return size === 'large' ? WCAG_AAA_LARGE : WCAG_AAA_NORMAL;
  }
  return size === 'large' ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
}

/**
 * Returns `true` if the foreground/background contrast meets the requested
 * WCAG level/size threshold (defaults: AA / normal).
 */
export function meetsContrast(
  foreground: string,
  background: string,
  level: WcagLevel = 'AA',
  size: WcagSize = 'normal',
): boolean {
  return contrastRatio(foreground, background) >= wcagThreshold(level, size);
}

/* ── Smart picks ─────────────────────────────────────────────── */

/**
 * Returns a readable foreground colour for the supplied background. Picks
 * `theme.palette.background.default` (typically dark in dark mode, white in
 * light mode) or its inverse, whichever has the higher contrast ratio.
 */
export function readableForegroundFor(
  theme: Theme,
  background: string,
): string {
  const dark = theme.palette.background.default;
  const light = theme.palette.text.primary;
  return contrastRatio(dark, background) >= contrastRatio(light, background)
    ? dark
    : light;
}

/**
 * Returns the higher-contrast option of the supplied candidates. Useful when
 * a component already knows the two stylistically appropriate options and
 * just wants the more legible one.
 */
export function pickHighestContrast(
  background: string,
  candidates: readonly string[],
): string {
  if (candidates.length === 0) return '';
  let best = candidates[0];
  let bestRatio = contrastRatio(best, background);
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best;
}

/**
 * Returns `foreground` if it meets the requested contrast level; otherwise
 * returns the inverse of `theme.palette.text.primary` /
 * `theme.palette.background.default`, whichever has higher contrast.
 *
 * Common usage: take a brand colour, return it if legible on the surface,
 * otherwise fall back to the readable text token.
 */
export function ensureReadable(
  theme: Theme,
  foreground: string,
  background: string,
  level: WcagLevel = 'AA',
  size: WcagSize = 'normal',
): string {
  if (meetsContrast(foreground, background, level, size)) return foreground;
  return readableForegroundFor(theme, background);
}

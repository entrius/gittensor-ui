import { alpha, type Theme } from '@mui/material/styles';
import { CHART_COLORS } from '../theme';

/**
 * Theme-mode utilities for the GitHub-aligned light mode rollout.
 *
 * The light/dark split touches dozens of components, almost all of which
 * branch on `theme.palette.mode === 'dark'`. These helpers centralise that
 * branch so call sites stay short, type-safe, and easy to grep for.
 *
 * Design notes:
 *   - Helpers are pure and accept the full `Theme` so they can be used inside
 *     MUI `sx` callbacks without an extra `useTheme()` invocation.
 *   - Generic `<T>` value pickers preserve the caller's static type — they
 *     don't widen to `string | number` or similar.
 *   - The module re-exports a small set of palette-derived value selectors
 *     (`getPositiveColor`, `getChartSegmentColors`, …) so component code can
 *     import "the light-mode-correct value for X" rather than duplicating
 *     conditional logic at each callsite.
 */

/* ── Predicates ──────────────────────────────────────────────── */

/** Type-narrowed predicate for dark mode. Cheaper to read than the inline check. */
export function isDarkMode(theme: Theme): boolean {
  return theme.palette.mode === 'dark';
}

/** Type-narrowed predicate for light mode. Inverse of `isDarkMode`. */
export function isLightMode(theme: Theme): boolean {
  return theme.palette.mode === 'light';
}

/* ── Value pickers ───────────────────────────────────────────── */

/**
 * Picks one of two values based on the current theme mode.
 *
 * @example
 *   const bg = themeAware(theme, '#0d1117', '#ffffff');
 *   const radius = themeAware(theme, 8, 6);
 */
export function themeAware<T>(theme: Theme, darkValue: T, lightValue: T): T {
  return isDarkMode(theme) ? darkValue : lightValue;
}

/**
 * Object-form variant of `themeAware`. Slightly more readable when the values
 * are long expressions or when the caller wants to label the branches at the
 * call site.
 *
 * @example
 *   const fg = mode(theme, {
 *     dark: alpha(theme.palette.text.primary, 0.6),
 *     light: theme.palette.text.secondary,
 *   });
 */
export function mode<T>(theme: Theme, options: { dark: T; light: T }): T {
  return isDarkMode(theme) ? options.dark : options.light;
}

/**
 * Returns `value` only in dark mode; otherwise returns `fallback` (default
 * `undefined`). Useful for properties that should disappear in light mode
 * (e.g. `backdropFilter: 'blur(12px)'` only in dark).
 */
export function darkOnly<T>(theme: Theme, value: T): T | undefined;
export function darkOnly<T, F>(theme: Theme, value: T, fallback: F): T | F;
export function darkOnly<T, F = undefined>(
  theme: Theme,
  value: T,
  fallback?: F,
): T | F | undefined {
  return isDarkMode(theme) ? value : (fallback as F | undefined);
}

/**
 * Returns `value` only in light mode; otherwise returns `fallback` (default
 * `undefined`). Mirror of `darkOnly`.
 */
export function lightOnly<T>(theme: Theme, value: T): T | undefined;
export function lightOnly<T, F>(theme: Theme, value: T, fallback: F): T | F;
export function lightOnly<T, F = undefined>(
  theme: Theme,
  value: T,
  fallback?: F,
): T | F | undefined {
  return isDarkMode(theme) ? (fallback as F | undefined) : value;
}

/* ── Tinted color helpers ────────────────────────────────────── */

/**
 * Returns the primary text color tinted by `opacity`. Replaces the very
 * common pattern `alpha(theme.palette.text.primary, x)` so we can swap the
 * underlying token if the design system changes.
 */
export function tintedText(theme: Theme, opacity: number): string {
  return alpha(theme.palette.text.primary, opacity);
}

/**
 * Returns a translucent surface tint that adapts per mode.
 *   - dark: white text @ `darkOpacity`
 *   - light: black text @ `lightOpacity` (defaults to half of `darkOpacity`)
 */
export function tintedSurface(
  theme: Theme,
  darkOpacity: number,
  lightOpacity: number = darkOpacity / 2,
): string {
  const base = isDarkMode(theme)
    ? theme.palette.common.white
    : theme.palette.common.black;
  return alpha(base, isDarkMode(theme) ? darkOpacity : lightOpacity);
}

/**
 * Returns a border colour appropriate for the active mode. Defaults to
 * `palette.border.light`, but accepts an explicit dark/light pair for
 * components that need a heavier border in one mode.
 */
export function modeBorder(
  theme: Theme,
  options?: { dark?: string; light?: string },
): string {
  const fallback = theme.palette.border.light;
  return mode(theme, {
    dark: options?.dark ?? fallback,
    light: options?.light ?? fallback,
  });
}

/* ── Active-tab styling (existing) ───────────────────────────── */

export interface ModeActiveTabOptions {
  activeColor?: string;
  darkAlpha?: number;
  darkHoverAlpha?: number;
}

export type ChartSegmentColors = [string, string, string];

export function modeActiveTabSx(
  theme: Theme,
  isActive: boolean,
  { activeColor, darkAlpha = 0.12, darkHoverAlpha }: ModeActiveTabOptions = {},
) {
  const isDark = isDarkMode(theme);
  const lightBg = activeColor ?? theme.palette.status.success;
  const bg = isDark ? alpha(theme.palette.text.primary, darkAlpha) : lightBg;
  const hoverBg = isDark
    ? alpha(theme.palette.text.primary, darkHoverAlpha ?? darkAlpha + 0.04)
    : lightBg;
  const activeText = isDark
    ? theme.palette.text.primary
    : theme.palette.common.white;
  return {
    backgroundColor: isActive ? bg : 'transparent',
    color: isActive ? activeText : theme.palette.text.secondary,
    '&:hover': {
      backgroundColor: isActive
        ? hoverBg
        : alpha(theme.palette.text.primary, 0.06),
      color: isActive ? activeText : theme.palette.text.primary,
    },
  };
}

/* ── Palette-derived values ──────────────────────────────────── */

/** Returns the primary positive-metric color for the current theme mode. */
export function getPositiveColor(theme: Theme): string {
  return mode(theme, {
    dark: theme.palette.status.merged,
    light: theme.palette.status.success,
  });
}

/** Returns the negative/closed-metric colour. Same in both modes today, but
 * exported through the helper so future divergence is centralised. */
export function getNegativeColor(theme: Theme): string {
  return theme.palette.status.closed;
}

/** Returns the warning/award metric colour for the current theme mode. */
export function getWarningColor(theme: Theme): string {
  return theme.palette.status.warning;
}

/** Returns [merged, open, closed] chart colors resolved for the current theme mode. */
export function getChartSegmentColors(theme: Theme): ChartSegmentColors {
  const isDark = isDarkMode(theme);
  return [
    isDark ? CHART_COLORS.merged : theme.palette.status.success,
    isDark ? CHART_COLORS.open : theme.palette.border.light,
    isDark ? CHART_COLORS.closed : theme.palette.status.closed,
  ];
}

/* ── Conditional sx fragments ────────────────────────────────── */

/**
 * Returns `sx`-compatible properties only in dark mode. Spread into an `sx`
 * object to apply dark-only effects without polluting light mode.
 *
 * @example
 *   sx={(theme) => ({
 *     ...darkOnlySx(theme, {
 *       backgroundColor: alpha(theme.palette.text.primary, 0.04),
 *       backdropFilter: 'blur(12px)',
 *     }),
 *     border: `1px solid ${theme.palette.border.light}`,
 *   })}
 */
export function darkOnlySx<T extends Record<string, unknown>>(
  theme: Theme,
  values: T,
): T | Record<string, never> {
  return isDarkMode(theme) ? values : {};
}

/** Mirror of `darkOnlySx` — returns `values` only in light mode. */
export function lightOnlySx<T extends Record<string, unknown>>(
  theme: Theme,
  values: T,
): T | Record<string, never> {
  return isLightMode(theme) ? values : {};
}

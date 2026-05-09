import { useMemo } from 'react';
import { useTheme, type Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/material';

/**
 * Hooks for resolving theme-dependent `sx` props eagerly inside a component.
 *
 * MUI's `sx` prop accepts a function `(theme) => sxObject`, but that function
 * runs every time the parent re-renders. For complex sx objects that branch
 * on `theme.palette.mode`, the recomputation is wasted work — the sx is
 * stable for a given mode.
 *
 * `useThemedSx` solves this by:
 *   - Calling the builder once per mode change (not per render).
 *   - Memoising the resulting sx object so children that receive it via
 *     props don't re-render unless the theme actually changed.
 *
 * @example
 *   const containerSx = useThemedSx((theme) => ({
 *     backgroundColor: theme.palette.background.paper,
 *     borderColor: theme.palette.border.light,
 *     ...(theme.palette.mode === 'dark'
 *       ? { backdropFilter: 'blur(12px)' }
 *       : { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }),
 *   }));
 *   return <Box sx={containerSx}>{children}</Box>;
 */

type SxBuilder<T = unknown> = (theme: Theme) => T;

/**
 * Memoises a theme-derived `sx` object. The builder runs once per theme
 * change; the returned reference is stable until the theme switches.
 */
export function useThemedSx<T = SxProps<Theme>>(builder: SxBuilder<T>): T {
  const theme = useTheme();
  return useMemo(() => builder(theme), [theme, builder]);
}

/**
 * Variant of `useThemedSx` that takes an array of builders and returns an
 * array of resolved sx objects in the same order. Lets a component memoise
 * a batch of sx fragments in one hook call.
 */
export function useThemedSxBatch<T = SxProps<Theme>>(
  builders: ReadonlyArray<SxBuilder<T>>,
): T[] {
  const theme = useTheme();
  return useMemo(
    () => builders.map((build) => build(theme)),
    [theme, builders],
  );
}

/**
 * Resolves a value that depends on the current theme. Equivalent to
 * `useThemedSx` but typed for non-sx values (numbers, strings, colours).
 *
 * @example
 *   const positiveColor = useThemedValue(getPositiveColor);
 *   const isDark = useThemedValue((t) => t.palette.mode === 'dark');
 */
export function useThemedValue<T>(selector: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => selector(theme), [theme, selector]);
}

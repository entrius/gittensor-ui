import { alpha, type Theme } from '@mui/material/styles';

/** Subtle accent for rows/cards that belong to the configured identity. */
export const selfHighlightSx = (theme: Theme, active: boolean) => {
  if (!active) return {};
  return {
    borderLeft: `3px solid ${theme.palette.secondary.main}`,
    backgroundColor: alpha(theme.palette.secondary.main, 0.08),
  };
};

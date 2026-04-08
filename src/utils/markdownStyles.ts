import { type Theme } from '@mui/material/styles';
import { type SxProps } from '@mui/material';

interface MarkdownColors {
  fg: { default: string; muted: string };
  border: { default: string; muted: string };
  accent: { fg: string };
}

/**
 * Shared sx styles for GitHub-flavored markdown content.
 * Used by IssueConversation and PRComments to render
 * API-provided HTML with consistent formatting.
 */
export const getMarkdownContentSx = (
  theme: Theme,
  colors: MarkdownColors,
): SxProps<Theme> => ({
  p: { xs: 2, md: 3 },
  backgroundColor: 'transparent',
  color: colors.fg.default,
  fontSize: '14px',
  lineHeight: 1.6,
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
  overflowX: 'auto',
  '& > *:first-of-type': { mt: 0 },
  '& > *:last-child': { mb: 0 },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    mt: 3,
    mb: 2,
    fontWeight: 600,
    lineHeight: 1.25,
    color: colors.fg.default,
  },
  '& h1, & h2': {
    borderBottom: `1px solid ${colors.border.muted}`,
    pb: 0.3,
  },
  '& h1': { fontSize: '2em' },
  '& h2': { fontSize: '1.5em' },
  '& h3': { fontSize: '1.25em' },
  '& p': { mb: 2, mt: 0 },
  '& a': { color: colors.accent.fg, textDecoration: 'none' },
  '& a:hover': { textDecoration: 'underline' },
  '& blockquote': {
    padding: '0 1em',
    color: colors.fg.muted,
    borderLeft: `0.25em solid ${colors.border.default}`,
    my: 2,
    mx: 0,
  },
  '& ul, & ol': { pl: '2em', mb: 2 },
  '& li': { mb: 0.5 },
  '& li + li': { mt: '0.25em' },
  '& input[type="checkbox"]': {
    mr: 0.5,
    verticalAlign: 'middle',
  },
  '& code': {
    padding: '0.2em 0.4em',
    margin: 0,
    fontSize: '85%',
    backgroundColor: 'rgba(110, 118, 129, 0.4)',
    borderRadius: '6px',
    fontFamily: '"JetBrains Mono", monospace',
  },
  '& pre': {
    mt: 2,
    mb: 2,
    p: 2,
    borderRadius: '6px',
    overflow: 'auto',
    backgroundColor: theme.palette.surface.elevated,
    border: `1px solid ${colors.border.default}`,
    '& code': {
      backgroundColor: 'transparent',
      p: 0,
      fontSize: '100%',
    },
  },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    mb: 2,
    display: 'block',
    overflowX: 'auto',
  },
  '& th, & td': {
    border: `1px solid ${colors.border.default}`,
    padding: '6px 13px',
  },
  '& th': { fontWeight: 600 },
  '& tr:nth-of-type(2n)': {
    backgroundColor: theme.palette.surface.elevated,
  },
  '& hr': {
    height: '0.25em',
    p: 0,
    my: 3,
    backgroundColor: colors.border.default,
    border: 0,
  },
  '& img': {
    maxWidth: '100%',
    borderRadius: '6px',
    backgroundColor: 'transparent',
  },
});

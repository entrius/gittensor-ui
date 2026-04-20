import {
  createTheme,
  alpha,
  type Theme,
  type SxProps,
} from '@mui/material/styles';

// Shared Color Constants (exported for use outside MUI components)
export const UI_COLORS = {
  white: '#ffffff',
  black: '#000000',
  primary: '#1d37fc',
  textSecondary: '#7d7d7d',
  textTertiary: 'rgba(201, 209, 217, 0.64)',
  surfaceElevated: '#161b22',
  surfaceTooltip: 'rgba(30, 30, 30, 0.95)',
} as const;

export const RANK_COLORS = {
  first: '#FFD700',
  second: '#C0C0C0',
  third: '#CD7F32',
} as const;

export const STATUS_COLORS = {
  merged: '#3fb950', // Green - merged PRs
  open: alpha(UI_COLORS.white, 0.6), // Preserve prior white-on-dark appearance
  closed: '#ff7b72', // Red - closed PRs
  neutral: '#9ca3af', // Grey - default/neutral state
  success: '#4ade80', // Green - success states
  warning: '#f59e0b', // Amber - warning/pending states
  warningOrange: '#fb923c', // Orange - collateral/approaching limits
  error: '#ef4444', // Red - error states
  info: '#58a6ff', // Blue - info/link states
  award: '#f59e0b', // Amber - winner/trophy highlights
} as const;

/** Repository PR tab filter chips (GitHub-style). Merged uses blue, not STATUS_COLORS.merged. */
export const REPOSITORY_PR_FILTER_COLORS = {
  open: '#2da44e',
  merged: '#388bfd',
  closed: '#f85149',
  all: '#e6edf3',
} as const;

/** One opacity for PR status chips + Repository Stats open/merged/closed accents (avoid drift). */
export const REPOSITORY_PR_ACCENT_ALPHA = 0.98;

export const REPOSITORY_PR_STATUS_CHIP = {
  open: alpha(REPOSITORY_PR_FILTER_COLORS.open, REPOSITORY_PR_ACCENT_ALPHA),
  merged: alpha(REPOSITORY_PR_FILTER_COLORS.merged, REPOSITORY_PR_ACCENT_ALPHA),
  closed: alpha(REPOSITORY_PR_FILTER_COLORS.closed, REPOSITORY_PR_ACCENT_ALPHA),
} as const;

/** Repository Stats “Bounties” row (gift icon + label + count). */
export const REPOSITORY_STATS_BOUNTY_ACCENT = '#fbbf24';

export const CREDIBILITY_COLORS = {
  excellent: '#4ade80', // Green - 90%+
  good: '#a3e635', // Lime - 70-89%
  moderate: '#facc15', // Yellow - 50-69%
  low: '#fb923c', // Orange - 30-49%
  poor: '#f87171', // Red - below 30%
} as const;

export const RISK_COLORS = {
  exceeded: 'rgba(248, 113, 113, 0.9)', // Red - threshold exceeded
  critical: 'rgba(251, 146, 60, 0.9)', // Orange - 1 away
  approaching: 'rgba(250, 204, 21, 0.9)', // Yellow - 2 away
} as const;

export const DIFF_COLORS = {
  additions: '#7ee787', // Green - line additions
  deletions: '#ef4444', // Red - line deletions (same as closed/error)
} as const;

// Chart colors - different from status colors for better visual distinction in pie/donut charts
export const CHART_COLORS = {
  merged: '#3fb950', // Green - successful merges
  open: '#8b949e', // Grey - pending/open
  closed: '#ef4444', // Red - closed without merge
} as const;

export const scrollbarSx = {
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
  },
} as const;

/** Git-style contribution calendar levels (empty → most active) */
export const CONTRIBUTION_HEATMAP_SCALE = [
  '#161b22',
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353',
] as const;

/** Known org avatars on GitHub that need a non-transparent backdrop */
export const REPO_OWNER_AVATAR_BACKGROUNDS = {
  opentensor: '#ffffff',
  bitcoin: '#F7931A',
} as const;

export const TEXT_OPACITY = {
  primary: 1,
  secondary: 0.7,
  tertiary: 0.5,
  muted: 0.4,
  faint: 0.3,
  ghost: 0.2,
} as const;

/** Theme-driven markdown document body (README, CONTRIBUTING, etc.). */
export const markdownDocumentPaperSx = (theme: Theme): SxProps<Theme> => ({
  p: { xs: 2, md: 5 },
  pt: { xs: 2, md: 0 },
  maxWidth: '900px',
  mx: 'auto',
  backgroundColor: 'transparent',
  color: theme.palette.text.tertiary,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  lineHeight: 1.6,
  '& h1': {
    fontSize: '2em',
    borderBottom: `1px solid ${theme.palette.border.light}`,
    pb: 0.3,
    mb: 3,
    mt: 1,
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  '& h2': {
    fontSize: '1.5em',
    borderBottom: `1px solid ${theme.palette.border.light}`,
    pb: 0.3,
    mb: 3,
    mt: 2,
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  '& h3': {
    fontSize: '1.25em',
    mb: 2,
    mt: 3,
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  '& p': { marginBottom: '16px', fontSize: '16px' },
  '& a': {
    color: STATUS_COLORS.info,
    textDecoration: 'none',
    '&:hover': { textDecoration: 'underline' },
  },
  '& ul, & ol': { marginBottom: '16px', paddingLeft: '2em' },
  '& li': { marginBottom: '4px' },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.border.light}`,
    padding: '0 1em',
    color: STATUS_COLORS.open,
    marginLeft: 0,
    marginBottom: '16px',
  },
  '& code': {
    backgroundColor: alpha(theme.palette.grey[500], 0.4),
    padding: '0.2em 0.4em',
    borderRadius: '6px',
    fontSize: '85%',
    fontFamily: '"JetBrains Mono", monospace',
  },
  '& pre': {
    backgroundColor: theme.palette.surface.elevated,
    padding: '16px',
    overflow: 'auto',
    borderRadius: '6px',
    marginBottom: '16px',
    '& code': {
      backgroundColor: 'transparent',
      padding: 0,
      fontSize: '100%',
      color: theme.palette.text.tertiary,
    },
  },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    marginBottom: '16px',
    display: 'block',
    overflowX: 'auto',
  },
  '& th': {
    fontWeight: 600,
    border: `1px solid ${theme.palette.border.light}`,
    padding: '6px 13px',
    textAlign: 'left',
  },
  '& td': {
    border: `1px solid ${theme.palette.border.light}`,
    padding: '6px 13px',
  },
  '& tr:nth-of-type(2n)': {
    backgroundColor: theme.palette.surface.elevated,
  },
  '& img': { backgroundColor: 'transparent' },
});

export const headerCellStyle = {
  backgroundColor: 'surface.tooltip',
  backdropFilter: 'blur(8px)',
  color: 'text.secondary',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: '1px solid',
  borderColor: 'border.light',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

export const bodyCellStyle = {
  color: 'text.primary',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid',
  borderColor: 'border.light',
  fontSize: '0.85rem',
};

export const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: 'surface.tooltip',
      color: 'text.primary',
      fontSize: '0.72rem',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: 'border.light',
      maxWidth: 260,
    },
  },
  arrow: { sx: { color: 'surface.tooltip' } },
};

// Module Augmentation for Custom Theme Properties
declare module '@mui/material/styles' {
  interface TypeText {
    tertiary: string;
  }

  interface TypographyVariants {
    dataValue: React.CSSProperties;
    dataLabel: React.CSSProperties;
    mono: React.CSSProperties;
    monoSmall: React.CSSProperties;
    sectionTitle: React.CSSProperties;
    tableHeader: React.CSSProperties;
    statValue: React.CSSProperties;
    statLabel: React.CSSProperties;
    tooltipLabel: React.CSSProperties;
    tooltipDesc: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    dataValue?: React.CSSProperties;
    dataLabel?: React.CSSProperties;
    mono?: React.CSSProperties;
    monoSmall?: React.CSSProperties;
    sectionTitle?: React.CSSProperties;
    tableHeader?: React.CSSProperties;
    statValue?: React.CSSProperties;
    statLabel?: React.CSSProperties;
    tooltipLabel?: React.CSSProperties;
    tooltipDesc?: React.CSSProperties;
  }

  interface Palette {
    rank: {
      first: string;
      second: string;
      third: string;
    };
    status: {
      merged: string;
      open: string;
      closed: string;
      neutral: string;
      success: string;
      warning: string;
      warningOrange: string;
      error: string;
      info: string;
      award: string;
    };
    credibility: {
      excellent: string;
      good: string;
      moderate: string;
      low: string;
      poor: string;
    };
    risk: {
      exceeded: string;
      critical: string;
      approaching: string;
    };
    diff: {
      additions: string;
      deletions: string;
    };
    border: {
      subtle: string;
      light: string;
      medium: string;
    };
    surface: {
      transparent: string;
      subtle: string;
      light: string;
      elevated: string;
      tooltip: string;
    };
  }

  interface PaletteOptions {
    rank?: {
      first: string;
      second: string;
      third: string;
    };
    status?: {
      merged: string;
      open: string;
      closed: string;
      neutral: string;
      success: string;
      warning: string;
      warningOrange: string;
      error: string;
      info: string;
      award: string;
    };
    credibility?: {
      excellent: string;
      good: string;
      moderate: string;
      low: string;
      poor: string;
    };
    risk?: {
      exceeded: string;
      critical: string;
      approaching: string;
    };
    diff?: {
      additions: string;
      deletions: string;
    };
    border?: {
      subtle: string;
      light: string;
      medium: string;
    };
    surface?: {
      transparent: string;
      subtle: string;
      light: string;
      elevated: string;
      tooltip: string;
    };
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    dataValue: true;
    dataLabel: true;
    mono: true;
    monoSmall: true;
    sectionTitle: true;
    tableHeader: true;
    statValue: true;
    statLabel: true;
    tooltipLabel: true;
    tooltipDesc: true;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    back: true;
  }
}

declare module '@mui/material/Card' {
  interface CardPropsVariantOverrides {
    glass: true;
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    status: true;
    info: true;
    filter: true;
  }
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: UI_COLORS.primary,
    },
    secondary: {
      main: '#fff30d',
    },
    background: {
      default: UI_COLORS.black,
      paper: '#0a0f1f',
    },
    text: {
      primary: UI_COLORS.white,
      secondary: UI_COLORS.textSecondary,
      tertiary: UI_COLORS.textTertiary,
    },
    divider: UI_COLORS.white,
    // Rank podium colors (1st/2nd/3rd)
    rank: {
      first: RANK_COLORS.first,
      second: RANK_COLORS.second,
      third: RANK_COLORS.third,
    },
    // Custom status colors
    status: {
      merged: STATUS_COLORS.merged,
      open: STATUS_COLORS.open,
      closed: STATUS_COLORS.closed,
      neutral: STATUS_COLORS.neutral,
      success: STATUS_COLORS.success,
      warning: STATUS_COLORS.warning,
      warningOrange: STATUS_COLORS.warningOrange,
      error: STATUS_COLORS.error,
      info: STATUS_COLORS.info,
      award: STATUS_COLORS.award,
    },
    // Credibility scale colors
    credibility: {
      excellent: CREDIBILITY_COLORS.excellent,
      good: CREDIBILITY_COLORS.good,
      moderate: CREDIBILITY_COLORS.moderate,
      low: CREDIBILITY_COLORS.low,
      poor: CREDIBILITY_COLORS.poor,
    },
    // Open PR risk colors
    risk: {
      exceeded: RISK_COLORS.exceeded,
      critical: RISK_COLORS.critical,
      approaching: RISK_COLORS.approaching,
    },
    // Diff colors for additions/deletions
    diff: {
      additions: DIFF_COLORS.additions,
      deletions: DIFF_COLORS.deletions,
    },
    // Border colors
    border: {
      subtle: alpha(UI_COLORS.white, 0.08),
      light: alpha(UI_COLORS.white, 0.1),
      medium: alpha(UI_COLORS.white, 0.2),
    },
    // Surface colors
    surface: {
      transparent: 'transparent',
      subtle: alpha(UI_COLORS.white, 0.02),
      light: alpha(UI_COLORS.white, 0.05),
      elevated: UI_COLORS.surfaceElevated,
      tooltip: UI_COLORS.surfaceTooltip,
    },
  },
  typography: {
    // JetBrains Mono is the app-wide default — every component inherits it
    // without needing an explicit fontFamily prop.
    fontFamily: '"JetBrains Mono", monospace',
    dataValue: {
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
    dataLabel: {
      fontSize: '0.75rem',
      fontWeight: 400,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    // Base monospace weight
    mono: {
      fontWeight: 500,
    },
    // Small uppercase label style
    monoSmall: {
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    },
    // Section titles
    sectionTitle: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#fff',
    },
    // Table headers
    tableHeader: {
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      color: 'rgba(255, 255, 255, 0.3)',
    },
    // Large stat values
    statValue: {
      fontSize: '1.1rem',
      fontWeight: 600,
      color: '#fff',
    },
    // Stat labels
    statLabel: {
      fontSize: '0.7rem',
      fontWeight: 500,
      textTransform: 'uppercase',
      color: 'rgba(255, 255, 255, 0.4)',
    },
    // Tooltip heading — multiplier name + value
    tooltipLabel: {
      fontSize: '0.72rem',
      fontWeight: 600,
    },
    // Tooltip supporting description
    tooltipDesc: {
      fontSize: '0.72rem',
      fontWeight: 400,
      opacity: 0.7,
      marginTop: '2px',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"JetBrains Mono", monospace',
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgb(190, 52, 85)',
        },
      },
    },
    MuiButton: {
      variants: [
        {
          props: { variant: 'back' },
          style: {
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.8rem',
            fontWeight: 500,
            letterSpacing: '0.5px',
            textTransform: 'none',
            backgroundColor: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '8px 16px',
            transition: 'all 0.2s',
            '&:hover': {
              color: '#ffffff',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
        },
      ],
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'transparent',
        },
      },
    },
    MuiChip: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          fontWeight: 600,
          borderRadius: '6px',
          height: '24px',
          '& .MuiChip-label': {
            px: 1.5,
          },
          '& .MuiChip-icon': {
            fontSize: 14,
          },
        },
        sizeSmall: {
          height: '22px',
          fontSize: '0.7rem',
          '& .MuiChip-label': {
            px: 1,
          },
          '& .MuiChip-icon': {
            fontSize: 14,
          },
        },
      },
      variants: [
        // Status variant - for merged/open/closed states
        {
          props: { variant: 'status' },
          style: {
            backgroundColor: 'transparent',
            border: '1px solid',
            borderRadius: '6px',
          },
        },
        // Info variant - for neutral information chips
        {
          props: { variant: 'info' },
          style: ({ theme: t }) => ({
            backgroundColor: t.palette.surface.light,
            border: `1px solid ${t.palette.border.light}`,
            color: t.palette.text.primary,
            borderRadius: '6px',
            '& .MuiChip-icon': {
              color: t.palette.text.secondary,
            },
          }),
        },
        // Filter variant - for deletable filter chips
        {
          props: { variant: 'filter' },
          style: ({ theme: t }) => ({
            backgroundColor: t.palette.border.light,
            color: t.palette.text.primary,
            borderRadius: '6px',
            '& .MuiChip-deleteIcon': {
              color: t.palette.text.secondary,
              '&:hover': {
                color: t.palette.text.primary,
              },
            },
          }),
        },
      ],
    },
  },
});

export default theme;

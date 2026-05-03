import {
  createTheme,
  alpha,
  type Theme,
  type SxProps,
} from '@mui/material/styles';

export type ThemeMode = 'dark' | 'light';

// Shared Color Constants (exported for use outside MUI components)
export const UI_COLORS = {
  white: '#ffffff',
  black: '#000000',
  primary: '#1d37fc',
  textSecondary: '#7d7d7d',
  textTertiary: 'rgba(201, 209, 217, 0.64)',
  surfaceElevated: '#161b22',
  surfaceTooltip: 'rgba(30, 30, 30, 0.95)',
  // Light-mode counterparts. Tuned for GitHub-style light surfaces so the
  // existing brand colors (status greens/reds, info blue) read well on white.
  lightBg: '#ffffff', // GitHub canvas.default (page + cards)
  lightPaper: '#f6f8fa', // GitHub canvas.subtle (sidebar, secondary surfaces)
  lightTextPrimary: '#1F2328', // GitHub fg.default
  lightTextSecondary: '#636c76', // GitHub fg.muted
  lightTextTertiary: '#6e7781', // GitHub fg.subtle
  lightSurfaceElevated: '#f6f8fa', // GitHub canvas.subtle
  // Dark tooltip on light backgrounds (GitHub-style: #24292f with opacity).
  // Dark text via text.primary (= #0d1117) reads fine on this dark surface, so
  // we set a contrasting light text in tooltipSlotProps via a separate token.
  lightSurfaceTooltip: 'rgba(36, 41, 47, 0.95)',
  // GitHub semantic fg colors used for success/danger text on light backgrounds.
  lightSuccess: '#1a7f37', // GitHub success.fg
  lightDanger: '#cf222e', // GitHub danger.fg
  // Scrollbar thumb colors for light mode (GitHub border.default / border.muted).
  lightScrollThumb: '#d0d7de',
  lightScrollThumbHover: '#afb8c1',
  // Brand colors for third-party ecosystem logos.
  bitcoinOrange: '#F7931A',
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

// GitHub-style colors for issue/PR labels. Theme-only so chips don't hardcode
// hex values at call sites.
export const LABEL_COLORS = {
  bug: '#ff7b72', // Red - matches STATUS_COLORS.closed
  enhancement: 'rgb(163, 238, 239)', // Light cyan - GitHub default
  feature: '#3fb950', // Green - matches STATUS_COLORS.merged
  documentation: '#58a6ff', // Blue - matches STATUS_COLORS.info
  question: '#f59e0b', // Amber - matches STATUS_COLORS.warning
} as const;

// Source badge colors for the watchlist PR feed (starred / miner / repo).
export const WATCHLIST_COLORS = {
  starred: '#facc15', // Yellow - starred PRs
  miner: '#60a5fa', // Sky blue - miner-sourced PRs
  repo: '#a78bfa', // Purple - repo-sourced PRs
} as const;

// Chart colors - different from status colors for better visual distinction in pie/donut charts
export const CHART_COLORS = {
  merged: '#3fb950', // Green - successful merges
  open: '#8b949e', // Grey - pending/open
  closed: '#ef4444', // Red - closed without merge
  // Distinct per-series palette for overlaid/multi-series charts
  // (e.g. watchlist comparison radar). Indices map to series order.
  series: [
    STATUS_COLORS.merged, // Green
    STATUS_COLORS.info, // Blue
    STATUS_COLORS.warning, // Amber
    WATCHLIST_COLORS.repo, // Purple
  ],
} as const;

// Insight card colors (warning / achievement / tip notification styles).
// Used by MinerInsightsCard — keyed by InsightType.
export const INSIGHT_COLORS = {
  warning: {
    darkColor: '#f0883e',
    darkAccent: '#d29922',
    darkBg: alpha('#f0883e', 0.1),
    darkBorder: alpha('#d29922', 0.35),
    lightColor: '#7d4e00',
    lightAccent: '#bf8700',
    lightBg: '#fff8c5',
    lightBorder: '#d4a72c',
  },
  achievement: {
    darkColor: '#56d364',
    darkAccent: '#56d364',
    darkBg: alpha('#56d364', 0.1),
    darkBorder: alpha('#56d364', 0.3),
    lightColor: UI_COLORS.lightSuccess,
    lightAccent: '#4ac26b',
    lightBg: '#dafbe1',
    lightBorder: '#4ac26b',
  },
  tip: {
    darkColor: STATUS_COLORS.info,
    darkAccent: STATUS_COLORS.info,
    darkBg: alpha(STATUS_COLORS.info, 0.1),
    darkBorder: alpha(STATUS_COLORS.info, 0.3),
    lightColor: '#0550ae',
    lightAccent: '#0969da',
    lightBg: '#ddf4ff',
    lightBorder: '#54aeff',
  },
} as const;

// Scrollbar thumb colors are driven by CSS variables that ThemeModeProvider
// updates whenever the active mode changes — keeps every existing consumer
// (`...scrollbarSx`) working without rewriting them as theme callbacks.
export const scrollbarSx = {
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'var(--gt-scroll-thumb, rgba(255, 255, 255, 0.1))',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: 'var(--gt-scroll-thumb-hover, rgba(255, 255, 255, 0.2))',
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

/** Light-mode contribution calendar levels — matches GitHub's light theme. */
export const CONTRIBUTION_HEATMAP_SCALE_LIGHT = [
  '#ebedf0',
  '#9be9a8',
  '#40c463',
  '#30a14e',
  '#216e39',
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
  backgroundColor: 'surface.elevated',
  color: 'text.secondary',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: '1px solid',
  borderColor: 'border.light',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  py: 1.5,
};

export const bodyCellStyle = {
  color: 'text.primary',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid',
  borderColor: 'border.light',
  fontSize: '0.85rem',
  py: 1.5,
};

export const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: 'surface.tooltip',
      // Both modes use a dark tooltip surface, so text must always be white.
      color: 'common.white',
      fontSize: '0.72rem',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: 'border.light',
      maxWidth: 220,
      width: 'max-content',
      minWidth: 0,
      lineHeight: 1.45,
      whiteSpace: 'pre-line',
      wordBreak: 'normal',
      overflowWrap: 'break-word',
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
      /** Tab / toggle-pill wrapper background. */
      control: string;
      /** Primary-tinted subtle bg — used for active nav items. */
      accent: string;
    };
    /** GitHub Primer "subtle" tint backgrounds for status badges. */
    highlight: {
      merged: string;
      success: string;
      error: string;
      warning: string;
      info: string;
      neutral: string;
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
      control: string;
      accent: string;
    };
    highlight?: {
      merged: string;
      success: string;
      error: string;
      warning: string;
      info: string;
      neutral: string;
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

export const createAppTheme = (mode: ThemeMode) => {
  const isDark = mode === 'dark';
  const baseColor = isDark ? UI_COLORS.white : UI_COLORS.black;
  const inverseColor = isDark ? UI_COLORS.black : UI_COLORS.white;
  // Two-tone surface: canvas (page) sits behind floating paper (cards) so
  // light mode gets proper visual hierarchy (GitHub-style: #f6f8fa canvas,
  // #ffffff cards). Dark mode keeps the original near-black canvas with a
  // very slightly lifted paper so cards retain their elevation.
  const backgroundDefault = isDark ? UI_COLORS.black : UI_COLORS.lightBg;
  const backgroundPaper = isDark ? '#0a0f1f' : UI_COLORS.lightBg;
  const textPrimary = isDark ? UI_COLORS.white : UI_COLORS.lightTextPrimary;
  const textSecondary = isDark
    ? UI_COLORS.textSecondary
    : UI_COLORS.lightTextSecondary;
  const textTertiary = isDark
    ? UI_COLORS.textTertiary
    : UI_COLORS.lightTextTertiary;
  const surfaceElevated = isDark
    ? UI_COLORS.surfaceElevated
    : UI_COLORS.lightSurfaceElevated;
  const surfaceTooltip = isDark
    ? UI_COLORS.surfaceTooltip
    : UI_COLORS.lightSurfaceTooltip;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? UI_COLORS.primary : '#0969da',
      },
      secondary: {
        main: isDark ? '#fff30d' : '#1f883d',
      },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
        tertiary: textTertiary,
      },
      divider: isDark ? alpha(UI_COLORS.white, 0.12) : '#d0d7de',
      rank: {
        first: RANK_COLORS.first,
        second: RANK_COLORS.second,
        third: RANK_COLORS.third,
      },
      status: {
        merged: isDark ? STATUS_COLORS.merged : '#8250df', // GitHub done.fg (purple)
        open: isDark ? alpha(baseColor, 0.6) : '#636c76', // GitHub fg.muted
        closed: isDark ? STATUS_COLORS.closed : '#cf222e', // GitHub danger.fg
        neutral: isDark ? STATUS_COLORS.neutral : '#6e7781', // GitHub fg.subtle
        success: isDark ? STATUS_COLORS.success : '#1f883d', // GitHub success.emphasis
        warning: isDark ? STATUS_COLORS.warning : '#9a6700', // GitHub attention.fg
        warningOrange: isDark ? STATUS_COLORS.warningOrange : '#bc4c00', // GitHub severe.fg
        error: isDark ? STATUS_COLORS.error : '#cf222e', // GitHub danger.fg
        info: isDark ? STATUS_COLORS.info : '#0969da', // GitHub accent.fg
        award: isDark ? STATUS_COLORS.award : '#9a6700', // GitHub attention.fg
      },
      credibility: {
        excellent: isDark ? CREDIBILITY_COLORS.excellent : '#1f883d', // GitHub success.emphasis
        good: isDark ? CREDIBILITY_COLORS.good : '#0969da', // GitHub accent.fg
        moderate: isDark ? CREDIBILITY_COLORS.moderate : '#9a6700', // GitHub attention.fg
        low: isDark ? CREDIBILITY_COLORS.low : '#bc4c00', // GitHub severe.fg
        poor: isDark ? CREDIBILITY_COLORS.poor : '#cf222e', // GitHub danger.fg
      },
      risk: {
        exceeded: RISK_COLORS.exceeded,
        critical: RISK_COLORS.critical,
        approaching: RISK_COLORS.approaching,
      },
      diff: {
        additions: isDark ? DIFF_COLORS.additions : '#1a7f37', // GitHub success.fg
        deletions: isDark ? DIFF_COLORS.deletions : '#cf222e', // GitHub danger.fg
      },
      border: {
        subtle: isDark ? alpha(baseColor, 0.08) : '#eaeef2', // GitHub border.subtle
        light: isDark ? alpha(baseColor, 0.1) : '#d0d7de', // GitHub border.default
        medium: isDark ? alpha(baseColor, 0.2) : '#d8dee4', // GitHub border.muted
      },
      // Surface colors. Built from baseColor so they invert in light mode.
      // `transparent` is the only token that changes semantics: in dark mode it
      // lets the canvas show through (glass effect). In light mode there is no
      // glass — every surface must be solid, so we fall back to backgroundPaper.
      surface: {
        transparent: isDark ? 'transparent' : backgroundPaper,
        subtle: isDark ? alpha(baseColor, 0.02) : '#f6f8fa', // GitHub canvas.subtle
        light: isDark ? alpha(baseColor, 0.05) : '#eaeef2', // GitHub border.subtle
        elevated: surfaceElevated, // #f6f8fa light
        tooltip: surfaceTooltip,
        control: isDark ? alpha(baseColor, 0.06) : UI_COLORS.lightPaper, // tab / toggle wrapper bg (#f6f8fa)
        accent: isDark ? alpha(baseColor, 0.1) : alpha('#0969da', 0.12), // primary active bg
      },
      // GitHub Primer "subtle" tint backgrounds for status badges.
      // Dark mode uses alpha() approximations; light mode uses exact Primer values.
      highlight: {
        merged: isDark ? alpha(STATUS_COLORS.merged, 0.12) : '#fbefff', // done.subtle
        success: isDark ? alpha(STATUS_COLORS.success, 0.12) : '#dafbe1', // success.subtle
        error: isDark ? alpha(STATUS_COLORS.error, 0.12) : '#ffebe9', // danger.subtle
        warning: isDark ? alpha(STATUS_COLORS.warning, 0.12) : '#fff8c5', // attention.subtle
        info: isDark ? alpha(STATUS_COLORS.info, 0.12) : '#ddf4ff', // accent.subtle
        neutral: isDark ? alpha(baseColor, 0.06) : 'rgba(175,184,193,0.2)', // GitHub neutral.subtle (inline code bg)
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
        color: textPrimary,
      },
      // Table headers
      tableHeader: {
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        color: isDark ? alpha(baseColor, 0.3) : '#6e7781', // GitHub fg.subtle
      },
      // Large stat values
      statValue: {
        fontSize: '1.1rem',
        fontWeight: 600,
        color: textPrimary,
      },
      // Stat labels
      statLabel: {
        fontSize: '0.7rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        color: isDark ? alpha(baseColor, 0.4) : '#6e7781', // GitHub fg.subtle
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
      MuiTooltip: {
        defaultProps: {
          enterTouchDelay: 0,
          leaveTouchDelay: 15000,
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
              color: alpha(textPrimary, 0.7),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.5px',
              textTransform: 'none',
              backgroundColor: backgroundDefault,
              border: `1px solid ${alpha(baseColor, 0.1)}`,
              borderRadius: '8px',
              padding: '8px 16px',
              transition: 'all 0.2s',
              '&:hover': {
                color: textPrimary,
                // Dark: lighten the button face. Light: add a soft gray tint
                // instead of alpha(white, 0.8) which is invisible on white.
                backgroundColor: isDark
                  ? alpha(inverseColor, 0.8)
                  : alpha(baseColor, 0.06),
                borderColor: alpha(baseColor, isDark ? 0.2 : 0.28),
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
            border: `1px solid ${isDark ? alpha(baseColor, 0.1) : '#d0d7de'}`,
            // Dark: transparent on the near-black canvas; border provides edge.
            // Light: white card on the #f0f4f8 canvas, with a soft shadow so the
            // card reads as a raised element without relying on colour alone.
            backgroundColor: isDark ? 'transparent' : backgroundPaper,
            boxShadow: isDark
              ? 'none'
              : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            // Light-mode track is slightly stronger so the unfilled portion reads.
            backgroundColor: alpha(baseColor, isDark ? 0.1 : 0.14),
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: alpha(baseColor, isDark ? 0.03 : 0.04),
            },
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
};

const theme = createAppTheme('dark');

export default theme;

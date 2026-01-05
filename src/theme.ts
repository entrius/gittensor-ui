import { createTheme } from "@mui/material/styles";

// ============================================================================
// Shared Color Constants (exported for use outside MUI components)
// ============================================================================
export const TIER_COLORS = {
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
} as const;

export const STATUS_COLORS = {
  merged: "#4ade80",
  open: "#52525b",
  closed: "#ef4444",
  success: "#10b981",
  warning: "#fbbf24",
  error: "#ef4444",
  info: "#60a5fa",
  purple: "#a78bfa",
} as const;

export const TEXT_OPACITY = {
  primary: 1,
  secondary: 0.7,
  tertiary: 0.5,
  muted: 0.4,
  faint: 0.3,
  ghost: 0.2,
} as const;

// ============================================================================
// Module Augmentation for Custom Theme Properties
// ============================================================================
declare module "@mui/material/styles" {
  interface TypographyVariants {
    dataValue: React.CSSProperties;
    dataLabel: React.CSSProperties;
    mono: React.CSSProperties;
    monoSmall: React.CSSProperties;
    sectionTitle: React.CSSProperties;
    tableHeader: React.CSSProperties;
    statValue: React.CSSProperties;
    statLabel: React.CSSProperties;
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
  }

  interface Palette {
    tier: {
      gold: string;
      silver: string;
      bronze: string;
    };
    status: {
      merged: string;
      open: string;
      closed: string;
      success: string;
      warning: string;
      info: string;
      purple: string;
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
    };
  }

  interface PaletteOptions {
    tier?: {
      gold: string;
      silver: string;
      bronze: string;
    };
    status?: {
      merged: string;
      open: string;
      closed: string;
      success: string;
      warning: string;
      info: string;
      purple: string;
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
    };
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    dataValue: true;
    dataLabel: true;
    mono: true;
    monoSmall: true;
    sectionTitle: true;
    tableHeader: true;
    statValue: true;
    statLabel: true;
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    back: true;
  }
}

declare module "@mui/material/Card" {
  interface CardPropsVariantOverrides {
    glass: true;
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsVariantOverrides {
    tier: true;
    status: true;
    info: true;
    filter: true;
  }
}

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1d37fc",
    },
    secondary: {
      main: "#fff30d",
    },
    background: {
      default: "#000000",
      paper: "#0a0f1f",
    },
    text: {
      primary: "#ffffff",
      secondary: "#7d7d7d",
    },
    divider: "#ffffff",
    // Custom tier colors
    tier: {
      gold: TIER_COLORS.gold,
      silver: TIER_COLORS.silver,
      bronze: TIER_COLORS.bronze,
    },
    // Custom status colors
    status: {
      merged: STATUS_COLORS.merged,
      open: STATUS_COLORS.open,
      closed: STATUS_COLORS.closed,
      success: STATUS_COLORS.success,
      warning: STATUS_COLORS.warning,
      info: STATUS_COLORS.info,
      purple: STATUS_COLORS.purple,
    },
    // Border colors
    border: {
      subtle: "rgba(255, 255, 255, 0.05)",
      light: "rgba(255, 255, 255, 0.1)",
      medium: "rgba(255, 255, 255, 0.2)",
    },
    // Surface colors
    surface: {
      transparent: "transparent",
      subtle: "rgba(255, 255, 255, 0.02)",
      light: "rgba(255, 255, 255, 0.05)",
    },
  },
  typography: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h2: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h3: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h4: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h5: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h6: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    body1: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    },
    body2: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    },
    button: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    },
    dataValue: {
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontWeight: 500,
      letterSpacing: "0.02em",
    },
    dataLabel: {
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontSize: "0.75rem",
      fontWeight: 400,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    },
    // Base monospace style
    mono: {
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 500,
    },
    // Small monospace for labels
    monoSmall: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "0.7rem",
      fontWeight: 600,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
    },
    // Section titles
    sectionTitle: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "1rem",
      fontWeight: 600,
      color: "#fff",
    },
    // Table headers
    tableHeader: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "0.7rem",
      fontWeight: 600,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      color: "rgba(255, 255, 255, 0.3)",
    },
    // Large stat values
    statValue: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "1.1rem",
      fontWeight: 600,
      color: "#fff",
    },
    // Stat labels
    statLabel: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "0.7rem",
      fontWeight: 500,
      textTransform: "uppercase",
      color: "rgba(255, 255, 255, 0.4)",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
          backgroundColor: "rgb(190, 52, 85)",
        },
      },
    },
    MuiButton: {
      variants: [
        {
          props: { variant: "back" },
          style: {
            color: "rgba(255, 255, 255, 0.7)",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.8rem",
            fontWeight: 500,
            letterSpacing: "0.5px",
            textTransform: "none",
            backgroundColor: "#000000",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            padding: "8px 16px",
            transition: "all 0.2s",
            "&:hover": {
              color: "#ffffff",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              borderColor: "rgba(255, 255, 255, 0.2)",
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
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "transparent",
        },
      },
    },
    MuiChip: {
      defaultProps: {
        size: "small",
      },
      styleOverrides: {
        root: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "0.75rem",
          fontWeight: 600,
          borderRadius: "16px",
          height: "24px",
          "& .MuiChip-label": {
            px: 1.5,
          },
          "& .MuiChip-icon": {
            fontSize: 14,
          },
        },
        sizeSmall: {
          height: "22px",
          fontSize: "0.7rem",
          "& .MuiChip-label": {
            px: 1,
          },
          "& .MuiChip-icon": {
            fontSize: 14,
          },
        },
      },
      variants: [
        // Tier variant - for Gold/Silver/Bronze badges
        {
          props: { variant: "tier" },
          style: {
            backgroundColor: "transparent",
            border: "1px solid",
            borderRadius: "16px",
          },
        },
        // Status variant - for merged/open/closed states
        {
          props: { variant: "status" },
          style: {
            backgroundColor: "transparent",
            border: "1px solid",
            borderRadius: "16px",
          },
        },
        // Info variant - for neutral information chips
        {
          props: { variant: "info" },
          style: {
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "rgba(255, 255, 255, 0.9)",
            borderRadius: "16px",
            "& .MuiChip-icon": {
              color: "rgba(255, 255, 255, 0.7)",
            },
          },
        },
        // Filter variant - for deletable filter chips
        {
          props: { variant: "filter" },
          style: {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            borderRadius: "16px",
            "& .MuiChip-deleteIcon": {
              color: "rgba(255, 255, 255, 0.7)",
              "&:hover": {
                color: "#ffffff",
              },
            },
          },
        },
      ],
    },
  },
});

export default theme;

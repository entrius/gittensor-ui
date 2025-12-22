import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypographyVariants {
    dataValue: React.CSSProperties;
    dataLabel: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    dataValue?: React.CSSProperties;
    dataLabel?: React.CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    dataValue: true;
    dataLabel: true;
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    back: true;
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
  },
});

export default theme;

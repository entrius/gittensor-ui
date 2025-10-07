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

const theme = createTheme({
  palette: {
    primary: {
      main: "#4B3621",
    },
    secondary: {
      main: "#f2e3c6",
    },
    background: {
      default: "#f9f9f9",
      paper: "#ffffff",
    },
    text: {
      primary: "#1a1a1a",
      secondary: "#666666",
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
    },
    h2: {
      fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
    },
    h3: {
      fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
    },
    h4: {
      fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
    },
    h5: {
      fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
    },
    h6: {
      fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
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
      letterSpacing: '0.02em',
    },
    dataLabel: {
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontSize: '0.75rem',
      fontWeight: 400,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
  },
});

export default theme;

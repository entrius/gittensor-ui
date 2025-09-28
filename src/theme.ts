import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#4B3621", // light indigo
    },
    secondary: {
      main: "#f2e3c6", // muted gold/tan
    },
    background: {
      default: "#f9f9f9", // ivory
      paper: "#ffffff",
    },
    text: {
      primary: "#1a1a1a",
      secondary: "#666666",
    },
  },
  typography: {
    fontFamily: "Nunito Sans",
  },
  components: {
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

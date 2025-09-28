import { Box, CircularProgress } from "@mui/material";

const LoadingPage: React.FC = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    }}
  >
    <CircularProgress sx={{ m: 5, color: "primary.main" }} />
  </Box>
);
export default LoadingPage;

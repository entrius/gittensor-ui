import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { Page } from "../components";

const UnderConstructionPage: React.FC = () => (
  <Page title="Under Construction">
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <Stack gap={2} justifyContent="center" alignItems="center">
        <Typography lineHeight={2}>
          This page has not been implemented yet.. I'll get to it at some point
        </Typography>
        <CircularProgress sx={{ m: 5, color: "primary.main" }} />
      </Stack>
    </Box>
  </Page>
);
export default UnderConstructionPage;

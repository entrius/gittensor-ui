import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Page } from "../components/layout";

const HomePage: React.FC = () => {
  return (
    <Page title="Home">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: { xs: "calc(100vh - 64px)", md: "100vh" },
          width: "100%",
          px: { xs: 2, sm: 3 },
        }}
      >
        <Stack
          alignItems="center"
          justifyContent="center"
          gap={{ xs: 2, sm: 3 }}
        >
          <img
            src="/gt-logo.svg"
            alt="Gittensor"
            style={{ 
              height: window.innerWidth < 600 ? "96px" : "128px", 
              width: "auto", 
              filter: "grayscale(100%) invert(1) drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))" 
            }}
          />
          <Typography
            variant="h1"
            color="#ffffff"
            fontWeight="bold"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
              textAlign: "center",
            }}
          >
            GITTENSOR
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            fontWeight="bold"
            sx={{
              fontSize: { xs: "0.9rem", sm: "1rem" },
              textAlign: "center",
            }}
          >
            The workforce for open source.
          </Typography>
        </Stack>
      </Box>
    </Page>
  );
};

export default HomePage;

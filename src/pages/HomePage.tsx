import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Page } from "../components/layout";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Page title="Home">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          width: "100%",
          px: 2,
        }}
      >
        <Stack
          alignItems="center"
          justifyContent="center"
          gap={2}
          sx={{ mb: 6 }}
        >
          <img
            src="/gt-logo.svg"
            alt="Gittensor"
            style={{ height: "128px", width: "auto" }}
          />
          <Typography
            variant="h1"
            color="#ffffff"
            fontWeight="bold"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4rem" },
            }}
          >
            GITTENSOR
          </Typography>
          <Typography variant="body1" color="text.secondary" fontWeight="bold">
            The workforce for open source.
          </Typography>
        </Stack>

        {/* Navigation */}
        <Stack
          direction="column"
          gap={2}
          sx={{
            width: "100%",
            maxWidth: "400px",
          }}
        >
          <Button
            variant="outlined"
            onClick={() => navigate("/dashboard")}
            sx={{
              py: 2,
              borderColor: "#ffffff",
              color: "#ffffff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "1rem",
              textTransform: "lowercase",
              borderRadius: 0,
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "transparent",
                color: "primary.main",
              },
            }}
          >
            dashboard{" "}
            <Typography
              component="span"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.7rem",
                color: "secondary.main",
                fontStyle: "italic",
                ml: 1,
              }}
            >
              new
            </Typography>
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate("/repositories")}
            sx={{
              py: 2,
              borderColor: "#ffffff",
              color: "#ffffff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "1rem",
              textTransform: "lowercase",
              borderRadius: 0,
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "transparent",
                color: "primary.main",
              },
            }}
          >
            repositories
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate("/about")}
            sx={{
              py: 2,
              borderColor: "#ffffff",
              color: "#ffffff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "1rem",
              textTransform: "lowercase",
              borderRadius: 0,
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "transparent",
                color: "primary.main",
              },
            }}
          >
            about
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate("/faq")}
            sx={{
              py: 2,
              borderColor: "#ffffff",
              color: "#ffffff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "1rem",
              textTransform: "lowercase",
              borderRadius: 0,
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "transparent",
                color: "primary.main",
              },
            }}
          >
            faq
          </Button>
        </Stack>
      </Box>
    </Page>
  );
};

export default HomePage;

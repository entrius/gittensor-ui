import React from "react";
import { Box, Typography, Stack, Paper, Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export const GettingStarted: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, md: 0 } }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 5,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
        }}
      >
        <Typography
          variant="overline"
          sx={{
            display: "block",
            mb: 4,
            fontWeight: 700,
            textAlign: "center",
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          MINER ONBOARDING PROCESS
        </Typography>

        <Box sx={{ position: "relative", px: { md: 4 } }}>
          {/* Connecting Line (Desktop) */}
          <Box
            sx={{
              position: "absolute",
              top: 24,
              left: 50,
              right: 50,
              height: 2,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)",
              display: { xs: "none", md: "block" },
              zIndex: 0,
            }}
          />

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 4, md: 0 }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "flex-start" }} // Align top to handle variable text height
            sx={{ position: "relative", zIndex: 1 }}
          >
            {[
              { step: 1, title: "Get Keys", subtitle: "Coldkey & Hotkey" },
              { step: 2, title: "Register", subtitle: "To Subnet" },
              { step: 3, title: "Authorize", subtitle: "Create GitHub PAT" },
              { step: 4, title: "Deploy", subtitle: "Setup Miner" },
              {
                step: 5,
                title: "Earn",
                subtitle: "Tag Code & Get Paid",
                active: true,
              },
            ].map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  flexDirection: { xs: "row", md: "column" },
                  alignItems: "center",
                  gap: 2,
                  width: { xs: "100%", md: "auto" },
                }}
              >
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    bgcolor: "#000",
                    border: "2px solid",
                    borderColor: item.active
                      ? "secondary.main"
                      : "rgba(255,255,255,0.15)",
                    color: item.active ? "secondary.main" : "text.secondary",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "1.25rem",
                    boxShadow: item.active
                      ? "0 0 20px rgba(255, 215, 0, 0.2)"
                      : "none",
                    transition: "all 0.3s ease",
                    flexShrink: 0,
                  }}
                >
                  {item.step}
                </Box>
                <Box sx={{ textAlign: { xs: "left", md: "center" } }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: "bold",
                      color: item.active ? "secondary.main" : "text.primary",
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      lineHeight: 1.2,
                      display: "block",
                      maxWidth: { md: 100 },
                    }}
                  >
                    {item.subtitle}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          For detailed setup instructions, visit our documentation.
        </Typography>
        <Button
          variant="contained"
          size="large"
          href="https://docs.gittensor.io/miner.html"
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            px: 4,
            py: 1.5,
          }}
        >
          View Miner Documentation
        </Button>
      </Box>
    </Box>
  );
};

import React from "react";
import { Box, Typography, Paper, Button, Grid } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export const Scoring: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: { xs: 2, md: 0 } }}>
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
          TL;DR: HOW TO MAXIMIZE REWARDS
        </Typography>

        <Grid container spacing={3}>
          {[
            {
              title: "Merge PRs",
              desc: "Focus on merging code changes to high weighted repositories. Your score's main factor is determined by the weight of the repository.",
            },
            {
              title: "Solve Issues",
              desc: "Link your PR to the issue it resolves (e.g. 'Closes #123'). Resolving older issues applies a higher bonus multiplier.",
            },
            {
              title: "Tag Code",
              desc: "Include the mandatory Gittensor tagline in your PR description. Without this tag, your work will not be rewarded.",
            },
            {
              title: "Credibility",
              desc: "Keep your merge rate high. A strong ratio of merged vs. closed PRs increases your credibility and unlocks tier multipliers.",
            },
          ].map((item, index) => (
            <Grid item xs={12} md={3} key={index}>
              <Box
                sx={{
                  height: "100%",
                  position: "relative",
                  p: 3,
                  borderRadius: 4,
                  bgcolor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ position: "relative", zIndex: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", color: "#fff", mb: 1 }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      lineHeight: 1.5,
                      display: "block",
                    }}
                  >
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          For the complete scoring algorithm and detailed documentation, visit
          our docs.
        </Typography>
        <Button
          variant="contained"
          size="large"
          href="https://docs.gittensor.io/scoring.html"
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
          View Scoring Documentation
        </Button>
      </Box>
    </Box>
  );
};

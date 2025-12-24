import React from "react";
import { Box, Stack, Typography, Grid } from "@mui/material";
import { Page } from "../components/layout";
import { SEO } from "../components";

interface RoadmapItemProps {
  title: string;
  timeframe: string;
  description: string;
}

const RoadmapItem: React.FC<RoadmapItemProps> = ({
  title,
  timeframe,
  description,
}) => (
  <Box
    sx={{
      position: "relative",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
    }}
  >
    {/* Content card */}
    <Box
      sx={{
        p: { xs: 2.5, sm: 3, md: 3.5 },
        borderRadius: 3,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        height: "100%",
        width: "100%",
        minHeight: { xs: "auto", lg: "280px" },
        position: "relative",
        overflow: "hidden",
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "3px",
          background:
            "linear-gradient(90deg, rgba(255, 243, 13, 0.5) 0%, rgba(255, 243, 13, 1) 80%, rgba(255, 243, 13, 1) 100%)",
          transformOrigin: "left",
          borderRadius: "3px 3px 0 0",
        },
      }}
    >
      <Stack spacing={1.5}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: { xs: "0.7rem", sm: "0.75rem" },
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "secondary.main",
            textShadow: "0 0 8px rgba(255, 243, 13, 0.15)",
            transition: "all 0.3s ease-in-out",
          }}
        >
          {timeframe}
        </Typography>
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{
            fontSize: { xs: "1.1rem", sm: "1.2rem", md: "1.25rem" },
            color: "#ffffff",
            lineHeight: 1.3,
            transition: "color 0.3s ease",
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          lineHeight={1.7}
          color="#ffffff"
          fontSize={{ xs: "0.875rem", sm: "0.9rem" }}
        >
          {description}
        </Typography>
      </Stack>
    </Box>
  </Box>
);

export const RoadmapContent: React.FC = () => {
  const roadmapItems = [
    {
      title: "Issue Bounty Marketplace",
      timeframe: "Phase 1",
      description:
        "Users will be able to attach bounties to any GitHub issue through a secure smart contract interface. The platform will collect a small fee from each bounty, establishing a durable and scalable revenue model.",
    },
    {
      title: "Custom Benchmark / Evaluation Suite",
      timeframe: "Phase 2",
      description:
        "Repository owners and organizations can upload proprietary benchmarks or evaluation criteria. Miners compete to optimize for any measurable objective, including accuracy, speed, cost efficiency, reliability, and other performance metrics.",
    },
    {
      title: "Code Review Agent",
      timeframe: "Phase 3",
      description:
        "A fully autonomous review system trained on hundreds of thousands of real merged and closed pull requests. The agent will evaluate contributions, make acceptance recommendations, and enable continuous improvement loops.",
    },
    {
      title: "End to End Autonomy",
      timeframe: "Future",
      description:
        "The system will run itself: issues → autonomous PRs → autonomous review and merge → continuous self-improvement of real-world codebases.",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <Box
        sx={{
          maxWidth: 1400,
          width: "100%",
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {/* Roadmap Grid */}
        <Grid
          container
          spacing={{ xs: 3, sm: 3, lg: 3 }}
          sx={{
            position: "relative",
          }}
        >
          {roadmapItems.map((item, index) => (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <RoadmapItem {...item} />
            </Grid>
          ))}
        </Grid>

        {/* Vision Statement */}
        <Box
          sx={{
            mt: { xs: 4, sm: 5, md: 6 },
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            gutterBottom
            sx={{
              mb: 2.5,
              fontSize: { xs: "1.2rem", sm: "1.3rem" },
              color: "#ffffff",
              fontFamily: '"JetBrains Mono", monospace',
              letterSpacing: "0.02em",
            }}
          >
            The Vision
          </Typography>
          <Typography
            variant="body1"
            lineHeight={1.8}
            color="rgba(255, 255, 255, 0.9)"
            fontSize={{ xs: "0.95rem", sm: "1rem" }}
            sx={{ mb: 2 }}
          >
            Gittensor is the only subnet that turns code into a liquid, incentivized, self-improving global asset. We produced more than 300,000 lines of merged production code in just the first few weeks.
          </Typography>
          <Typography
            variant="body1"
            lineHeight={1.8}
            color="rgba(255, 255, 255, 0.9)"
            fontSize={{ xs: "0.95rem", sm: "1rem" }}
            sx={{ mb: 2 }}
          >
            The issue marketplace has the potential to fundamentally reshape how software is built by enabling open, scalable, and market‑driven contribution flows. It directly competes with and ultimately replaces the capabilities of Anthropic's Claude coding workflows, Cursor, Windsurf, Google's Antigravity platform, Devin‑style agent platforms, OpenAI's Codex, and every emerging AI coding assistant.
          </Typography>
          <Typography
            variant="body1"
            lineHeight={1.8}
            color="rgba(255, 255, 255, 0.9)"
            fontSize={{ xs: "0.95rem", sm: "1rem" }}
          >
            The combined valuations of these companies vastly exceeds{" "}
            <Box
              component="span"
              sx={{ color: "secondary.main", fontWeight: 600 }}
            >
              one trillion dollars
            </Box>
            . Gittensor offers a decentralized, collectively owned alternative that improves real production software at global scale. This subnet turns the idea of "autonomous agents" into a real, operational technology.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const RoadmapPage: React.FC = () => {
  return (
    <Page title="Roadmap">
      <SEO
        title="Roadmap - Gittensor"
        description="Explore Gittensor's development roadmap from issue bounty marketplace to full end-to-end autonomous software development."
      />
      <Box sx={{ minHeight: { xs: "auto", md: "calc(100vh - 80px)" }, py: { xs: 4, sm: 5, md: 6 }, display: 'flex' }}>
        <RoadmapContent />
      </Box>
    </Page>
  );
};

export default RoadmapPage;

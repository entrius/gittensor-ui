import React from "react";
import { Box, Stack, Typography, Grid, useTheme, useMediaQuery } from "@mui/material";
import {
  CurrencyExchange,
  Speed,
  SmartToy,
  AutoAwesome,
  Circle,
} from "@mui/icons-material";

interface RoadmapItemProps {
  title: string;
  timeframe: string;
  description: string;
  icon: React.ReactNode;
  isLast?: boolean;
  index: number;
}

const RoadmapItem: React.FC<RoadmapItemProps> = ({
  title,
  timeframe,
  description,
  icon,
  isLast,
  index,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isEven = index % 2 === 0;

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: isMobile ? "column" : isEven ? "row" : "row-reverse",
        alignItems: "center",
        width: "100%",
        mb: isLast ? 0 : { xs: 6, md: 0 },
      }}
    >
      {/* Date/Timeframe - Desktop Only */}
      {!isMobile && (
        <Box
          sx={{
            width: "50%",
            textAlign: isEven ? "right" : "left",
            pr: isEven ? 6 : 0,
            pl: isEven ? 0 : 6,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              color: "secondary.main",
              fontWeight: "bold",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textShadow: "0 0 10px rgba(255, 215, 0, 0.3)",
            }}
          >
            {timeframe}
          </Typography>
        </Box>
      )}

      {/* Central Line & Dot */}
      <Box
        sx={{
          position: "absolute",
          left: isMobile ? "24px" : "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
            border: "2px solid",
            borderColor: "secondary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "secondary.main",
            boxShadow: "0 0 15px rgba(255, 215, 0, 0.2)",
            position: "relative",
            zIndex: 2,
          }}
        >
          {icon}
        </Box>
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flexGrow: 1,
              background:
                "linear-gradient(180deg, rgba(255, 215, 0, 0.5) 0%, rgba(255, 215, 0, 0.1) 100%)",
              my: 1,
            }}
          />
        )}
      </Box>

      {/* Content Card */}
      <Box
        sx={{
          width: isMobile ? "calc(100% - 60px)" : "50%",
          ml: isMobile ? "60px" : 0,
          pl: isMobile ? 0 : isEven ? 6 : 0,
          pr: isMobile ? 0 : isEven ? 0 : 6,
          textAlign: isMobile ? "left" : isEven ? "left" : "right",
        }}
      >
        <Box
          sx={{
            p: 3,
            borderRadius: 4,
            background:
              "linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease",
            "&:hover": {
              borderColor: "secondary.main",
              transform: "translateY(-4px)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            },
          }}
        >
          {isMobile && (
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                color: "secondary.main",
                fontWeight: "bold",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                display: "block",
                mb: 1,
              }}
            >
              {timeframe}
            </Typography>
          )}
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 1.5, color: "#fff" }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" lineHeight={1.6}>
            {description}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export const RoadmapContent: React.FC = () => {
  const roadmapItems = [
    {
      title: "Issue Bounty Marketplace",
      timeframe: "Phase 1",
      icon: <CurrencyExchange />,
      description:
        "Users will be able to attach bounties to any GitHub issue through a secure smart contract interface. The platform will collect a small fee from each bounty, establishing a durable and scalable revenue model.",
    },
    {
      title: "Custom Benchmark Suite",
      timeframe: "Phase 2",
      icon: <Speed />,
      description:
        "Repository owners and organizations can upload proprietary benchmarks or evaluation criteria. Miners compete to optimize for any measurable objective, including accuracy, speed, cost efficiency, and reliability.",
    },
    {
      title: "Code Review Agent",
      timeframe: "Phase 3",
      icon: <SmartToy />,
      description:
        "A fully autonomous review system trained on hundreds of thousands of real merged and closed pull requests. The agent will evaluate contributions, make acceptance recommendations, and enable continuous improvement loops.",
    },
    {
      title: "End to End Autonomy",
      timeframe: "Future",
      icon: <AutoAwesome />,
      description:
        "The system will run itself: issues → autonomous PRs → autonomous review and merge → continuous self-improvement of real-world codebases.",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        py: 4,
      }}
    >
      <Box sx={{ maxWidth: 1000, width: "100%", px: { xs: 2, md: 4 } }}>
        <Typography
          variant="h3"
          fontWeight="bold"
          align="center"
          sx={{ mb: 8, color: "#fff" }}
        >
          Project Roadmap
        </Typography>

        <Stack spacing={{ xs: 0, md: 0 }} sx={{ mb: 12 }}>
          {roadmapItems.map((item, index) => (
            <RoadmapItem
              key={index}
              {...item}
              index={index}
              isLast={index === roadmapItems.length - 1}
            />
          ))}
        </Stack>

        {/* Vision Section */}
        <Box
          sx={{
            p: { xs: 3, md: 6 },
            borderRadius: 6,
            background:
              "linear-gradient(180deg, rgba(20, 20, 20, 0.8) 0%, rgba(10, 10, 10, 0.95) 100%)",
            border: "1px solid rgba(255, 215, 0, 0.15)",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 40px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Decorative Elements */}
          <Box
            sx={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              background: "radial-gradient(circle, rgba(255, 215, 0, 0.05) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              mb: 4,
              color: "#fff",
              fontFamily: '"JetBrains Mono", monospace',
              textAlign: "center",
            }}
          >
            The Vision
          </Typography>

          <Stack spacing={3}>
            <Typography
              variant="h6"
              lineHeight={1.6}
              color="text.secondary"
              sx={{ textAlign: "center", maxWidth: 800, mx: "auto" }}
            >
              Gittensor is the only subnet that turns code into a liquid,
              incentivized, self-improving global asset. We produced more than{" "}
              <Box component="span" sx={{ color: "#fff", fontWeight: "bold" }}>
                300,000 lines of merged production code
              </Box>{" "}
              in just the first few weeks.
            </Typography>

            <Typography
              variant="body1"
              lineHeight={1.8}
              color="text.secondary"
              sx={{ textAlign: "center", maxWidth: 800, mx: "auto" }}
            >
              The issue marketplace has the potential to fundamentally reshape
              how software is built by enabling open, scalable, and
              market-driven contribution flows. It directly competes with and
              ultimately replaces the capabilities of Anthropic's Claude coding
              workflows, Cursor, Windsurf, Devin, OpenAI's Codex, Google's
              Antigravity, and every emerging AI coding assistant.
            </Typography>

            <Typography
              variant="body1"
              lineHeight={1.8}
              color="text.secondary"
              sx={{ textAlign: "center", maxWidth: 800, mx: "auto" }}
            >
              The combined valuations of these companies vastly exceeds{" "}
              <Box
                component="span"
                sx={{
                  color: "secondary.main",
                  fontWeight: 800,
                  textShadow: "0 0 10px rgba(255, 215, 0, 0.2)",
                }}
              >
                one trillion dollars
              </Box>
              . Gittensor offers a decentralized, collectively owned alternative
              that improves real production software at global scale. This
              subnet turns the idea of "autonomous agents" into a real,
              operational technology.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

import React from "react";
import { Box, Stack, Typography, keyframes, Grid } from "@mui/material";
import { Page } from "../components/layout";
import { SEO } from "../components";

// Enhanced Animations
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeInScale = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

const phaseGlow = keyframes`
  0%, 100% {
    color: rgba(255, 243, 13, 0.4);
    text-shadow: 0 0 8px rgba(255, 243, 13, 0.15);
  }
  10% {
    color: rgba(255, 243, 13, 0.65);
    text-shadow: 0 0 15px rgba(255, 243, 13, 0.35), 0 0 25px rgba(255, 243, 13, 0.2);
  }
  15% {
    color: rgba(255, 243, 13, 1);
    text-shadow: 0 0 25px rgba(255, 243, 13, 0.6), 0 0 40px rgba(255, 243, 13, 0.35), 0 0 60px rgba(255, 243, 13, 0.15);
  }
  20% {
    color: rgba(255, 243, 13, 0.65);
    text-shadow: 0 0 15px rgba(255, 243, 13, 0.35), 0 0 25px rgba(255, 243, 13, 0.2);
  }
  25% {
    color: rgba(255, 243, 13, 0.4);
    text-shadow: 0 0 8px rgba(255, 243, 13, 0.15);
  }
`;

const progressBar = keyframes`
  0% {
    transform: scaleX(0);
    background: linear-gradient(90deg, rgba(255, 243, 13, 0) 0%, rgba(255, 243, 13, 0) 100%);
  }
  10% {
    transform: scaleX(0.15);
    background: linear-gradient(90deg, rgba(255, 243, 13, 0.5) 0%, rgba(255, 243, 13, 0.8) 80%, rgba(255, 243, 13, 0.8) 100%);
  }
  15% {
    transform: scaleX(0.75);
    background: linear-gradient(90deg, rgba(255, 243, 13, 0.5) 0%, rgba(255, 243, 13, 1) 80%, rgba(255, 243, 13, 1) 100%);
  }
  20% {
    transform: scaleX(1);
    background: linear-gradient(90deg, rgba(255, 243, 13, 0.5) 0%, rgba(255, 243, 13, 1) 80%, rgba(255, 243, 13, 1) 100%);
  }
  100% {
    transform: scaleX(1);
    background: linear-gradient(90deg, rgba(255, 243, 13, 0.5) 0%, rgba(255, 243, 13, 1) 80%, rgba(255, 243, 13, 1) 100%);
  }
`;

interface RoadmapItemProps {
    title: string;
    timeframe: string;
    description: string;
    delay: number;
    phaseIndex: number;
}

const RoadmapItem: React.FC<RoadmapItemProps> = ({
    title,
    timeframe,
    description,
    delay,
    phaseIndex
}) => (
    <Box
        sx={{
            position: "relative",
            height: "100%",
            animation: `${fadeInScale} 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`,
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
                    background: "linear-gradient(90deg, rgba(255, 243, 13, 0) 0%, rgba(255, 243, 13, 0) 100%)",
                    transformOrigin: "left",
                    animation: `${progressBar} 16s linear forwards`,
                    animationDelay: `${phaseIndex * 4}s`,
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
                        color: "rgba(255, 243, 13, 0.4)",
                        textShadow: "0 0 8px rgba(255, 243, 13, 0.15)",
                        animation: `${phaseGlow} 16s ease-in-out infinite`,
                        animationDelay: `${phaseIndex * 4}s`,
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
                    color="rgba(255, 255, 255, 0.85)"
                    fontSize={{ xs: "0.875rem", sm: "0.9rem" }}
                >
                    {description}
                </Typography>
            </Stack>
        </Box>
    </Box>
);

const RoadmapPage: React.FC = () => {
    const roadmapItems = [
        {
            title: "Issue Bounty Marketplace",
            timeframe: "Phase 1",
            description: "Users will be able to attach bounties to any GitHub issue through a secure smart contract interface. The platform will collect a small fee from each bounty, establishing a durable and scalable revenue model.",
        },
        {
            title: "Custom Benchmark / Evaluation Suite",
            timeframe: "Phase 2",
            description: "Repository owners and organizations can upload proprietary benchmarks or evaluation criteria. Miners compete to optimize for any measurable objective, including accuracy, speed, cost efficiency, reliability, and other performance metrics.",
        },
        {
            title: "Code Review Agent",
            timeframe: "Phase 3",
            description: "A fully autonomous review system trained on hundreds of thousands of real merged and closed pull requests. The agent will evaluate contributions, make acceptance recommendations, and enable continuous improvement loops.",
        },
        {
            title: "End to End Autonomy",
            timeframe: "Future",
            description: "The system will run itself: issues → autonomous PRs → autonomous review and merge → continuous self-improvement of real-world codebases.",
        },
    ];

    return (
        <Page title="Roadmap">
            <SEO
                title="Roadmap - Gittensor"
                description="Explore Gittensor's development roadmap from issue bounty marketplace to full end-to-end autonomous software development."
            />
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: { xs: "auto", md: "calc(100vh - 80px)" },
                    width: "100%",
                    py: { xs: 4, sm: 5, md: 6 },
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
                            <Grid
                                item
                                xs={12}
                                sm={6}
                                lg={3}
                                key={index}
                            >
                                <RoadmapItem
                                    {...item}
                                    delay={0.1 + index * 0.15}
                                    phaseIndex={index}
                                />
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
                            animation: `${fadeInUp} 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s both`,
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
                            Gittensor is the only subnet that turns code into a liquid, incentivized, self-improving global asset. We have already produced more than <Box component="span" sx={{ color: "secondary.main", fontWeight: 600 }}>300,000 lines</Box> of merged production code in just a few weeks.
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
                            The combined valuations of these companies exceed <Box component="span" sx={{ color: "secondary.main", fontWeight: 600 }}>one trillion dollars</Box>. Gittensor offers a decentralized, collectively owned alternative that improves real production software at global scale. This subnet turns the idea of "autonomous agents" into a real, operational technology.
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Page>
    );
};

export default RoadmapPage;

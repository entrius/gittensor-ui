import React from "react";
import {
  Box,
  Typography,
  Grid,
  Stack,
  Card,
  CircularProgress,
} from "@mui/material";
import { useMinerStats } from "../../api";

interface MinerTierPerformanceProps {
  githubId: string;
}

const MinerTierPerformance: React.FC<MinerTierPerformanceProps> = ({
  githubId,
}) => {
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress size={30} sx={{ color: "primary.main" }} />
      </Box>
    );
  }

  if (error || !minerStats) {
    return null; // Don't show anything if no data
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        p: 3,
        mb: 3,
      }}
      elevation={0}
    >
      <Typography
        variant="h6"
        sx={{
          color: "#ffffff",
          fontFamily: '"JetBrains Mono", monospace',
          mb: 2.5,
          fontWeight: 600,
          fontSize: "1.1rem",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          "&::before": {
            content: '""',
            width: "4px",
            height: "20px",
            backgroundColor: "primary.main",
            borderRadius: "2px",
          },
        }}
      >
        Tier Performance
      </Typography>

      <Grid container spacing={2}>
        {[
          {
            name: "Gold",
            color: "#FFD700",
            bgColor: "rgba(255, 215, 0, 0.05)",
            borderColor: "rgba(255, 215, 0, 0.2)",
            stats: {
              score: minerStats.goldScore,
              credibility: minerStats.goldCredibility,
              merged: minerStats.goldMergedPrs,
              closed: minerStats.goldClosedPrs,
              total: minerStats.goldTotalPrs,
              collateral: minerStats.goldCollateralScore,
            },
          },
          {
            name: "Silver",
            color: "#C0C0C0",
            bgColor: "rgba(192, 192, 192, 0.05)",
            borderColor: "rgba(192, 192, 192, 0.2)",
            stats: {
              score: minerStats.silverScore,
              credibility: minerStats.silverCredibility,
              merged: minerStats.silverMergedPrs,
              closed: minerStats.silverClosedPrs,
              total: minerStats.silverTotalPrs,
              collateral: minerStats.silverCollateralScore,
            },
          },
          {
            name: "Bronze",
            color: "#CD7F32",
            bgColor: "rgba(205, 127, 50, 0.05)",
            borderColor: "rgba(205, 127, 50, 0.2)",
            stats: {
              score: minerStats.bronzeScore,
              credibility: minerStats.bronzeCredibility,
              merged: minerStats.bronzeMergedPrs,
              closed: minerStats.bronzeClosedPrs,
              total: minerStats.bronzeTotalPrs,
              collateral: minerStats.bronzeCollateralScore,
            },
          },
        ].map((tier) => {
          const opened =
            (tier.stats.total || 0) -
            (tier.stats.merged || 0) -
            (tier.stats.closed || 0);
          return (
            <Grid item xs={12} md={4} key={tier.name}>
              <Box
                sx={{
                  backgroundColor: tier.bgColor,
                  borderRadius: 2,
                  border: `1px solid ${tier.borderColor}`,
                  p: 2,
                  height: "100%",
                }}
              >
                <Typography
                  sx={{
                    color: tier.color,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    mb: 1.5,
                    pb: 1,
                    borderBottom: `1px solid ${tier.borderColor}`,
                  }}
                >
                  {tier.name} Tier
                </Typography>

                <Stack spacing={1.5}>
                  <Box>
                    <Typography
                      sx={{
                        color: "rgba(255, 255, 255, 0.5)",
                        fontSize: "0.7rem",
                        fontFamily: '"JetBrains Mono", monospace',
                        textTransform: "uppercase",
                      }}
                    >
                      Score
                    </Typography>
                    <Typography
                      sx={{
                        color: "#ffffff",
                        fontSize: "1.1rem",
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 600,
                      }}
                    >
                      {tier.stats.score
                        ? Number(tier.stats.score).toFixed(4)
                        : "0.0000"}
                    </Typography>
                  </Box>

                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: "0.7rem",
                          fontFamily: '"JetBrains Mono", monospace',
                          textTransform: "uppercase",
                        }}
                      >
                        Credibility
                      </Typography>
                      <Typography
                        sx={{
                          color:
                            tier.stats.credibility &&
                            tier.stats.credibility >= 0.7
                              ? "#4ade80"
                              : "#ffffff",
                          fontSize: "0.95rem",
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 600,
                        }}
                      >
                        {tier.stats.credibility
                          ? `${(Number(tier.stats.credibility) * 100).toFixed(1)}%`
                          : "N/A"}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        sx={{
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: "0.7rem",
                          fontFamily: '"JetBrains Mono", monospace',
                          textTransform: "uppercase",
                        }}
                      >
                        Collateral
                      </Typography>
                      <Typography
                        sx={{
                          color: "#ffffff",
                          fontSize: "0.95rem",
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 600,
                        }}
                      >
                        {tier.stats.collateral
                          ? Number(tier.stats.collateral).toFixed(4)
                          : "0.0000"}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{ pt: 1, borderTop: `1px solid ${tier.borderColor}` }}
                  >
                    <Typography
                      sx={{
                        color: "rgba(255, 255, 255, 0.5)",
                        fontSize: "0.7rem",
                        fontFamily: '"JetBrains Mono", monospace',
                        mb: 0.5,
                      }}
                    >
                      PR Activity
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      <Typography
                        sx={{
                          color: "#ffffff",
                          fontSize: "0.8rem",
                          fontFamily: '"JetBrains Mono", monospace',
                        }}
                      >
                        Opened: {opened > 0 ? opened : 0}
                      </Typography>
                      <Typography
                        sx={{
                          color: "#ffffff",
                          fontSize: "0.8rem",
                          fontFamily: '"JetBrains Mono", monospace',
                        }}
                      >
                        Merged: {tier.stats.merged || 0}
                      </Typography>
                      <Typography
                        sx={{
                          color: "#ffffff",
                          fontSize: "0.8rem",
                          fontFamily: '"JetBrains Mono", monospace',
                        }}
                      >
                        Closed: {tier.stats.closed || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Card>
  );
};

export default MinerTierPerformance;

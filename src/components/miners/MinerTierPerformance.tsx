import React from "react";
import {
  Box,
  Typography,
  Grid,
  Stack,
  Card,
  CircularProgress,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useMinerStats, useTierConfigurations, TierConfig } from "../../api";

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const getTierLevel = (tier: string | undefined | null): number => {
  if (!tier) return 0; // No tier yet - working towards bronze
  return TIER_LEVELS[tier.toLowerCase()] || 0;
};

const getTierConfig = (
  tierName: string,
  tierConfigs: TierConfig[] | undefined,
): TierConfig | undefined => {
  return tierConfigs?.find(
    (t) => t.name.toLowerCase() === tierName.toLowerCase(),
  );
};

interface MinerTierPerformanceProps {
  githubId: string;
}

const MinerTierPerformance: React.FC<MinerTierPerformanceProps> = ({
  githubId,
}) => {
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  const { data: tierConfigData } = useTierConfigurations();

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

  const tierConfigs = tierConfigData?.tiers;

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
            name: "Bronze",
            level: 1,
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
          {
            name: "Silver",
            level: 2,
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
            name: "Gold",
            level: 3,
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
        ].map((tier) => {
          const currentTierLevel = getTierLevel(minerStats.currentTier);
          const isLocked = tier.level > currentTierLevel;
          const opened =
            (tier.stats.total || 0) -
            (tier.stats.merged || 0) -
            (tier.stats.closed || 0);
          const isNextTier = tier.level === currentTierLevel + 1;
          const config = getTierConfig(tier.name, tierConfigs);

          // Calculate progress towards unlocking this tier
          const mergedCount = tier.stats.merged || 0;
          const credibility = tier.stats.credibility || 0;
          const requiredMerges = config?.requiredMerges || 3;
          const requiredCredibility = config?.requiredCredibility || 0.7;

          const mergeProgress = Math.min(
            (mergedCount / requiredMerges) * 100,
            100,
          );
          const credibilityProgress = Math.min(
            (credibility / requiredCredibility) * 100,
            100,
          );
          const overallProgress = (mergeProgress + credibilityProgress) / 2;

          const getPreviousTierName = (level: number): string => {
            const tierNames = ["", "Bronze", "Silver", "Gold"];
            return tierNames[level - 1] || "";
          };

          const getTooltipMessage = () => {
            if (!config) {
              if (isNextTier) {
                return `${tier.name} tier unlock in progress. Continue contributing to ${tier.name} tier repos to unlock this tier.`;
              }
              const prevTier = getPreviousTierName(tier.level);
              return `${tier.name} tier isn't unlocked yet, so contributions earn 0 points. It will only unlock after ${prevTier} is unlocked.`;
            }

            const reqMerges = config.requiredMerges;
            const reqCred = (config.requiredCredibility * 100).toFixed(0);

            if (isNextTier) {
              return `${tier.name} tier unlock in progress. Requires ${reqMerges} successful merges with ${reqCred}%+ credibility to ${tier.name.toLowerCase()} tier repositories.`;
            }

            // Far tier - don't show requirements, just say previous tier needed
            const prevTier = getPreviousTierName(tier.level);
            return `${tier.name} tier isn't unlocked yet, so contributions earn 0 points. It will only unlock after ${prevTier} is unlocked.`;
          };

          const getFilterStyles = () => {
            if (!isLocked) return { opacity: 1, filter: "none" };
            if (isNextTier) return { opacity: 0.85, filter: "grayscale(35%)" };
            return { opacity: 0.4, filter: "grayscale(85%)" };
          };

          const getHoverStyles = () => {
            if (!isLocked) return {};
            if (isNextTier) return { opacity: 0.95, filter: "grayscale(15%)" };
            return { opacity: 0.5, filter: "grayscale(70%)" };
          };

          const getBorderStyles = () => {
            if (!isLocked) {
              return {
                border: `1.5px solid ${tier.color}`,
                boxShadow: `0 0 12px ${tier.color}40, inset 0 0 8px ${tier.color}15`,
              };
            }
            return {
              border: `1px solid ${tier.borderColor}`,
            };
          };

          const filterStyles = getFilterStyles();

          const cardContent = (
            <Box
              sx={{
                backgroundColor: tier.bgColor,
                borderRadius: 2,
                ...getBorderStyles(),
                p: 2,
                height: "100%",
                ...filterStyles,
                position: "relative",
                transition: "all 0.2s ease",
                "&:hover": getHoverStyles(),
              }}
            >
              {isLocked && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    color: "rgba(255, 255, 255, 0.4)",
                  }}
                >
                  <LockOutlinedIcon sx={{ fontSize: "1rem" }} />
                </Box>
              )}
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
                      <Tooltip
                        title="Credibility is the ratio of merged PRs to total PR attempts (merged + closed). It represents your success rate."
                        arrow
                        placement="top"
                        slotProps={{
                          tooltip: {
                            sx: {
                              backgroundColor: "rgba(30, 30, 30, 0.95)",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontFamily: '"JetBrains Mono", monospace',
                              padding: "8px 12px",
                              borderRadius: "6px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              maxWidth: 240,
                            },
                          },
                          arrow: {
                            sx: {
                              color: "rgba(30, 30, 30, 0.95)",
                            },
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "0.7rem",
                            fontFamily: '"JetBrains Mono", monospace',
                            textTransform: "uppercase",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            cursor: "help",
                          }}
                        >
                          Credibility
                          <InfoOutlinedIcon sx={{ fontSize: "0.75rem" }} />
                        </Typography>
                      </Tooltip>
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
                        Merged: {tier.stats.merged || 0}
                      </Typography>
                      <Typography
                        sx={{
                          color: "#ffffff",
                          fontSize: "0.8rem",
                          fontFamily: '"JetBrains Mono", monospace',
                        }}
                      >
                        Open: {opened > 0 ? opened : 0}
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

                  {isNextTier && config && (
                    <Box
                      sx={{
                        pt: 1.5,
                        mt: 1,
                        borderTop: `1px solid ${tier.borderColor}`,
                      }}
                    >
                      <Typography
                        sx={{
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: "0.7rem",
                          fontFamily: '"JetBrains Mono", monospace',
                          mb: 1,
                          textTransform: "uppercase",
                        }}
                      >
                        Unlock Progress
                      </Typography>

                      <Box sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              color: "rgba(255, 255, 255, 0.7)",
                              fontSize: "0.7rem",
                              fontFamily: '"JetBrains Mono", monospace',
                            }}
                          >
                            Merges
                          </Typography>
                          <Typography
                            sx={{
                              color:
                                mergeProgress >= 100 ? "#4ade80" : "#ffffff",
                              fontSize: "0.7rem",
                              fontFamily: '"JetBrains Mono", monospace',
                            }}
                          >
                            {mergedCount}/{requiredMerges}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={mergeProgress}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor:
                                mergeProgress >= 100 ? "#4ade80" : tier.color,
                              borderRadius: 2,
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              color: "rgba(255, 255, 255, 0.7)",
                              fontSize: "0.7rem",
                              fontFamily: '"JetBrains Mono", monospace',
                            }}
                          >
                            Credibility
                          </Typography>
                          <Typography
                            sx={{
                              color:
                                credibilityProgress >= 100
                                  ? "#4ade80"
                                  : "#ffffff",
                              fontSize: "0.7rem",
                              fontFamily: '"JetBrains Mono", monospace',
                            }}
                          >
                            {credibility
                              ? `${(credibility * 100).toFixed(0)}%`
                              : "0%"}
                            /{(requiredCredibility * 100).toFixed(0)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={credibilityProgress}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor:
                                credibilityProgress >= 100
                                  ? "#4ade80"
                                  : tier.color,
                              borderRadius: 2,
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </Stack>
            </Box>
          );

          return (
            <Grid item xs={12} md={4} key={tier.name}>
              {isLocked ? (
                <Tooltip
                  title={getTooltipMessage()}
                  arrow
                  placement="top"
                  slotProps={{
                    tooltip: {
                      sx: {
                        backgroundColor: "rgba(30, 30, 30, 0.95)",
                        color: "#ffffff",
                        fontSize: "0.8rem",
                        fontFamily: '"JetBrains Mono", monospace',
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        maxWidth: 280,
                      },
                    },
                    arrow: {
                      sx: {
                        color: "rgba(30, 30, 30, 0.95)",
                      },
                    },
                  }}
                >
                  {cardContent}
                </Tooltip>
              ) : (
                cardContent
              )}
            </Grid>
          );
        })}
      </Grid>
    </Card>
  );
};

export default MinerTierPerformance;

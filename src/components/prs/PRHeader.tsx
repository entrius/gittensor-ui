import React from "react";
import { Box, Typography, Avatar, Chip, Tooltip } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate } from "react-router-dom";
import { formatUsdEstimate } from "../../utils";

interface PRHeaderProps {
  repository: string;
  pullRequestNumber: number;
  prDetails: any; // Using any for now to avoid duplicating the full type definition, or import it if available
}

const PRHeader: React.FC<PRHeaderProps> = ({
  repository,
  pullRequestNumber,
  prDetails,
}) => {
  const navigate = useNavigate();
  const [owner] = repository.split("/");

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Gold":
        return "#FFD700";
      case "Silver":
        return "#C0C0C0";
      case "Bronze":
        return "#CD7F32";
      default:
        return "#8b949e";
    }
  };

  const isOpenPR = prDetails.prState === "OPEN";
  const isClosed = prDetails.prState === "CLOSED";
  const collateralScore = parseFloat(prDetails.collateralScore || "0");
  const earnedScore = parseFloat(prDetails.earnedScore || "0");
  const predictedUsdPerDay = prDetails.predictedUsdPerDay || 0;

  // Low value PR - use the field from API directly
  const isLowValuePR = prDetails.lowValuePr === true;

  return (
    <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", gap: 2 }}>
      <Box
        onClick={() =>
          navigate(`/miners/repository?name=${encodeURIComponent(repository)}`)
        }
        sx={{
          cursor: "pointer",
          transition: "transform 0.2s",
          "&:hover": {
            transform: "scale(1.05)",
          },
        }}
      >
        <Avatar
          src={`https://avatars.githubusercontent.com/${owner}`}
          alt={owner}
          sx={{
            width: 64,
            height: 64,
            border: "2px solid rgba(255, 255, 255, 0.2)",
            backgroundColor:
              owner === "opentensor"
                ? "#ffffff"
                : owner === "bitcoin"
                  ? "#F7931A"
                  : "transparent",
          }}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Typography
            variant="h5"
            sx={{
              color: "#ffffff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "1.3rem",
              fontWeight: 500,
            }}
          >
            #{pullRequestNumber}
          </Typography>
          <Box
            sx={{
              display: "inline-block",
              px: 1,
              py: 0.25,
              borderRadius: 1,
              backgroundColor:
                prDetails.prState === "CLOSED"
                  ? "rgba(255, 123, 114, 0.2)"
                  : prDetails.prState === "MERGED"
                    ? "rgba(163, 113, 247, 0.2)"
                    : "rgba(45, 125, 70, 0.2)",
              border: "1px solid",
              borderColor:
                prDetails.prState === "CLOSED"
                  ? "rgba(255, 123, 114, 0.4)"
                  : prDetails.prState === "MERGED"
                    ? "rgba(163, 113, 247, 0.4)"
                    : "rgba(45, 125, 70, 0.4)",
            }}
          >
            <Typography
              sx={{
                color:
                  prDetails.prState === "CLOSED"
                    ? "#ff7b72"
                    : prDetails.prState === "MERGED"
                      ? "#a371f7"
                      : "#3fb950",
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {prDetails.prState}
            </Typography>
          </Box>
        </Box>
        <Typography
          sx={{
            color: "#ffffff",
            fontSize: "1rem",
            fontWeight: 400,
            mb: 0.5,
          }}
        >
          {prDetails.title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            onClick={() =>
              navigate(
                `/miners/repository?name=${encodeURIComponent(repository)}`,
              )
            }
            sx={{
              color: "rgba(255, 255, 255, 0.5)",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "color 0.2s",
              "&:hover": {
                color: "primary.main",
                textDecoration: "underline",
              },
            }}
          >
            {repository}
          </Typography>
          {prDetails.tier && (
            <Chip
              variant="tier"
              label={prDetails.tier}
              sx={{
                color: getTierColor(prDetails.tier),
                borderColor: getTierColor(prDetails.tier),
              }}
            />
          )}
        </Box>
      </Box>

      {/* Score Section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 0.75,
        }}
      >
        {isOpenPR ? (
          /* Open PR: Show Potential Score | Collateral */
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2.5 }}>
            {/* Potential Score */}
            <Box sx={{ textAlign: "right" }}>
              <Tooltip
                title="Potential score is an estimated earned score if this PR is merged. Some factors like the repository uniqueness multiplier depend on other miners' results at merge time and cannot be predicted exactly."
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
                <Typography
                  sx={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.5,
                    cursor: "pointer",
                  }}
                >
                  Potential
                  <InfoOutlinedIcon sx={{ fontSize: "0.9rem" }} />
                </Typography>
              </Tooltip>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "2.25rem",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "rgba(255, 255, 255, 0.6)",
                }}
              >
                {(collateralScore * 5).toFixed(2)}
              </Typography>
              {predictedUsdPerDay > 0 && (
                <Tooltip
                  title="This is an estimation. Actual payouts depend on validator consensus, network incentive distribution, and other miners' scores."
                  arrow
                  placement="bottom"
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
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.95rem",
                      color: "rgba(74, 222, 128, 0.8)",
                      mt: 0.5,
                      cursor: "pointer",
                    }}
                  >
                    ~{formatUsdEstimate(predictedUsdPerDay, { showZero: true })}
                    /day
                  </Typography>
                </Tooltip>
              )}
            </Box>

            {/* Divider */}
            <Box
              sx={{
                width: "1px",
                height: "55px",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                mt: 0.5,
              }}
            />

            {/* Collateral */}
            <Box sx={{ textAlign: "right" }}>
              <Tooltip
                title="Open collateral is deducted from your total score while PRs are open, preventing low-quality PR spam."
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
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.5,
                    cursor: "pointer",
                  }}
                >
                  Collateral
                  <InfoOutlinedIcon sx={{ fontSize: "0.9rem" }} />
                </Typography>
              </Tooltip>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "2.25rem",
                  fontWeight: 700,
                  lineHeight: 1,
                  color:
                    collateralScore > 0
                      ? "rgba(248, 113, 113, 0.9)"
                      : "rgba(255, 255, 255, 0.4)",
                }}
              >
                {collateralScore > 0
                  ? `-${collateralScore.toFixed(2)}`
                  : collateralScore.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        ) : (
          /* Merged/Closed PR: Show Score */
          <Box sx={{ textAlign: "right" }}>
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.5)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                mb: 0.5,
              }}
            >
              Score
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "2.25rem",
                fontWeight: 700,
                lineHeight: 1,
                color: isClosed ? "rgba(255, 255, 255, 0.4)" : "#ffffff",
              }}
            >
              {earnedScore.toFixed(2)}
            </Typography>
            {!isClosed && predictedUsdPerDay > 0 && (
              <Tooltip
                title="This is an estimation. Actual payouts depend on validator consensus, network incentive distribution, and other miners' scores."
                arrow
                placement="bottom"
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
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.95rem",
                    color: "rgba(74, 222, 128, 0.8)",
                    mt: 0.5,
                    cursor: "pointer",
                  }}
                >
                  ~{formatUsdEstimate(predictedUsdPerDay, { showZero: true })}
                  /day
                </Typography>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Low Value Badge - shown for any PR state if lowValuePr is true */}
        {isLowValuePR && (
          <Tooltip
            title="This PR received no score as it was deemed a low value contribution. Low value PRs have a low percentage of substantive changes (e.g., primarily typo fixes, documentation, test files, comments, or markdown changes relative to actual code changes)."
            arrow
            placement="left"
            slotProps={{
              tooltip: {
                sx: {
                  backgroundColor: "rgba(30, 30, 30, 0.95)",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontFamily: '"JetBrains Mono", monospace',
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  maxWidth: 300,
                },
              },
              arrow: {
                sx: {
                  color: "rgba(30, 30, 30, 0.95)",
                },
              },
            }}
          >
            <Chip
              variant="status"
              icon={<WarningAmberIcon />}
              label="Low Value"
              sx={{
                color: "rgba(250, 204, 21, 0.9)",
                borderColor: "rgba(250, 204, 21, 0.3)",
                cursor: "pointer",
                "& .MuiChip-icon": { color: "rgba(250, 204, 21, 0.9)" },
              }}
            />
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default PRHeader;

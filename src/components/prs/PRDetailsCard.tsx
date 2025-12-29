import React, { useMemo } from "react";
import {
  Card,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Grid,
  Chip,
} from "@mui/material";
import { useAllMinerData, usePullRequestDetails } from "../../api";
import { useNavigate } from "react-router-dom";

interface PRDetailsCardProps {
  repository: string;
  pullRequestNumber: number;
}

const PRDetailsCard: React.FC<PRDetailsCardProps> = ({
  repository,
  pullRequestNumber,
}) => {
  const navigate = useNavigate();
  // Fetch detailed PR data directly
  const { data: prDetails, isLoading: isDetailsLoading } =
    usePullRequestDetails(repository, pullRequestNumber);

  // Keep fetching all PRs only for ranking purposes (optional, could be optimized later)
  const { data: allPRs } = useAllMinerData();

  // Calculate PR ranking among all PRs
  const prRank = useMemo(() => {
    if (!prDetails || !allPRs) return null;

    // Sort all PRs by score descending
    const sortedPRs = allPRs
      .slice()
      .sort((a, b) => parseFloat(b.score || "0") - parseFloat(a.score || "0"));

    // Find the rank of this specific PR
    const rank =
      sortedPRs.findIndex(
        (pr) =>
          pr.repository === repository &&
          pr.pullRequestNumber === pullRequestNumber,
      ) + 1;

    return rank || null;
  }, [prDetails, allPRs, repository, pullRequestNumber]);

  if (isDetailsLoading) {
    return (
      <Card
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          p: 4,
          textAlign: "center",
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: "primary.main" }} />
      </Card>
    );
  }

  if (!prDetails) {
    return (
      <Card
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          p: 4,
        }}
      >
        <Typography
          sx={{
            color: "rgba(255, 107, 107, 0.9)",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.9rem",
          }}
        >
          Pull request not found.
        </Typography>
      </Card>
    );
  }

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

  const statItems = [
    {
      label: "Score",
      value: parseFloat(prDetails.earnedScore).toFixed(4),
      rank: prRank,
    },
    {
      label: "Base Score",
      value: parseFloat(prDetails.baseScore).toFixed(4),
      rank: null,
      color: "rgba(255, 255, 255, 0.7)",
    },
    {
      label: "Lines Scored",
      value: prDetails.totalLinesScored.toLocaleString(),
      rank: null,
    },
    {
      label: "Changes",
      value: `+${prDetails.additions} / -${prDetails.deletions}`,
      rank: null,
      color: "rgba(255, 255, 255, 0.7)",
    },
    {
      label: "Commits",
      value: prDetails.commits,
      rank: null,
    },
  ];

  const multipliers = [
    {
      label: "Repo Weight",
      value: `${parseFloat(prDetails.repoWeightMultiplier).toFixed(2)}x`,
    },
    {
      label: "Issue Bonus",
      value: `${parseFloat(prDetails.issueMultiplier).toFixed(2)}x`,
    },
    {
      label: "Credibility",
      value: `${parseFloat(prDetails.credibilityMultiplier).toFixed(2)}x`,
    },
    {
      label: "Repo Unique",
      value: `${parseFloat(prDetails.repositoryUniquenessMultiplier).toFixed(2)}x`,
    },
    {
      label: "Time Decay",
      value: `${parseFloat(prDetails.timeDecayMultiplier).toFixed(2)}x`,
    },
    {
      label: "Tag Bonus",
      value: `${parseFloat(prDetails.gittensorTagMultiplier).toFixed(2)}x`,
    },
  ];

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        p: 3,
      }}
      elevation={0}
    >
      {/* PR Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          onClick={() =>
            navigate(
              `/miners/repository?name=${encodeURIComponent(repository)}`,
            )
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
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}
          >
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
                label={prDetails.tier}
                size="small"
                sx={{
                  height: "20px",
                  fontSize: "0.65rem",
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: "transparent",
                  border: `1px solid ${getTierColor(prDetails.tier)}`,
                  color: getTierColor(prDetails.tier),
                  fontWeight: 600,
                  borderRadius: "4px",
                  "& .MuiChip-label": {
                    px: 1,
                  },
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <Box
              sx={{
                backgroundColor: "transparent",
                borderRadius: 3,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                p: 2.5,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                }}
              >
                <Typography
                  sx={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </Typography>
                {item.rank && (
                  <Box
                    sx={{
                      backgroundColor: "#000000",
                      borderRadius: "2px",
                      width: "20px",
                      height: "20px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: "1px solid",
                      borderColor:
                        item.rank === 1
                          ? "rgba(255, 215, 0, 0.4)"
                          : item.rank === 2
                            ? "rgba(192, 192, 192, 0.4)"
                            : item.rank === 3
                              ? "rgba(205, 127, 50, 0.4)"
                              : "rgba(255, 255, 255, 0.15)",
                      boxShadow:
                        item.rank === 1
                          ? "0 0 12px rgba(255, 215, 0, 0.4), 0 0 4px rgba(255, 215, 0, 0.2)"
                          : item.rank === 2
                            ? "0 0 12px rgba(192, 192, 192, 0.4), 0 0 4px rgba(192, 192, 192, 0.2)"
                            : item.rank === 3
                              ? "0 0 12px rgba(205, 127, 50, 0.4), 0 0 4px rgba(205, 127, 50, 0.2)"
                              : "none",
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color:
                          item.rank === 1
                            ? "#FFD700"
                            : item.rank === 2
                              ? "#C0C0C0"
                              : item.rank === 3
                                ? "#CD7F32"
                                : "rgba(255, 255, 255, 0.6)",
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.rank}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Typography
                sx={{
                  color: item.color || "#ffffff",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  wordBreak: "break-all",
                }}
              >
                {item.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Multipliers Breakdown */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            color: "rgba(255, 255, 255, 0.7)",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "1px",
            fontWeight: 600,
            mb: 2,
          }}
        >
          Score Multipliers
        </Typography>
        <Grid container spacing={2}>
          {multipliers.map((item, index) => (
            <Grid item xs={6} sm={4} md={2} key={index}>
              <Box
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderRadius: 2,
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <Typography
                  sx={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "0.7rem",
                    mb: 0.5,
                  }}
                >
                  {item.label}
                </Typography>
                <Typography
                  sx={{
                    color: "#ffffff",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Additional Info */}
      <Grid container spacing={2}>
        {/* Author */}
        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              backgroundColor: "transparent",
              borderRadius: 3,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              p: 2.5,
              height: "100%",
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.5)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 600,
                mb: 1.5,
              }}
            >
              Author
            </Typography>
            <Box
              onClick={() =>
                navigate(`/miners/details?githubId=${prDetails.githubId}`)
              }
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                cursor: "pointer",
                "&:hover": {
                  "& .MuiTypography-root": {
                    color: "primary.main",
                    textDecoration: "underline",
                  },
                },
                transition: "color 0.2s",
              }}
            >
              <Avatar
                src={`https://avatars.githubusercontent.com/${prDetails.authorLogin}`}
                alt={prDetails.authorLogin}
                sx={{ width: 32, height: 32 }}
              />
              <Typography
                sx={{
                  color: "#ffffff",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  transition: "color 0.2s",
                }}
              >
                {prDetails.authorLogin}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Merged Date */}
        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              backgroundColor: "transparent",
              borderRadius: 3,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              p: 2.5,
              height: "100%",
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.5)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 600,
                mb: 1.5,
              }}
            >
              Merged
            </Typography>
            <Typography
              sx={{
                color: "#ffffff",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.95rem",
                fontWeight: 500,
              }}
            >
              {prDetails.mergedAt
                ? new Date(prDetails.mergedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Not Merged"}
            </Typography>
          </Box>
        </Grid>

        {/* Hotkey */}
        {prDetails.hotkey && (
          <Grid item xs={12}>
            <Box
              sx={{
                backgroundColor: "transparent",
                borderRadius: 3,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                p: 2.5,
              }}
            >
              <Typography
                sx={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  fontWeight: 600,
                  mb: 1.5,
                }}
              >
                Hotkey
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.85rem",
                  wordBreak: "break-all",
                }}
              >
                {prDetails.hotkey}
              </Typography>
            </Box>
          </Grid>
        )}

        {/* GitHub Link */}
        <Grid item xs={12}>
          <Box
            sx={{
              backgroundColor: "transparent",
              borderRadius: 3,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              p: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.85rem",
              }}
            >
              View this pull request on GitHub
            </Typography>
            <a
              href={`https://github.com/${repository}/pull/${pullRequestNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#58a6ff",
                textDecoration: "none",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              Open →
            </a>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
};

export default PRDetailsCard;

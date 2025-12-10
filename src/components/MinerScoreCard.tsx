import React, { useMemo } from "react";
import {
  Card,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Avatar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  useMinerStats,
  useMinerPRs,
  useAllMinerStats,
  useAllMinerData,
} from "../api";

interface MinerScoreCardProps {
  githubId: string;
}

const MinerScoreCard: React.FC<MinerScoreCardProps> = ({ githubId }) => {
  const navigate = useNavigate();
  // Use pre-computed stats from MinerEvaluations table - much faster!
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  // Fetch PRs to get username for avatar (only fetches first PR)
  const { data: prs } = useMinerPRs(githubId);
  const username = prs?.[0]?.author || githubId;

  // Fetch all miners' stats to calculate rankings
  const { data: allMinersStats } = useAllMinerStats();

  // Fetch all PRs to calculate top PR ranking
  const { data: allPRs } = useAllMinerData();

  // Calculate rankings for each metric
  const rankings = useMemo(() => {
    if (!allMinersStats || !minerStats) return null;

    // Sort miners by each metric and find the current miner's rank
    const prRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalPrs) - Number(a.totalPrs))
        .findIndex((m) => m.githubId === githubId) + 1;

    const linesRanking =
      allMinersStats
        .slice()
        .sort(
          (a, b) => Number(b.totalLinesChanged) - Number(a.totalLinesChanged),
        )
        .findIndex((m) => m.githubId === githubId) + 1;

    const reposRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.uniqueReposCount) - Number(a.uniqueReposCount))
        .findIndex((m) => m.githubId === githubId) + 1;

    const scoreRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
        .findIndex((m) => m.githubId === githubId) + 1;

    return {
      totalPrs: prRanking || null,
      linesChanged: linesRanking || null,
      uniqueRepos: reposRanking || null,
      score: scoreRanking || null,
    };
  }, [allMinersStats, minerStats, githubId]);

  // Find top PR by score - MUST be before conditional returns
  const topPR = useMemo(() => {
    if (!prs || prs.length === 0) return null;
    return prs.reduce((max, pr) => {
      const prScore = parseFloat(pr.score || "0");
      const maxScore = parseFloat(max.score || "0");
      return prScore > maxScore ? pr : max;
    }, prs[0]);
  }, [prs]);

  // Calculate top PR ranking among all PRs - MUST be before conditional returns
  const topPRRank = useMemo(() => {
    if (!topPR || !allPRs || allPRs.length === 0) return null;

    // Sort all PRs by score descending
    const sortedPRs = allPRs
      .slice()
      .sort((a, b) => parseFloat(b.score || "0") - parseFloat(a.score || "0"));

    // Find the rank of this specific PR
    const rank =
      sortedPRs.findIndex(
        (pr) =>
          pr.repository === topPR.repository &&
          pr.pullRequestNumber === topPR.pullRequestNumber,
      ) + 1;

    return rank || null;
  }, [topPR, allPRs]);

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          p: 4,
          textAlign: "center",
        }}
      >
        <CircularProgress size={40} sx={{ color: "primary.main" }} />
      </Card>
    );
  }

  if (error || !minerStats) {
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
          No data found for GitHub user: {githubId}
        </Typography>
      </Card>
    );
  }

  // Use pre-computed stats directly from the evaluation
  const statItems: Array<{
    label: string;
    value: string | number;
    rank: number | null | undefined;
    link?: string | null;
  }> = [
    {
      label: "Current Score",
      value: Number(minerStats.totalScore).toFixed(4),
      rank: rankings?.score,
    },
    {
      label: "Total PRs",
      value: Number(minerStats.totalPrs || 0),
      rank: rankings?.totalPrs,
    },
    {
      label: "Scored Lines",
      value: Number(minerStats.totalLinesChanged || 0).toLocaleString(),
      rank: rankings?.linesChanged,
    },
    {
      label: "Unique Repos",
      value: Number(minerStats.uniqueReposCount || 0),
      rank: rankings?.uniqueRepos,
    },
    {
      label: "Top PR",
      value: topPR ? parseFloat(topPR.score || "0").toFixed(4) : "N/A",
      rank: topPRRank,
      link: topPR
        ? `/miners/pr?repo=${topPR.repository}&number=${topPR.pullRequestNumber}`
        : null,
    },
  ];

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
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          src={`https://avatars.githubusercontent.com/${username}`}
          alt={username}
          sx={{
            width: 64,
            height: 64,
            border: "2px solid rgba(255, 255, 255, 0.1)",
          }}
        />
        <Box>
          <Typography
            variant="h5"
            sx={{
              color: "#ffffff",
              fontFamily: '"JetBrains Mono", monospace',
              mb: 0.5,
              fontSize: "1.3rem",
              fontWeight: 500,
            }}
          >
            {username}
          </Typography>
          <Typography
            sx={{
              color: "rgba(255, 255, 255, 0.6)",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.85rem",
            }}
          >
            {minerStats.hotkey ? minerStats.hotkey : "N/A"}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
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
              {item.link ? (
                <Box
                  onClick={() => navigate(item.link!)}
                  sx={{
                    cursor: "pointer",
                  }}
                >
                  <Typography
                    sx={{
                      color: "#ffffff",
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      wordBreak: "break-all",
                      "&:hover": {
                        color: "primary.main",
                      },
                      transition: "color 0.2s",
                    }}
                  >
                    {String(item.value)}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  sx={{
                    color: "#ffffff",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    wordBreak: "break-all",
                  }}
                >
                  {String(item.value)}
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );
};

export default MinerScoreCard;

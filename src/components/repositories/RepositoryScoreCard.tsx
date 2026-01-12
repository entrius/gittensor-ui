import React, { useMemo } from "react";
import {
  Card,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Avatar,
} from "@mui/material";
import { useAllPrs } from "../../api";

interface RepositoryScoreCardProps {
  repositoryFullName: string;
}

const RepositoryScoreCard: React.FC<RepositoryScoreCardProps> = ({
  repositoryFullName,
}) => {
  const { data: allPRs, isLoading } = useAllPrs();

  const repoStats = useMemo(() => {
    if (!allPRs) return null;

    const allRepoPRs = allPRs.filter(
      (pr) => pr.repository.toLowerCase() === repositoryFullName.toLowerCase(),
    );

    if (allRepoPRs.length === 0) return null;

    const totalScore = allRepoPRs.reduce(
      (sum, pr) => sum + parseFloat(pr.score || "0"),
      0,
    );
    const totalLines = allRepoPRs.reduce(
      (sum, pr) => sum + (pr.additions + pr.deletions),
      0,
    );
    const totalCommits = allRepoPRs.reduce(
      (sum, pr) => sum + pr.commitCount,
      0,
    );

    const uniqueContributors = new Set(
      allRepoPRs.map((pr) => pr.githubId).filter((id): id is string => !!id),
    ).size;

    // Calculate stats for all repositories to determine rankings
    const repoStats = new Map<
      string,
      {
        totalScore: number;
        totalPRs: number;
        totalLines: number;
        totalCommits: number;
        uniqueContributors: number;
      }
    >();

    allPRs.forEach((pr) => {
      const existing = repoStats.get(pr.repository) || {
        totalScore: 0,
        totalPRs: 0,
        totalLines: 0,
        totalCommits: 0,
        uniqueContributors: 0,
      };
      existing.totalScore += parseFloat(pr.score || "0");
      existing.totalPRs += 1;
      existing.totalLines += pr.additions + pr.deletions;
      existing.totalCommits += pr.commitCount;
      repoStats.set(pr.repository, existing);
    });

    // Count unique contributors per repo
    const repoContributors = new Map<string, Set<string>>();
    allPRs.forEach((pr) => {
      if (!pr.githubId) return; // Skip PRs without githubId
      if (!repoContributors.has(pr.repository)) {
        repoContributors.set(pr.repository, new Set());
      }
      repoContributors.get(pr.repository)!.add(pr.githubId);
    });
    repoContributors.forEach((contribs, repo) => {
      const stats = repoStats.get(repo);
      if (stats) stats.uniqueContributors = contribs.size;
    });

    // Calculate rankings
    const allRepos = Array.from(repoStats.entries());

    const scoreRank =
      allRepos
        .sort((a, b) => b[1].totalScore - a[1].totalScore)
        .findIndex(
          ([repo]) => repo.toLowerCase() === repositoryFullName.toLowerCase(),
        ) + 1;

    const prsRank =
      allRepos
        .sort((a, b) => b[1].totalPRs - a[1].totalPRs)
        .findIndex(
          ([repo]) => repo.toLowerCase() === repositoryFullName.toLowerCase(),
        ) + 1;

    const contributorsRank =
      allRepos
        .sort((a, b) => b[1].uniqueContributors - a[1].uniqueContributors)
        .findIndex(
          ([repo]) => repo.toLowerCase() === repositoryFullName.toLowerCase(),
        ) + 1;

    const linesRank =
      allRepos
        .sort((a, b) => b[1].totalLines - a[1].totalLines)
        .findIndex(
          ([repo]) => repo.toLowerCase() === repositoryFullName.toLowerCase(),
        ) + 1;

    const commitsRank =
      allRepos
        .sort((a, b) => b[1].totalCommits - a[1].totalCommits)
        .findIndex(
          ([repo]) => repo.toLowerCase() === repositoryFullName.toLowerCase(),
        ) + 1;

    return {
      totalScore,
      totalPRs: allRepoPRs.length,
      totalLines,
      totalCommits,
      uniqueContributors,
      rankings: {
        score: scoreRank || null,
        prs: prsRank || null,
        contributors: contributorsRank || null,
        lines: linesRank || null,
        commits: commitsRank || null,
      },
    };
  }, [allPRs, repositoryFullName]);

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: "transparent",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          p: 4,
          textAlign: "center",
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: "primary.main" }} />
      </Card>
    );
  }

  if (!repoStats) {
    return (
      <Card
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          p: 4,
        }}
        elevation={0}
      >
        <Typography
          sx={{
            color: "rgba(255, 107, 107, 0.9)",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.9rem",
          }}
        >
          No data found for repository: {repositoryFullName}
        </Typography>
      </Card>
    );
  }

  const [owner, repoName] = repositoryFullName.split("/");

  const statItems = [
    {
      label: "Total Score",
      value: repoStats.totalScore.toFixed(4),
      rank: repoStats.rankings.score,
    },
    {
      label: "Total PRs",
      value: repoStats.totalPRs,
      rank: repoStats.rankings.prs,
    },
    {
      label: "Contributors",
      value: repoStats.uniqueContributors,
      rank: repoStats.rankings.contributors,
    },
    {
      label: "Total Lines",
      value: repoStats.totalLines.toLocaleString(),
      rank: repoStats.rankings.lines,
    },
    {
      label: "Total Commits",
      value: repoStats.totalCommits,
      rank: repoStats.rankings.commits,
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
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
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
            {repoName}
          </Typography>
          <Typography
            sx={{
              color: "rgba(255, 255, 255, 0.5)",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.85rem",
            }}
          >
            {owner}
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
              <Typography
                sx={{
                  color: "#ffffff",
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
    </Card>
  );
};

export default RepositoryScoreCard;

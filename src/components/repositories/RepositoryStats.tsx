import React, { useMemo } from "react";
import { Box, Typography, Skeleton, Divider } from "@mui/material";
import { useReposAndWeights, useAllPrs, useRepositoryIssues } from "../../api";

interface RepositoryStatsProps {
  repositoryFullName: string;
}

const RepositoryStats: React.FC<RepositoryStatsProps> = ({
  repositoryFullName,
}) => {
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: issues, isLoading: isLoadingIssues } =
    useRepositoryIssues(repositoryFullName);

  const repository = useMemo(() => {
    return repos?.find((r) => r.fullName === repositoryFullName);
  }, [repos, repositoryFullName]);

  const stats = useMemo(() => {
    if (!allPRs) return { totalPRs: 0, totalScore: 0 };

    // Filter PRs for this repo
    const repoPRs = allPRs.filter((pr) => pr.repository === repositoryFullName);
    const totalScore = repoPRs.reduce(
      (acc, pr) => acc + parseFloat(pr.score || "0"),
      0,
    );

    return {
      totalPRs: repoPRs.length,
      totalScore,
    };
  }, [allPRs, repositoryFullName]);

  const issueStats = useMemo(() => {
    if (!issues) return { totalIssues: 0, closedIssues: 0 };

    return {
      totalIssues: issues.length,
      closedIssues: issues.filter((issue) => issue.closedAt).length,
    };
  }, [issues]);

  if (isLoadingRepos || isLoadingPRs || isLoadingIssues) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: "#fff", fontWeight: 600, mb: 2, fontSize: "14px" }}
        >
          Repository Stats
        </Typography>
        <Skeleton
          variant="rectangular"
          height={160}
          sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2 }}
        />
      </Box>
    );
  }

  if (!repository) {
    return null;
  }

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

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="subtitle2"
        sx={{ color: "#fff", fontWeight: 600, mb: 2, fontSize: "14px" }}
      >
        Repository Stats
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* Weight */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: "13px", color: "#8b949e" }}
          >
            Weight
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#fff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "13px",
            }}
          >
            {repository.weight}
          </Typography>
        </Box>

        {/* Tier */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: "13px", color: "#8b949e" }}
          >
            Tier
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: getTierColor(repository.tier),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {repository.tier}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 0.5 }} />

        {/* Total Score */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: "13px", color: "#8b949e" }}
          >
            Total Score
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#fff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "13px",
            }}
          >
            {stats.totalScore.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </Typography>
        </Box>

        {/* Merged PRs */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: "13px", color: "#8b949e" }}
          >
            Merged PRs
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#fff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "13px",
            }}
          >
            {stats.totalPRs}
          </Typography>
        </Box>

        {/* Closed Issues */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: "13px", color: "#8b949e" }}
          >
            Closed Issues
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#fff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "13px",
            }}
          >
            {issueStats.closedIssues}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default RepositoryStats;

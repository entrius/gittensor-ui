import React, { useMemo } from "react";
import { Box, Card } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Page } from "../components/layout";
import { TopMinersTable, SEO } from "../components";
import { useAllMinerStats } from "../api";

const TopMinersPage: React.FC = () => {
  const navigate = useNavigate();

  const allMinerStatsQuery = useAllMinerStats();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  const handleSelectMiner = (githubId: string) => {
    navigate(`/miners/details?githubId=${githubId}`);
  };

  // Process miner stats for TopMinersTable
  const minerStats = useMemo(() => {
    if (!Array.isArray(allMinersStats)) return [];
    return allMinersStats.map((stat) => ({
      githubId: stat.githubId || "",
      author: stat.githubUsername || undefined,
      totalScore: Number(stat.totalScore) || 0,
      baseTotalScore: Number(stat.baseTotalScore) || 0,
      totalPRs: Number(stat.totalPrs) || 0,
      linesChanged: Number(stat.totalLinesChanged) || 0,
      linesAdded: Number(stat.totalAdditions) || 0,
      linesDeleted: Number(stat.totalDeletions) || 0,
      hotkey: stat.hotkey || "N/A",
      uniqueReposCount: Number(stat.uniqueReposCount) || 0,
      credibility: Number(stat.credibility) || 0,
      currentTier: stat.currentTier,
      usdPerDay: Number(stat.usdPerDay) || 0,
    }));
  }, [allMinersStats]);

  // Sort miners by total score
  const sortedMinerStats = useMemo(() => {
    return [...minerStats].sort((a, b) => b.totalScore - a.totalScore);
  }, [minerStats]);

  return (
    <Page title="Miner Leaderboard">
      <SEO
        title="Miner Leaderboard"
        description="Top contributors on Gittensor. View miner rankings, scores, and contribution statistics."
      />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: { xs: "auto", md: "calc(100vh - 80px)" },
          width: "100%",
          py: { xs: 2, sm: 0 },
        }}
      >
        <Box sx={{ maxWidth: 1200, width: "100%" }}>
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backgroundColor: "transparent",
              overflow: "hidden",
            }}
            elevation={0}
          >
            <TopMinersTable
              miners={sortedMinerStats}
              isLoading={isLoadingMinerStats}
              onSelectMiner={handleSelectMiner}
            />
          </Card>
        </Box>
      </Box>
    </Page>
  );
};

export default TopMinersPage;

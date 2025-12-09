import React from "react";
import { Box } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Page } from "../components/layout";
import { MinerLeaderboard, SEO } from "../components";

const MinersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Map tab names to indices
  const tabNameToIndex: Record<string, number> = {
    miners: 0,
    prs: 1,
    repos: 2,
  };

  const indexToTabName: Record<number, string> = {
    0: "miners",
    1: "prs",
    2: "repos",
  };

  // Get active tab from query param, default to 0 (Top Miners)
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam && tabNameToIndex[tabParam] !== undefined
    ? tabNameToIndex[tabParam]
    : 0;

  const handleSelectMiner = (githubId: string) => {
    navigate(`/miners/details?githubId=${githubId}`);
  };

  const handleSelectRepository = (repositoryFullName: string) => {
    navigate(
      `/miners/repository?name=${encodeURIComponent(repositoryFullName)}`,
    );
  };

  const handleSelectPR = (repository: string, pullRequestNumber: number) => {
    navigate(
      `/miners/pr?repo=${encodeURIComponent(repository)}&number=${pullRequestNumber}`,
    );
  };

  const handleTabChange = (newTab: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (newTab === 0) {
      // Default tab, remove param for cleaner URL
      newParams.delete("tab");
    } else {
      newParams.set("tab", indexToTabName[newTab]);
    }
    setSearchParams(newParams);
  };

  return (
    <Page title="Miner Dashboard">
      <SEO
        title="Miners Leaderboard"
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
          <MinerLeaderboard
            onSelectMiner={handleSelectMiner}
            onSelectRepository={handleSelectRepository}
            onSelectPR={handleSelectPR}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default MinersPage;

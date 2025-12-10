import React, { useMemo } from "react";
import { Box, Tabs, Tab, Card } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Page } from "../components/layout";
import {
  TopMinersTable,
  TopPRsTable,
  TopRepositoriesTable,
  SEO,
} from "../components";
import { useAllMinerData, useAllMinerStats } from "../api";
import { CommitLog } from "../api/models/Dashboard";

const MinersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch data at page level
  const { data: allPRs, isLoading: isLoadingPRs } = useAllMinerData();
  const { data: allMinersStats, isLoading: isLoadingMinerStats } =
    useAllMinerStats();

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
  const activeTab =
    tabParam && tabNameToIndex[tabParam] !== undefined
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

  const handleTabChange = (_event: React.SyntheticEvent, newTab: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (newTab === 0) {
      newParams.delete("tab");
    } else {
      newParams.set("tab", indexToTabName[newTab]);
    }
    setSearchParams(newParams);
  };

  // Build githubId -> username mapping
  const githubIdToUsername = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(allPRs)) {
      allPRs.forEach((pr: CommitLog) => {
        if (pr && pr.githubId && pr.author) {
          map.set(pr.githubId, pr.author);
        }
      });
    }
    return map;
  }, [allPRs]);

  // Process miner stats for TopMinersTable
  const minerStats = useMemo(() => {
    if (!allMinersStats) return [];
    return allMinersStats.map((stat) => ({
      githubId: stat.githubId || "",
      author: githubIdToUsername.get(stat.githubId) || undefined,
      totalScore: Number(stat.totalScore) || 0,
      baseTotalScore: Number(stat.baseTotalScore) || 0,
      totalPRs: Number(stat.totalPrs) || 0,
      linesChanged: Number(stat.totalLinesChanged) || 0,
      linesAdded: Number(stat.totalAdditions) || 0,
      linesDeleted: Number(stat.totalDeletions) || 0,
      hotkey: stat.hotkey || "N/A",
      uniqueReposCount: Number(stat.uniqueReposCount) || 0,
    }));
  }, [allMinersStats, githubIdToUsername]);

  // Sort miners by total score
  const sortedMinerStats = useMemo(() => {
    return [...minerStats].sort((a, b) => b.totalScore - a.totalScore);
  }, [minerStats]);

  // Process top PRs for TopPRsTable
  const topPRs = useMemo(() => {
    if (!allPRs) return [];
    return [...allPRs]
      .sort((a, b) => parseFloat(b.score || "0") - parseFloat(a.score || "0"))
      .slice(0, 100);
  }, [allPRs]);

  // Process repo stats for TopRepositoriesTable
  const repoStats = useMemo(() => {
    if (!allPRs) return [];

    const statsMap = new Map<
      string,
      {
        repository: string;
        totalScore: number;
        totalPRs: number;
        uniqueMiners: Set<string>;
      }
    >();

    allPRs.forEach((pr: CommitLog) => {
      if (!pr || !pr.repository) return;

      const current = statsMap.get(pr.repository) || {
        repository: pr.repository,
        totalScore: 0,
        totalPRs: 0,
        uniqueMiners: new Set<string>(),
      };

      current.totalScore += parseFloat(pr.score || "0");
      current.totalPRs += 1;
      if (pr.author) {
        current.uniqueMiners.add(pr.author);
      }

      statsMap.set(pr.repository, current);
    });

    return Array.from(statsMap.values()).sort(
      (a, b) => b.totalScore - a.totalScore,
    );
  }, [allPRs]);

  const isLoading = isLoadingPRs || isLoadingMinerStats;

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
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backgroundColor: "transparent",
              overflow: "hidden",
            }}
            elevation={0}
          >
            <Box sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  px: 2,
                  minHeight: "48px",
                  "& .MuiTab-root": {
                    color: "rgba(255, 255, 255, 0.6)",
                    fontFamily: '"JetBrains Mono", monospace',
                    textTransform: "none",
                    fontSize: "1rem",
                    minHeight: "48px",
                    fontWeight: 500,
                    "&.Mui-selected": {
                      color: "primary.main",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "primary.main",
                  },
                }}
              >
                <Tab label="Top Miners" />
                <Tab label="Top PRs" />
                <Tab label="Top Repos" />
              </Tabs>
            </Box>

            <Box>
              {activeTab === 0 && (
                <TopMinersTable
                  miners={sortedMinerStats}
                  isLoading={isLoading}
                  onSelectMiner={handleSelectMiner}
                />
              )}
              {activeTab === 1 && (
                <TopPRsTable
                  prs={topPRs}
                  isLoading={isLoading}
                  onSelectPR={handleSelectPR}
                  onSelectMiner={handleSelectMiner}
                  onSelectRepository={handleSelectRepository}
                />
              )}
              {activeTab === 2 && (
                <TopRepositoriesTable
                  repositories={repoStats}
                  isLoading={isLoading}
                  onSelectRepository={handleSelectRepository}
                />
              )}
            </Box>
          </Card>
        </Box>
      </Box>
    </Page>
  );
};

export default MinersPage;

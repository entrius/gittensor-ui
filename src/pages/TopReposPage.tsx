import React, { useMemo } from "react";
import { Box, Card } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Page } from "../components/layout";
import { TopRepositoriesTable, SEO } from "../components";
import { useAllMinerData, useReposAndWeights } from "../api";
import { CommitLog } from "../api/models/Dashboard";

const TopReposPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTierFilter = searchParams.get("tier") as
    | "Gold"
    | "Silver"
    | "Bronze"
    | null;
  const allMinerDataQuery = useAllMinerData();
  const allPRs = allMinerDataQuery?.data;
  const isLoadingPRs = allMinerDataQuery?.isLoading;
  const { data: reposWithWeights, isLoading: isLoadingRepos } =
    useReposAndWeights();

  const handleSelectRepository = (repositoryFullName: string) => {
    navigate(
      `/miners/repository?name=${encodeURIComponent(repositoryFullName)}`,
    );
  };

  // Process repo stats for TopRepositoriesTable - show ALL repos
  const repoStats = useMemo(() => {
    if (!reposWithWeights) return [];

    // Create a map to store PR stats for each repo
    const prStatsMap = new Map<
      string,
      {
        totalScore: number;
        totalPRs: number;
        uniqueMiners: Set<string>;
      }
    >();

    // Process PRs to calculate stats
    if (allPRs) {
      allPRs.forEach((pr: CommitLog) => {
        if (!pr || !pr.repository) return;

        const current = prStatsMap.get(pr.repository) || {
          totalScore: 0,
          totalPRs: 0,
          uniqueMiners: new Set<string>(),
        };

        current.totalScore += parseFloat(pr.score || "0");
        current.totalPRs += 1;
        if (pr.author) {
          current.uniqueMiners.add(pr.author);
        }

        prStatsMap.set(pr.repository, current);
      });
    }

    // Build the final list from ALL repos
    return reposWithWeights
      .map((repo) => {
        const prStats = prStatsMap.get(repo.fullName);
        return {
          repository: repo.fullName,
          totalScore: prStats?.totalScore || 0,
          totalPRs: prStats?.totalPRs || 0,
          uniqueMiners: prStats?.uniqueMiners || new Set<string>(),
          weight: repo.weight ? parseFloat(String(repo.weight)) : 0,
          tier: repo.tier || "",
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [allPRs, reposWithWeights]);

  return (
    <Page title="Top Repositories">
      <SEO
        title="Top Repositories"
        description="Top Repositories by contribution score on Gittensor."
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
            <TopRepositoriesTable
              repositories={repoStats}
              isLoading={isLoadingPRs || isLoadingRepos}
              onSelectRepository={handleSelectRepository}
              initialTierFilter={initialTierFilter || undefined}
            />
          </Card>
        </Box>
      </Box>
    </Page>
  );
};

export default TopReposPage;

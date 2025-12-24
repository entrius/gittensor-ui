import React, { useMemo } from "react";
import { Box, Card } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Page } from "../components/layout";
import { TopMinersTable, SEO } from "../components";
import { useAllMinerStats, useAllMinerData } from "../api";
import { CommitLog } from "../api/models/Dashboard";

const TopMinersPage: React.FC = () => {
    const navigate = useNavigate();

    const { data: allMinersStats, isLoading: isLoadingMinerStats } =
        useAllMinerStats();
    const { data: allPRs } = useAllMinerData();

    const handleSelectMiner = (githubId: string) => {
        navigate(`/miners/details?githubId=${githubId}`);
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
            credibility: Number(stat.credibility) || 0,
        }));
    }, [allMinersStats, githubIdToUsername]);

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

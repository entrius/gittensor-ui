import React, { useMemo } from "react";
import { Box, Card } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Page } from "../components/layout";
import { TopRepositoriesTable, SEO } from "../components";
import { useAllMinerData } from "../api";
import { CommitLog } from "../api/models/Dashboard";

const TopReposPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: allPRs, isLoading: isLoadingPRs } = useAllMinerData();

    const handleSelectRepository = (repositoryFullName: string) => {
        navigate(
            `/miners/repository?name=${encodeURIComponent(repositoryFullName)}`,
        );
    };

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
                            isLoading={isLoadingPRs}
                            onSelectRepository={handleSelectRepository}
                        />
                    </Card>
                </Box>
            </Box>
        </Page>
    );
};

export default TopReposPage;

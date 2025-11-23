import React from "react";
import { Card, Typography, Box, Grid, CircularProgress, Avatar } from "@mui/material";
import { useMinerPRs } from "../api";

interface MinerScoreCardProps {
    githubId: string;
}

const MinerScoreCard: React.FC<MinerScoreCardProps> = ({ githubId }) => {
    // Use a large lookback to get all PRs for stats calculation
    const { data: allPRs, isLoading, error } = useMinerPRs(githubId, 365);

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

    if (error || !allPRs || allPRs.length === 0) {
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

    // Calculate stats from PR data
    const totalScore = allPRs.reduce((sum, pr) => sum + parseFloat(pr.score || "0"), 0);
    const totalLinesChanged = allPRs.reduce((sum, pr) => sum + pr.additions + pr.deletions, 0);
    const uniqueRepos = new Set(allPRs.map(pr => pr.repository)).size;
    const hotkey = allPRs[0]?.hotkey || "N/A";

    const statItems = [
        { label: "Total Score", value: totalScore.toFixed(4) },
        { label: "Total PRs", value: allPRs.length },
        { label: "Hotkey", value: hotkey ? `${hotkey.substring(0, 8)}...` : "N/A" },
        { label: "Lines Changed", value: totalLinesChanged.toLocaleString() },
        { label: "Unique Repos", value: uniqueRepos },
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
                    src={`https://github.com/${githubId}.png`}
                    alt={githubId}
                    sx={{ width: 64, height: 64, border: "2px solid rgba(255, 255, 255, 0.1)" }}
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
                        Miner Stats: {githubId}
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255, 255, 255, 0.6)",
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.85rem",
                        }}
                    >
                        Statistics computed from PR history (last 365 days)
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
                            <Typography
                                sx={{
                                    color: "rgba(255, 255, 255, 0.5)",
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: "0.7rem",
                                    mb: 1,
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                    fontWeight: 600,
                                }}
                            >
                                {item.label}
                            </Typography>
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

export default MinerScoreCard;

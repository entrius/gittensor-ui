import React, { useMemo } from "react";
import {
    Card,
    Box,
    Typography,
    CircularProgress,
    Avatar,
    Grid,
} from "@mui/material";
import { useAllMinerData } from "../api";
import { CommitLog } from "../api/models/Dashboard";
import { useNavigate } from "react-router-dom";

interface PRDetailsCardProps {
    repository: string;
    pullRequestNumber: number;
}

const PRDetailsCard: React.FC<PRDetailsCardProps> = ({
    repository,
    pullRequestNumber,
}) => {
    const navigate = useNavigate();
    const { data: allPRs, isLoading } = useAllMinerData();

    // Find the specific PR from all PRs
    const prData: CommitLog | undefined = React.useMemo(() => {
        if (!Array.isArray(allPRs)) return undefined;
        return allPRs.find(
            (pr) =>
                pr.repository === repository &&
                pr.pullRequestNumber === pullRequestNumber
        );
    }, [allPRs, repository, pullRequestNumber]);

    // Calculate PR ranking among all PRs
    const prRank = useMemo(() => {
        if (!prData || !allPRs) return null;

        // Sort all PRs by score descending
        const sortedPRs = allPRs
            .slice()
            .sort((a, b) => parseFloat(b.score || "0") - parseFloat(a.score || "0"));

        // Find the rank of this specific PR
        const rank =
            sortedPRs.findIndex(
                (pr) =>
                    pr.repository === repository &&
                    pr.pullRequestNumber === pullRequestNumber
            ) + 1;

        return rank || null;
    }, [prData, allPRs, repository, pullRequestNumber]);

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

    if (!prData) {
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
                    Pull request not found.
                </Typography>
            </Card>
        );
    }

    const [owner] = repository.split("/");

    const statItems = [
        {
            label: "Score",
            value: parseFloat(prData.score || "0").toFixed(4),
            rank: prRank,
        },
        {
            label: "Additions",
            value: `+${prData.additions.toLocaleString()}`,
            rank: null,
            color: "#3fb950",
        },
        {
            label: "Deletions",
            value: `-${prData.deletions.toLocaleString()}`,
            rank: null,
            color: "#f85149",
        },
        {
            label: "Total Changes",
            value: (prData.additions + prData.deletions).toLocaleString(),
            rank: null,
        },
        {
            label: "Commits",
            value: prData.commitCount,
            rank: null,
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
            {/* PR Header */}
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                    onClick={() => navigate(`/miners/repository?name=${encodeURIComponent(repository)}`)}
                    sx={{
                        cursor: "pointer",
                        transition: "transform 0.2s",
                        "&:hover": {
                            transform: "scale(1.05)",
                        },
                    }}
                >
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
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                        <Typography
                            variant="h5"
                            sx={{
                                color: "#ffffff",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "1.3rem",
                                fontWeight: 500,
                            }}
                        >
                            #{pullRequestNumber}
                        </Typography>
                    </Box>
                    <Typography
                        sx={{
                            color: "#ffffff",
                            fontSize: "1rem",
                            fontWeight: 400,
                            mb: 0.5,
                        }}
                    >
                        {prData.pullRequestTitle}
                    </Typography>
                    <Typography
                        onClick={() => navigate(`/miners/repository?name=${encodeURIComponent(repository)}`)}
                        sx={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            transition: "color 0.2s",
                            "&:hover": {
                                color: "primary.main",
                                textDecoration: "underline",
                            },
                        }}
                    >
                        {repository}
                    </Typography>
                </Box>
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
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
                                    color: item.color || "#ffffff",
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

            {/* Additional Info */}
            <Grid container spacing={2}>
                {/* Author */}
                <Grid item xs={12} sm={6}>
                    <Box
                        sx={{
                            backgroundColor: "transparent",
                            borderRadius: 3,
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            p: 2.5,
                            height: "100%",
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
                                mb: 1.5,
                            }}
                        >
                            Author
                        </Typography>
                        <Box
                            onClick={() => navigate(`/miners/details?githubId=${prData.githubId}`)}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                cursor: "pointer",
                                "&:hover": {
                                    "& .MuiTypography-root": {
                                        color: "primary.main",
                                        textDecoration: "underline",
                                    },
                                },
                                transition: "color 0.2s",
                            }}
                        >
                            <Avatar
                                src={`https://avatars.githubusercontent.com/${prData.author}`}
                                alt={prData.author}
                                sx={{ width: 32, height: 32 }}
                            />
                            <Typography
                                sx={{
                                    color: "#ffffff",
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: "0.95rem",
                                    fontWeight: 500,
                                    transition: "color 0.2s",
                                }}
                            >
                                {prData.author}
                            </Typography>
                        </Box>
                    </Box>
                </Grid>

                {/* Merged Date */}
                <Grid item xs={12} sm={6}>
                    <Box
                        sx={{
                            backgroundColor: "transparent",
                            borderRadius: 3,
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            p: 2.5,
                            height: "100%",
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
                                mb: 1.5,
                            }}
                        >
                            Merged
                        </Typography>
                        <Typography
                            sx={{
                                color: "#ffffff",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.95rem",
                                fontWeight: 500,
                            }}
                        >
                            {new Date(prData.mergedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </Typography>
                    </Box>
                </Grid>

                {/* Hotkey */}
                {prData.hotkey && (
                    <Grid item xs={12}>
                        <Box
                            sx={{
                                backgroundColor: "transparent",
                                borderRadius: 3,
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                p: 2.5,
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
                                    mb: 1.5,
                                }}
                            >
                                Hotkey
                            </Typography>
                            <Typography
                                sx={{
                                    color: "#58a6ff",
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: "0.85rem",
                                    wordBreak: "break-all",
                                }}
                            >
                                {prData.hotkey}
                            </Typography>
                        </Box>
                    </Grid>
                )}

                {/* GitHub Link */}
                <Grid item xs={12}>
                    <Box
                        sx={{
                            backgroundColor: "transparent",
                            borderRadius: 3,
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            p: 2.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Typography
                            sx={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.85rem",
                            }}
                        >
                            View this pull request on GitHub
                        </Typography>
                        <a
                            href={`https://github.com/${repository}/pull/${pullRequestNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: "#58a6ff",
                                textDecoration: "none",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.85rem",
                                fontWeight: 500,
                            }}
                        >
                            Open →
                        </a>
                    </Box>
                </Grid>
            </Grid>
        </Card>
    );
};

export default PRDetailsCard;

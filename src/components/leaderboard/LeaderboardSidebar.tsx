import React, { useMemo } from "react";
import { Box, Stack, Typography, Avatar } from "@mui/material";
import { SectionCard } from "./SectionCard";

// Define locally or import. For now, matching MinerStats from TopMinersTable
export interface MinerStats {
    githubId: string;
    author?: string;
    totalScore: number;
    baseTotalScore: number;
    totalPRs: number;
    linesChanged: number;
    linesAdded: number;
    linesDeleted: number;
    hotkey: string;
    rank?: number;
    uniqueReposCount?: number;
    credibility?: number;
    currentTier?: string;
    usdPerDay?: number;
    totalMergedPrs?: number;
    totalOpenPrs?: number;
    totalClosedPrs?: number;
}

interface LeaderboardSidebarProps {
    miners: MinerStats[];
    onSelectMiner: (githubId: string) => void;
}

export const LeaderboardSidebar: React.FC<LeaderboardSidebarProps> = ({
    miners,
    onSelectMiner,
}) => {
    // Stats (Use original unfiltered list for stats)
    const topEarners = useMemo(
        () =>
            [...miners]
                .sort((a, b) => (b.usdPerDay || 0) - (a.usdPerDay || 0))
                .slice(0, 5),
        [miners]
    );

    const mostActive = useMemo(
        () =>
            [...miners]
                .sort((a, b) => (b.totalPRs || 0) - (a.totalPRs || 0))
                .slice(0, 5),
        [miners]
    );

    // Network Stats Data
    const networkStats = useMemo(
        () => ({
            totalMiners: miners.length,
            activeTier: miners.filter((m) => m.currentTier).length,
            totalPRs: miners.reduce((acc, m) => acc + (m.totalPRs || 0), 0),
            dailyPool: miners.reduce((acc, m) => acc + (m.usdPerDay || 0), 0),
        }),
        [miners]
    );

    return (
        <Stack spacing={2} sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
            {/* CARD 1: Network Stats */}
            <SectionCard title="Network Stats">
                <Box
                    sx={{
                        pt: 1,
                        px: 2,
                        pb: 2,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Typography sx={{ fontSize: "1rem", color: "#8b949e" }}>
                            Total Miners
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 600,
                                fontSize: "1.2rem",
                                color: "#e6edf3",
                            }}
                        >
                            {networkStats.totalMiners}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Typography sx={{ fontSize: "1rem", color: "#8b949e" }}>
                            Active Tier
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 600,
                                fontSize: "1.2rem",
                                color: "#e6edf3",
                            }}
                        >
                            {networkStats.activeTier}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Typography sx={{ fontSize: "1rem", color: "#8b949e" }}>
                            Total PRs
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 600,
                                fontSize: "1.2rem",
                                color: "#e6edf3",
                            }}
                        >
                            {networkStats.totalPRs}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Typography sx={{ fontSize: "1rem", color: "#8b949e" }}>
                            Daily Pool
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 600,
                                fontSize: "1.2rem",
                                color: "#3fb950",
                            }}
                        >
                            ${networkStats.dailyPool.toLocaleString()}
                        </Typography>
                    </Box>
                </Box>
            </SectionCard>

            {/* CARD 2: Top Earners */}
            <SectionCard title="Top Earners">
                <Box sx={{ px: 2, pb: 2 }}>
                    <Box
                        sx={{
                            display: "flex",
                            py: 1,
                            borderBottom: "1px solid rgba(48, 54, 61, 0.5)",
                            mb: 1,
                        }}
                    >
                        <Typography
                            sx={{ fontSize: "0.8rem", color: "#8b949e", width: 24 }}
                        >
                            #
                        </Typography>
                        <Typography
                            sx={{ fontSize: "0.8rem", color: "#8b949e", flex: 1 }}
                        >
                            MINER
                        </Typography>
                        <Typography sx={{ fontSize: "0.8rem", color: "#8b949e" }}>
                            $/DAY
                        </Typography>
                    </Box>
                    {topEarners.map((miner, i) => (
                        <Box
                            key={miner.hotkey}
                            onClick={() =>
                                onSelectMiner(miner.githubId || miner.author || "")
                            }
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                py: 1,
                                cursor: "pointer",
                                "&:hover": {
                                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                                    borderRadius: 1,
                                },
                            }}
                        >
                            <Typography
                                sx={{ fontSize: "1rem", color: "#8b949e", width: 24 }}
                            >
                                {i + 1}
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    flex: 1,
                                    minWidth: 0,
                                }}
                            >
                                <Avatar
                                    src={`https://avatars.githubusercontent.com/${miner.author || miner.githubId}`}
                                    sx={{ width: 20, height: 20 }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: "1rem",
                                        color: "#c9d1d9",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {miner.author || miner.githubId}
                                </Typography>
                            </Box>
                            <Typography
                                sx={{
                                    fontSize: "1.1rem",
                                    color: "#3fb950",
                                    fontFamily: '"JetBrains Mono", monospace',
                                }}
                            >
                                ${Math.round(miner.usdPerDay || 0).toLocaleString()}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </SectionCard>

            {/* CARD 3: Most Active */}
            <SectionCard title="Most Active">
                <Box sx={{ px: 2, pb: 2 }}>
                    <Box
                        sx={{
                            display: "flex",
                            py: 1,
                            borderBottom: "1px solid rgba(48, 54, 61, 0.5)",
                            mb: 1,
                        }}
                    >
                        <Typography
                            sx={{ fontSize: "0.8rem", color: "#8b949e", width: 24 }}
                        >
                            #
                        </Typography>
                        <Typography
                            sx={{ fontSize: "0.8rem", color: "#8b949e", flex: 1 }}
                        >
                            MINER
                        </Typography>
                        <Typography sx={{ fontSize: "0.8rem", color: "#8b949e" }}>
                            PRS
                        </Typography>
                    </Box>
                    {mostActive.map((miner, i) => (
                        <Box
                            key={miner.hotkey}
                            onClick={() =>
                                onSelectMiner(miner.githubId || miner.author || "")
                            }
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                py: 1,
                                cursor: "pointer",
                                "&:hover": {
                                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                                    borderRadius: 1,
                                },
                            }}
                        >
                            <Typography
                                sx={{ fontSize: "1rem", color: "#8b949e", width: 24 }}
                            >
                                {i + 1}
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    flex: 1,
                                    minWidth: 0,
                                }}
                            >
                                <Avatar
                                    src={`https://avatars.githubusercontent.com/${miner.author || miner.githubId}`}
                                    sx={{ width: 20, height: 20 }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: "1rem",
                                        color: "#c9d1d9",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {miner.author || miner.githubId}
                                </Typography>
                            </Box>
                            <Typography
                                sx={{
                                    fontSize: "1.1rem",
                                    color: "#e6edf3",
                                    fontFamily: '"JetBrains Mono", monospace',
                                }}
                            >
                                {miner.totalPRs}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </SectionCard>
        </Stack>
    );
};

import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Page } from "../components/layout";
import { MinerScoreCard, MinerPRsTable, MinerLeaderboard } from "../components";

const MinersPage: React.FC = () => {
    const [selectedMiner, setSelectedMiner] = useState<string | null>(null);

    return (
        <Page title="Miner Dashboard">
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
                {!selectedMiner ? (
                    <Box sx={{ maxWidth: 1200, width: "100%" }}>
                        <MinerLeaderboard onSelectMiner={setSelectedMiner} />
                    </Box>
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 1200, width: "100%", px: { xs: 2, sm: 2, md: 0 } }}>
                        <Button
                            startIcon={<ArrowBackIcon sx={{ fontSize: "1rem !important" }} />}
                            onClick={() => setSelectedMiner(null)}
                            sx={{
                                mb: 2,
                                alignSelf: "flex-start",
                                color: "rgba(255, 255, 255, 0.6)",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.8rem",
                                fontWeight: 500,
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                "&:hover": {
                                    color: "#ffffff",
                                    backgroundColor: "transparent"
                                },
                                pl: 0,
                            }}
                            disableRipple
                        >
                            Back to Leaderboard
                        </Button>

                        {/* Miner Score Card */}
                        <MinerScoreCard githubId={selectedMiner} />

                        {/* Miner PRs Table */}
                        <MinerPRsTable githubId={selectedMiner} />
                    </Box>
                )}
            </Box>
        </Page>
    );
};

export default MinersPage;

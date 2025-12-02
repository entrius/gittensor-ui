import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Page } from "../components/layout";
import { MinerScoreCard, MinerPRsTable, MinerLeaderboard, RepositoryDetails } from "../components";

const MinersPage: React.FC = () => {
  const [selectedMiner, setSelectedMiner] = useState<string | null>(null);
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);

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
        {!selectedMiner && !selectedRepository ? (
          <Box sx={{ maxWidth: 1200, width: "100%" }}>
            <MinerLeaderboard 
              onSelectMiner={setSelectedMiner}
              onSelectRepository={setSelectedRepository}
            />
          </Box>
        ) : selectedRepository ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              maxWidth: 1200,
              width: "100%",
              px: { xs: 2, sm: 2, md: 0 },
            }}
          >
            <Button
              startIcon={<ArrowBackIcon sx={{ fontSize: "1rem !important" }} />}
              onClick={() => setSelectedRepository(null)}
              sx={{
                mb: 2,
                alignSelf: "flex-start",
                color: "rgba(255, 255, 255, 0.7)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.8rem",
                fontWeight: 500,
                letterSpacing: "0.5px",
                textTransform: "none",
                backgroundColor: "#000000",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                px: 2,
                py: 1,
                "&:hover": {
                  color: "#ffffff",
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                },
                transition: "all 0.2s",
              }}
              disableRipple
            >
              Back to Leaderboard
            </Button>

            <RepositoryDetails repositoryFullName={selectedRepository} />
          </Box>
        ) : selectedMiner ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              maxWidth: 1200,
              width: "100%",
              px: { xs: 2, sm: 2, md: 0 },
            }}
          >
            <Button
              startIcon={<ArrowBackIcon sx={{ fontSize: "1rem !important" }} />}
              onClick={() => setSelectedMiner(null)}
              sx={{
                mb: 2,
                alignSelf: "flex-start",
                color: "rgba(255, 255, 255, 0.7)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.8rem",
                fontWeight: 500,
                letterSpacing: "0.5px",
                textTransform: "none",
                backgroundColor: "#000000",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                px: 2,
                py: 1,
                "&:hover": {
                  color: "#ffffff",
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                },
                transition: "all 0.2s",
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
        ) : null}
      </Box>
    </Page>
  );
};

export default MinersPage;

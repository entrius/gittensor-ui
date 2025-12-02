import React from "react";
import {
  Card,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Avatar,
} from "@mui/material";
import { useMinerStats, useMinerPRs } from "../api";

interface MinerScoreCardProps {
  githubId: string;
}

const MinerScoreCard: React.FC<MinerScoreCardProps> = ({ githubId }) => {
  // Use pre-computed stats from MinerEvaluations table - much faster!
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  // Fetch PRs to get username for avatar (only fetches first PR)
  const { data: prs } = useMinerPRs(githubId);
  const username = prs?.[0]?.author || githubId;

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

  if (error || !minerStats) {
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

  // Use pre-computed stats directly from the evaluation
  const statItems = [
    { label: "Current Score", value: Number(minerStats.totalScore).toFixed(4) },
    { label: "Total PRs", value: minerStats.totalPrs },
    {
      label: "Scored Lines",
      value: Number(minerStats.totalLinesChanged).toLocaleString(),
    },
    { label: "Unique Repos", value: minerStats.uniqueReposCount },
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
          src={`https://avatars.githubusercontent.com/${username}`}
          alt={username}
          sx={{
            width: 64,
            height: 64,
            border: "2px solid rgba(255, 255, 255, 0.1)",
          }}
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
            Miner Stats: {username}
          </Typography>
          <Typography
            sx={{
              color: "rgba(255, 255, 255, 0.6)",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.85rem",
            }}
          >
            {minerStats.hotkey ? minerStats.hotkey : "N/A"}
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

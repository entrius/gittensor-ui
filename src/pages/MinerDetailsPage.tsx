import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { Page } from "../components/layout";
import {
  MinerScoreCard,
  MinerRepositoriesTable,
  MinerPRsTable,
  BackButton,
  SEO,
  MinerActivity,
} from "../components";
import { useMinerGithubData } from "../api";

const MinerDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const githubId = searchParams.get("githubId");

  // If no githubId is provided, redirect to miners page
  if (!githubId) {
    navigate("/miners");
    return null;
  }

  const { data: githubData } = useMinerGithubData(githubId);

  return (
    <Page title="Miner Details">
      <SEO
        title={`Miner Stats - ${githubId}`}
        description={`View detailed statistics, contributions, and pull requests for ${githubId} on Gittensor. Track open source contributions and rewards.`}
        type="website"
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
          <BackButton to="/top-miners" />

          {/* Miner Score Card */}
          <MinerScoreCard githubId={githubId} />

          {/* Activity Graph */}
          {githubData?.login && (
            <MinerActivity username={githubData.login} />
          )}

          {/* Top Repositories */}
          <MinerRepositoriesTable githubId={githubId} />

          {/* Miner PRs Table */}
          <MinerPRsTable githubId={githubId} />
        </Box>
      </Box>
    </Page>
  );
};

export default MinerDetailsPage;

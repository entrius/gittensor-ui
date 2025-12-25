import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { Page } from "../components/layout";
import {
  RepositoryScoreCard,
  RepositoryContributorsTable,
  RepositoryPRsTable,
  BackButton,
  SEO,
} from "../components";

const RepositoryDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repo = searchParams.get("name");

  // If no repo is provided, redirect to miners page
  if (!repo) {
    navigate("/miners");
    return null;
  }

  return (
    <Page title="Repository Details">
      <SEO
        title={`Repository Stats - ${repo}`}
        description={`View detailed statistics, contributors, and pull requests for ${repo} on Gittensor. Track repository activity and open source contributions.`}
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
          <BackButton to="/top-repos" label="Back to Top Repositories" />

          {/* Repository Score Card */}
          <RepositoryScoreCard repositoryFullName={repo} />

          {/* Top Contributors */}
          <RepositoryContributorsTable repositoryFullName={repo} />

          {/* Repository PRs Table */}
          <RepositoryPRsTable repositoryFullName={repo} />
        </Box>
      </Box>
    </Page>
  );
};

export default RepositoryDetailsPage;

import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { Page } from "../components/layout";
import { PRDetailsCard, BackButton, SEO } from "../components";

const PRDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repository = searchParams.get("repo");
  const pullRequestNumber = searchParams.get("number");

  // If no repo or PR number is provided, redirect to miners page
  if (!repository || !pullRequestNumber) {
    navigate("/miners?tab=prs");
    return null;
  }

  return (
    <Page title="Pull Request Details">
      <SEO
        title={`PR #${pullRequestNumber} - ${repository}`}
        description={`View detailed statistics for pull request #${pullRequestNumber} in ${repository} on Gittensor. Track contributions, scores, and changes.`}
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
          <BackButton to="/miners?tab=prs" label="Back to Top PRs" />

          <PRDetailsCard
            repository={repository}
            pullRequestNumber={parseInt(pullRequestNumber)}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default PRDetailsPage;

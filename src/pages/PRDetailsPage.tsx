import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Page } from "../components/layout";
import { PRDetailsCard, SEO } from "../components";

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
          <Button
            startIcon={<ArrowBackIcon sx={{ fontSize: "1rem !important" }} />}
            onClick={() => navigate("/miners?tab=prs")}
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
            Back to Top PRs
          </Button>

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

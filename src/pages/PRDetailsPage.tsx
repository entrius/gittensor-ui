import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box, Tabs, Tab, CircularProgress, Typography } from "@mui/material";
import { Page } from "../components/layout";
import { PRDetailsCard, PRHeader, PRFilesChanged, BackButton, SEO, PRComments } from "../components";
import { usePullRequestDetails } from "../api";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CodeIcon from "@mui/icons-material/Code";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

const PRDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repository = searchParams.get("repo");
  const pullRequestNumber = searchParams.get("number");
  const [tabValue, setTabValue] = useState(0);

  // If no repo or PR number is provided, redirect to miners page
  if (!repository || !pullRequestNumber) {
    if (typeof window !== "undefined") {
      navigate("/miners?tab=prs");
    }
    return null;
  }

  const { data: prDetails, isLoading } = usePullRequestDetails(
    repository,
    parseInt(pullRequestNumber),
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Page title="Pull Request Details">
      <SEO
        title={`PR #${pullRequestNumber} - ${repository}`}
        description={`View detailed statistics for pull request #${pullRequestNumber} in ${repository} on Gittensor. Track contributions, scores, and changes.`}
        type="website"
      />

      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
          }}
        >
          <CircularProgress />
        </Box>
      ) : !prDetails ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography variant="h6" color="error">
            PR not found
          </Typography>
          <BackButton to="/top-prs" label="Back to Top PRs" />
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
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
              mx: "auto",
              px: { xs: 2, sm: 2, md: 0 },
            }}
          >
            <BackButton to="/top-prs" label="Back to Top PRs" />

            {/* Header always visible */}
            <PRHeader
              repository={repository}
              pullRequestNumber={parseInt(pullRequestNumber)}
              prDetails={prDetails}
            />

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="pr details tabs"
                sx={{
                  "& .MuiTab-root": {
                    color: "#8b949e",
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                    textTransform: "none",
                    fontWeight: 500,
                    minHeight: "48px",
                    fontSize: "14px",
                    "&.Mui-selected": {
                      color: "#fff",
                      fontWeight: 600,
                    },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#f78166",
                    height: "3px",
                    borderRadius: "3px 3px 0 0",
                  },
                }}
              >
                <Tab
                  label="Overview"
                  icon={<VisibilityIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                  iconPosition="start"
                />
                <Tab
                  label="Files Changed"
                  icon={<CodeIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                  iconPosition="start"
                />
                <Tab
                  label="Conversation"
                  icon={<ChatBubbleOutlineIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            {/* Content */}
            <Box sx={{ mt: 2 }}>
              {tabValue === 0 && (
                <PRDetailsCard
                  repository={repository}
                  pullRequestNumber={parseInt(pullRequestNumber)}
                  hideHeader={true}
                />
              )}
              {tabValue === 1 && (
                <PRFilesChanged
                  repository={repository}
                  pullRequestNumber={parseInt(pullRequestNumber)}
                />
              )}
              {tabValue === 2 && (
                <PRComments
                  repository={repository}
                  pullRequestNumber={parseInt(pullRequestNumber)}
                  prDetails={prDetails}
                />
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Page>
  );
};

export default PRDetailsPage;

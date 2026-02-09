/**
 * Issues Page
 *
 * 3 tabs:
 * - Available Issues: Active issues ready for solving
 * - Pending Issues: Registered issues awaiting funding
 * - History: Completed or cancelled issues
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Tabs, Tab, Stack } from "@mui/material";
import { Page } from "../components/layout";
import { SEO } from "../components";
import { IssueStats, IssuesList } from "../components/issues";
import { useIssuesStats, useIssues } from "../api";

const IssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(0);

  const statsQuery = useIssuesStats();
  const activeIssuesQuery = useIssues("active");
  const registeredIssuesQuery = useIssues("registered");
  const historyIssuesQuery = useIssues("completed,cancelled");

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Page title="Issue Bounties">
      <SEO
        title="Issue Bounties"
        description="Browse GitHub issues with Alpha bounties. Solve issues and earn rewards on Gittensor."
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: 1400,
          mx: "auto",
          px: { xs: 2, md: 3 },
        }}
      >
        <Stack spacing={3}>
          {/* Stats Header */}
          <IssueStats
            stats={statsQuery.data}
            isLoading={statsQuery.isLoading}
          />

          {/* Tabs Navigation */}
          <Box
            sx={{
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Tabs
              value={tab}
              onChange={handleTabChange}
              sx={{
                "& .MuiTab-root": {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "none",
                  color: "rgba(255, 255, 255, 0.5)",
                  minHeight: 48,
                  "&.Mui-selected": {
                    color: "#ffffff",
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#ffffff",
                  height: 2,
                },
              }}
            >
              <Tab label="Available Issues" />
              <Tab label="Pending Issues" />
              <Tab label="History" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ minHeight: 400 }}>
            {tab === 0 && (
              <IssuesList
                issues={activeIssuesQuery.data || []}
                isLoading={activeIssuesQuery.isLoading}
                listType="available"
                onSelectIssue={(id) => navigate(`/issues/details?id=${id}`)}
              />
            )}
            {tab === 1 && (
              <IssuesList
                issues={registeredIssuesQuery.data || []}
                isLoading={registeredIssuesQuery.isLoading}
                listType="pending"
                onSelectIssue={(id) => navigate(`/issues/details?id=${id}`)}
              />
            )}
            {tab === 2 && (
              <IssuesList
                issues={historyIssuesQuery.data || []}
                isLoading={historyIssuesQuery.isLoading}
                listType="history"
                onSelectIssue={(id) => navigate(`/issues/details?id=${id}`)}
              />
            )}
          </Box>
        </Stack>
      </Box>
    </Page>
  );
};

export default IssuesPage;

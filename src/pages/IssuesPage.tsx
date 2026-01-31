/**
 * Issues Page for v0 - no competitions.
 *
 * Simplified page with 3 tabs: All Issues, Available Issues, History.
 * Competition and ELO tabs have been removed.
 */
import React from "react";
import { Box, Tabs, Tab, Stack } from "@mui/material";
import { Page } from "../components/layout";
import { SEO } from "../components";
import { IssueStats, IssuesList } from "../components/issues";
import { useIssuesStats, useIssues } from "../api";

const IssuesPage: React.FC = () => {
  const [tab, setTab] = React.useState(0);

  const statsQuery = useIssuesStats();
  const allIssuesQuery = useIssues();
  const activeIssuesQuery = useIssues("active");
  const completedIssuesQuery = useIssues("completed");

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
              <Tab label="All Issues" />
              <Tab label="Available Issues" />
              <Tab label="History" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ minHeight: 400 }}>
            {tab === 0 && (
              <IssuesList
                issues={allIssuesQuery.data || []}
                isLoading={allIssuesQuery.isLoading}
                showAllStatuses
              />
            )}
            {tab === 1 && (
              <IssuesList
                issues={activeIssuesQuery.data || []}
                isLoading={activeIssuesQuery.isLoading}
              />
            )}
            {tab === 2 && (
              <IssuesList
                issues={completedIssuesQuery.data || []}
                isLoading={completedIssuesQuery.isLoading}
                showCompleted
              />
            )}
          </Box>
        </Stack>
      </Box>
    </Page>
  );
};

export default IssuesPage;

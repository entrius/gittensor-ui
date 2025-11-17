import React, { useState } from "react";
import { Box, Button, Typography, Stack } from "@mui/material";
import { Page } from "../components/layout";
import {
  IssueRegistrationModal,
  IssueStatsCards,
  BountyHistoryChart,
  FeaturedIssuesCards,
  IssuesTable,
  IssueDetailsModal,
} from "../components/issues";

const IssuesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const handleIssueClick = (issueId: string) => {
    setSelectedIssueId(issueId);
    setDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedIssueId(null);
  };

  return (
    <Page title="Issues">
      <Box
        sx={{
          width: "100%",
          height: "100%",
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {/* Header with Register Issue Button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 4,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
                mb: 1,
              }}
            >
              Issues
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255, 255, 255, 0.5)",
                maxWidth: "600px",
                lineHeight: 1.6,
              }}
            >
              Accelerate open-source development by funding critical issues with cryptocurrency bounties.
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => setModalOpen(true)}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 600,
              px: 3,
              py: 1.25,
              flexShrink: 0,
            }}
          >
            Register Issue
          </Button>
        </Box>

        {/* Dashboard Content */}
        <Stack spacing={{ xs: 3, sm: 4 }}>
          {/* KPI Summary Cards */}
          <IssueStatsCards />

          {/* Bounty History Chart */}
          <BountyHistoryChart days={30} />

          {/* Featured High-Value Issues */}
          <FeaturedIssuesCards onIssueClick={handleIssueClick} />

          {/* All Issues Table */}
          <IssuesTable onIssueClick={handleIssueClick} />
        </Stack>

        {/* Registration Modal */}
        <IssueRegistrationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />

        {/* Issue Details Modal */}
        <IssueDetailsModal
          issueId={selectedIssueId}
          open={detailsModalOpen}
          onClose={handleCloseDetails}
        />

        {/* Disclaimer */}
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.3)",
            mt: 6,
            pt: 4,
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            fontSize: "0.7rem",
          }}
        >
          * All bounty amounts are paid in Gittensor ALPHA tokens. USD values are estimates based on current token price and last known smart contract data.
        </Typography>
      </Box>
    </Page>
  );
};

export default IssuesPage;

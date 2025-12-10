import React, { useState, useEffect } from "react";
import { Box, Button, Typography, Stack, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { Page } from "../components/layout";
import {
  IssueRegistrationModal,
  IssueStatsCards,
  BountyHistoryChart,
  FeaturedIssuesCards,
  IssuesTable,
  IssueDetailsModal,
} from "../components/issues";

export type CurrencyDisplay = "usd" | "alpha";

const IssuesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyDisplay>("usd");

  // Handle ?issue=ID query parameter for shareable links
  useEffect(() => {
    const issueId = searchParams.get("issue");
    if (issueId) {
      setSelectedIssueId(issueId);
      setDetailsModalOpen(true);
    }
  }, [searchParams]);

  const handleIssueClick = (issueId: string) => {
    setSelectedIssueId(issueId);
    setDetailsModalOpen(true);
    // Update URL with issue ID for shareable links
    setSearchParams({ issue: issueId });
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedIssueId(null);
    // Remove issue param from URL
    setSearchParams({});
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
            flexWrap: "wrap",
            gap: 2,
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            {/* Currency Toggle */}
            <ToggleButtonGroup
              value={currencyDisplay}
              exclusive
              onChange={(_, value) => value && setCurrencyDisplay(value)}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "text.secondary",
                  "&.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "primary.dark",
                    },
                  },
                },
              }}
            >
              <ToggleButton value="usd">USD</ToggleButton>
              <ToggleButton value="alpha">ل ALPHA</ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              onClick={() => setModalOpen(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                px: 3,
                py: 1.25,
              }}
            >
              Register Issue
            </Button>
          </Box>
        </Box>

        {/* Dashboard Content */}
        <Stack spacing={{ xs: 3, sm: 4 }}>
          {/* KPI Summary Cards */}
          <IssueStatsCards currencyDisplay={currencyDisplay} />

          {/* Bounty History Chart */}
          <BountyHistoryChart days={30} />

          {/* Featured High-Value Issues */}
          <FeaturedIssuesCards onIssueClick={handleIssueClick} currencyDisplay={currencyDisplay} />

          {/* All Issues Table */}
          <IssuesTable onIssueClick={handleIssueClick} currencyDisplay={currencyDisplay} />
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
          * Bounties are stored in ALPHA tokens (auto-converted from TAO deposits). USD values are estimates based on current ALPHA price.
        </Typography>
      </Box>
    </Page>
  );
};

export default IssuesPage;

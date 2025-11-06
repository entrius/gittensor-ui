import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Page } from "../components/layout";
import { IssueRegistrationModal } from "../components/issues";

const IssuesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

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
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
            }}
          >
            Issues
          </Typography>
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

        {/* Placeholder for future content */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 3,
            backgroundColor: "transparent",
            p: 4,
          }}
        >
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              mb: 2,
              fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
            }}
          >
            Registered Issues
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Issue list and details will appear here
          </Typography>
        </Box>

        {/* Registration Modal */}
        <IssueRegistrationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </Box>
    </Page>
  );
};

export default IssuesPage;

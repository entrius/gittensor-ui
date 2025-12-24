import React, { useState } from "react";
import { Page } from "../components/layout";
import { SEO } from "../components";
import {
  RepositoryWeightsTable,
  LanguageWeightsTable,
} from "../components/repositories";
import { Box, Card, CardContent, Tabs, Tab } from "@mui/material";

export const RepositoriesContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <Card
        sx={{
          borderRadius: 3,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "transparent",
          maxWidth: 1200,
          width: "100%",
        }}
        elevation={0}
      >
        <Box sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              px: 2,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: "1rem",
              },
            }}
          >
            <Tab label="Repositories" />
            <Tab label="Language Weights" />
          </Tabs>
        </Box>
        <CardContent>
          {activeTab === 0 && <RepositoryWeightsTable />}
          {activeTab === 1 && <LanguageWeightsTable />}
        </CardContent>
      </Card>
    </Box>
  );
};

const RepositoriesPage: React.FC = () => {
  return (
    <Page title="Repositories">
      <SEO
        title="Repositories"
        description="Explore open source repositories on Gittensor. View weights, language distribution, and contribution opportunities."
      />
      <Box sx={{ minHeight: { xs: "auto", md: "calc(100vh - 80px)" }, py: { xs: 2, sm: 0 }, display: 'flex' }}>
        <RepositoriesContent />
      </Box>
    </Page>
  );
};

export default RepositoriesPage;

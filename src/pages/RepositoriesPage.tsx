import React, { useState } from "react";
import { Page } from "../components/layout";
import {
  RepositoryWeightsTable,
  LanguageWeightsTable,
} from "../components/repositories";
import { Box, Card, CardContent, Tabs, Tab } from "@mui/material";

const RepositoriesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Page title="Repositories">
      <Card
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          maxWidth: 1200,
          mx: "auto",
          width: "100%",
        }}
        elevation={0}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
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
    </Page>
  );
};

export default RepositoriesPage;

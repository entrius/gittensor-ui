import React from "react";
import { Box, Tabs, Tab, Typography, Card, CardContent } from "@mui/material";
import { Page } from "../components/layout";
import { SEO } from "../components";
import { useSearchParams } from "react-router-dom";
import { RoadmapContent } from "../components/onboard/RoadmapContent";
import { AboutContent } from "./AboutPage";
import { FAQContent } from "./FAQPage";

import { GettingStarted } from "../components/onboard/GettingStarted";
import { Scoring } from "../components/onboard/Scoring";
import {
  RepositoryWeightsTable,
  LanguageWeightsTable,
} from "../components/repositories";

const OnboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active tab from URL query param or default to 0
  const tabParam = searchParams.get("tab");
  const tabNameToIndex: Record<string, number> = {
    about: 0,
    "getting-started": 1,
    scoring: 2,
    repositories: 3,
    languages: 4,
    roadmap: 5,
    faq: 6,
  };

  const indexToTabName: Record<number, string> = {
    0: "about",
    1: "getting-started",
    2: "scoring",
    3: "repositories",
    4: "languages",
    5: "roadmap",
    6: "faq",
  };

  const activeTab =
    tabParam && tabNameToIndex[tabParam] !== undefined
      ? tabNameToIndex[tabParam]
      : 0;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", indexToTabName[newValue]);
    setSearchParams(newParams);
  };

  return (
    <Page title="Onboard">
      <SEO
        title="Getting Started - Gittensor"
        description="Start mining on Gittensor. Setup guide, documentation, and resources."
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: { xs: "auto", md: "calc(100vh - 80px)" },
          width: "100%",
          py: 4,
        }}
      >
        {/* Hero / Intro Section */}
        <Box sx={{ maxWidth: 800, textAlign: "center", mb: 6, px: 2 }}>
          <Typography
            variant="h3"
            fontWeight="bold"
            sx={{
              mb: 2,
              fontFamily: '"JetBrains Mono", monospace',
              background: "linear-gradient(90deg, #fff 0%, #888 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Get Paid to Code.
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 3, lineHeight: 1.6 }}
          >
            Gittensor turns open source contributions into a liquid asset. We
            incentivize developers to build, fix, and improve recognized
            repositories by rewarding merged Pull Requests with direct
            emissions.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Don't just code for free. Become a miner, solve issues, push code
            and earn rewards for the code you create.
          </Typography>
        </Box>

        <Box
          sx={{
            maxWidth: 1200,
            width: "100%",
            mb: 4,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              px: 2,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: "1rem",
                color: "rgba(255, 255, 255, 0.6)",
                "&.Mui-selected": {
                  color: "primary.main",
                },
              },
            }}
          >
            <Tab label="About" />
            <Tab label="Getting Started" />
            <Tab label="Scoring" />
            <Tab label="Repositories" />
            <Tab label="Languages" />
            <Tab label="Roadmap" />
            <Tab label="FAQ" />
          </Tabs>
        </Box>

        <Box sx={{ width: "100%" }}>
          {activeTab === 0 && <AboutContent />}
          {activeTab === 1 && <GettingStarted />}
          {activeTab === 2 && <Scoring />}
          {activeTab === 3 && (
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
                <CardContent>
                  <RepositoryWeightsTable />
                </CardContent>
              </Card>
            </Box>
          )}
          {activeTab === 4 && (
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
                <CardContent>
                  <LanguageWeightsTable />
                </CardContent>
              </Card>
            </Box>
          )}
          {activeTab === 5 && <RoadmapContent />}
          {activeTab === 6 && <FAQContent />}
        </Box>
      </Box>
    </Page>
  );
};

export default OnboardPage;

import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box, Tab, Tabs, Typography, Button, Container, Grid, Chip, Avatar } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import CodeIcon from "@mui/icons-material/Code";
import BugReportIcon from "@mui/icons-material/BugReport";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import ArticleIcon from "@mui/icons-material/Article";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import { Page } from "../components/layout";
import {
  RepositoryContributorsTable,
  RepositoryPRsTable,
  BackButton,
  SEO,
  RepositoryCodeBrowser,
  ReadmeViewer,
  RepositoryStats,
  ContributingViewer,
} from "../components";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`repo-tabpanel-${index}`}
      aria-labelledby={`repo-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 1 }}>{children}</Box>}
    </div>
  );
}

const RepositoryDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repo = searchParams.get("name");
  const [tabValue, setTabValue] = useState(0);

  const owner = repo ? repo.split('/')[0] : '';

  // If no repo is provided, redirect to miners page
  if (!repo) {
    navigate("/miners");
    return null;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Page title={`Repository - ${repo} `}>
      <SEO
        title={`Repository - ${repo} `}
        description={`View code, issues, PRs, and contributors for ${repo} on Gittensor.`}
      />

      {/* Header Section */}
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.2)" }}>
        <Container maxWidth="xl">
          <Box sx={{ pt: 3, pb: 0 }}>
            <BackButton to="/top-repos" label="Back to Repositories" />

            <Grid container spacing={4} sx={{ mt: 1, mb: 3 }} alignItems="center">
              <Grid item xs={12} md={8}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    src={`https://github.com/${owner}.png`}
                    variant="rounded"
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "4px",
                      backgroundColor: owner === "opentensor" ? "#ffffff" : owner === "bitcoin" ? "#F7931A" : "transparent"
                    }}
                  />
                  <Typography variant="h4" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#fff" }}>
                    {repo}
                  </Typography>
                  <Chip label="Public" size="small" variant="outlined" sx={{ color: "text.secondary", borderColor: "rgba(255,255,255,0.2)" }} />
                </Box>
              </Grid>
              <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                  href={`https://github.com/${repo}`}
                  target="_blank"
                  sx={{
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    "&:hover": { borderColor: "primary.main" }
                  }}
                >
                  View on GitHub
                </Button>
              </Grid>
            </Grid>

            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="repository tabs"
              sx={{
                "& .MuiTab-root": {
                  color: "#8b949e",
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                  textTransform: "none",
                  fontWeight: 500,
                  minHeight: "48px",
                  fontSize: "14px",
                  "&.Mui-selected": {
                    color: "#fff",
                    fontWeight: 600
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#f78166",
                  height: "3px",
                  borderRadius: "3px 3px 0 0"
                }
              }}
            >
              <Tab icon={<ArticleIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />} iconPosition="start" label="Readme" disableRipple />
              <Tab icon={<CodeIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />} iconPosition="start" label="Code" disableRipple />
              <Tab icon={<BugReportIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />} iconPosition="start" label="Issues" disableRipple />
              <Tab icon={<MergeTypeIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />} iconPosition="start" label="Pull Requests" disableRipple />
              <Tab icon={<VolunteerActivismIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />} iconPosition="start" label="Contributing" disableRipple />
            </Tabs>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ pb: 8, pt: 1 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={9}>
            {/* Readme Tab */}
            <CustomTabPanel value={tabValue} index={0}>
              <ReadmeViewer repositoryFullName={repo} />
            </CustomTabPanel>

            {/* Code Tab */}
            <CustomTabPanel value={tabValue} index={1}>
              <RepositoryCodeBrowser repositoryFullName={repo} />
            </CustomTabPanel>

            {/* Issues Tab */}
            <CustomTabPanel value={tabValue} index={2}>
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Issues integration is coming soon.
                </Typography>
                <Button
                  variant="contained"
                  href={`https://github.com/${repo}/issues`}
                  target="_blank"
                  sx={{ mt: 2 }}
                >
                  View Issues on GitHub
                </Button>
              </Box>
            </CustomTabPanel>

            {/* Pull Requests Tab */}
            <CustomTabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={12}>
                  <RepositoryPRsTable repositoryFullName={repo} />
                </Grid>
              </Grid>
            </CustomTabPanel>

            {/* Contributing Tab */}
            <CustomTabPanel value={tabValue} index={4}>
              <ContributingViewer repositoryFullName={repo} />
            </CustomTabPanel>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={3}>
            <Box sx={{ position: 'sticky', top: 24 }}>
              <Box sx={{ pt: 0 }}>
                {/* Repository Stats */}
                <RepositoryStats repositoryFullName={repo} />

                {/* Contributors Table - it already has its own title "Top Miner Contributors" */}
                <RepositoryContributorsTable repositoryFullName={repo} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Page>
  );
};

export default RepositoryDetailsPage;

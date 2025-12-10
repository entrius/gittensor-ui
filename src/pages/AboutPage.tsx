import React from "react";
import { Box, Stack, Typography, Grid } from "@mui/material";
import { Page } from "../components/layout";
import { SEO } from "../components";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <Box
    sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      borderRadius: 3,
      backgroundColor: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      height: "100%",
    }}
  >
    <Typography
      variant="h6"
      fontWeight="bold"
      gutterBottom
      sx={{ mb: 1.5, fontSize: { xs: "1rem", sm: "1.1rem" } }}
    >
      {title}
    </Typography>
    <Typography
      variant="body2"
      lineHeight={1.7}
      color="#ffffff"
      fontSize={{ xs: "0.875rem", sm: "0.9375rem" }}
    >
      {children}
    </Typography>
  </Box>
);

const AboutPage: React.FC = () => {
  return (
    <Page title="About">
      <SEO
        title="About Gittensor"
        description="Learn about Gittensor's mission to transform software into a global public resource. Understand how miners, validators, and the community work together."
      />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: { xs: "auto", md: "calc(100vh - 80px)" },
          width: "100%",
          py: { xs: 4, sm: 5, md: 6 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1400,
            width: "100%",
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <Grid
            container
            spacing={{ xs: 3, sm: 3, lg: 3 }}
            sx={{
              position: "relative",
            }}
          >
            {/* Row 1: Mission and How */}
            <Grid item xs={12} sm={6}>
              <Section title="Mission">
                Open source software powers the world, but its builders rarely
                receive ownership or reward for the value they create. Our mission
                is to transform software into a global public resource, accessible
                to everyone. We believe code should be treated as shared
                infrastructure (Res communes omnium), open, collective, and self
                advancing for the benefit of all.
              </Section>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Section title="How">
                Gittensor enables this mission through a permissionless software
                marketplace. Anyone can build features, fix bugs, or improve code
                in recognized repositories. If your work is accepted and merged,
                the network rewards you automatically with emissions. Incentives
                align around one metric: production ready software. The better and
                more impactful your contribution, the more you earn.
              </Section>
            </Grid>

            {/* Row 2: Miners and Validators */}
            <Grid item xs={12} sm={6}>
              <Section title="Miners">
                OSS developers make pull requests (PRs) into recognized OSS
                repositories on Github. Their goal is to get their code into the
                production branch of a repository. Their compensation (emissions)
                is then calculated based on many factors such as: PR size, files
                affected, repository popularity, number of unique repositories
                contributed to, etc...
              </Section>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Section title="Validators">
                Leverage the GitHub API to authenticate miners and verify their
                contributions to OSS repositories. Validators query miners to
                confirm GitHub Personal Access Token (PAT) ownership, analyze
                merged pull requests for quality and impact, calculate reward
                scores based on contribution metrics, and distribute alpha
                emissions across the network while maintaining system integrity.
              </Section>
            </Grid>
          </Grid>

          {/* Community Section */}
          <Box
            sx={{
              mt: { xs: 4, sm: 5, md: 6 },
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              gutterBottom
              sx={{
                mb: 2.5,
                fontSize: { xs: "1.2rem", sm: "1.3rem" },
                color: "#ffffff",
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: "0.02em",
              }}
            >
              Community
            </Typography>
            <Typography
              variant="body1"
              lineHeight={1.8}
              color="rgba(255, 255, 255, 0.9)"
              fontSize={{ xs: "0.95rem", sm: "1rem" }}
              sx={{ mb: 2 }}
            >
              Stay up to date with announcements and news in the{" "}
              <Typography
                component="a"
                href="https://docs.learnbittensor.org/resources/community-links"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: "secondary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Bittensor community
              </Typography>
              .
            </Typography>
            <Typography
              variant="body1"
              lineHeight={1.8}
              color="rgba(255, 255, 255, 0.9)"
              fontSize={{ xs: "0.95rem", sm: "1rem" }}
            >
              Review our codebase and get started mining by checking out the
              readme on our{" "}
              <Typography
                component="a"
                href="https://github.com/entrius/gittensor"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: "secondary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Github
              </Typography>
              .
            </Typography>
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default AboutPage;

import React from "react";
import { Box, Stack, Typography, Grid } from "@mui/material";
import { Page } from "../components/layout";

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
    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 1.5, fontSize: { xs: "1rem", sm: "1.1rem" } }}>
      {title}
    </Typography>
    <Typography variant="body2" lineHeight={1.7} color="#ffffff" fontSize={{ xs: "0.875rem", sm: "0.9375rem" }}>
      {children}
    </Typography>
  </Box>
);

const AboutPage: React.FC = () => {
  return (
    <Page title="About">
      <Box 
        sx={{ 
          maxWidth: 900, 
          mx: "auto", 
          width: "100%", 
          minHeight: { xs: "auto", md: "calc(100vh - 80px)" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: { xs: "visible", md: "hidden" }, 
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ maxWidth: "100%", width: "100%" }}>
          {/* Row 1: Mission (Full Width) */}
          <Grid item xs={12}>
            <Section title="Mission">
              Open source software (OSS) powers the digital world, yet developers
              often contribute without compensation. Our goal at Gittensor is to
              accelerate the development of open source software & reward developers
              for meaningful work.
            </Section>
          </Grid>

          {/* Row 2: How (Full Width) */}
          <Grid item xs={12}>
            <Section title="How">
              As a subnet within the Bittensor network, Gittensor distributes
              emissions to OSS developers (miners) whose code has been integrated &
              merged into recognized Github repositories.
            </Section>
          </Grid>

          {/* Row 3: Miners */}
          <Grid item xs={12}>
            <Section title="Miners">
              OSS developers make pull requests (PRs) into recognized OSS
              repositories on Github. Their goal is to get their code into the
              production branch of a repository. Their compensation (emissions) is
              then calculated based on many factors such as: PR size, files
              affected, repository popularity, number of unique repositories
              contributed to, etc...
            </Section>
          </Grid>
          
          {/* Row 4: Validators */}
          <Grid item xs={12}>
            <Section title="Validators">
              Leverage the GitHub API to authenticate miners and verify their
              contributions to OSS repositories. Validators query miners to confirm
              GitHub Personal Access Token (PAT) ownership, analyze merged pull
              requests for quality and impact, calculate reward scores based on
              contribution metrics, and distribute alpha emissions across the
              network while maintaining system integrity.
            </Section>
          </Grid>

          {/* Bottom Row: Community */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                gutterBottom
                sx={{ mb: 0.75, fontSize: "1rem" }}
              >
                Community
              </Typography>
              <Stack direction="row" gap={3} flexWrap="wrap">
                <Typography variant="body2" lineHeight={1.5} color="text.primary" fontSize="0.875rem">
                  Stay up to date with announcements and news in the{" "}
                  <Typography
                    component="a"
                    href="https://docs.learnbittensor.org/resources/community-links"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
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
                <Typography variant="body2" lineHeight={1.5} color="text.primary" fontSize="0.875rem">
                  Review our codebase and get started mining by checking out the
                  readme on our{" "}
                  <Typography
                    component="a"
                    href="https://github.com/entrius/gittensor"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
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
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Page>
  );
};

export default AboutPage;

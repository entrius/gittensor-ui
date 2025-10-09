import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Page } from "../components/layout";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <Box
    sx={{
      p: 3,
      borderRadius: 3,
      backgroundColor: "background.paper",
      border: "1px solid",
      borderColor: "divider",
    }}
  >
    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    <Typography variant="body1" lineHeight={1.8} color="#ffffff">
      {children}
    </Typography>
  </Box>
);

const AboutPage: React.FC = () => {
  return (
    <Page title="About">
      <Stack gap={3} sx={{ maxWidth: 900, mx: "auto", width: "100%" }}>
        <Section title="Mission">
          Open source software (OSS) powers the digital world, yet developers
          often contribute without compensation. Our goal at Gittensor is to
          accelerate the development of open source software & reward developers
          for meaningful work.
        </Section>

        <Section title="How">
          As a subnet within the Bittensor network, Gittensor distributes
          emissions to OSS developers (miners) whose code has been integrated &
          merged into recognized Github repositories.
        </Section>

        <Section title="Miners">
          OSS developers make pull requests (PRs) into recognized OSS
          repositories on Github. Their goal is to get their code into the
          production branch of a repository. Their compensation (emissions) is
          then calculated based on many factors such as: PR size, files
          affected, repository popularity, number of unique repositories
          contributed to, etc...
        </Section>

        <Section title="Validators">
          Leverage the GitHub API to authenticate miners and verify their
          contributions to OSS repositories. Validators query miners to confirm
          GitHub Personal Access Token (PAT) ownership, analyze merged pull
          requests for quality and impact, calculate reward scores based on
          contribution metrics, and distribute $TAO emissions across the network
          while maintaining system integrity.
        </Section>

        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
            gutterBottom
            sx={{ mb: 1.5 }}
          >
            Community
          </Typography>
          <Stack gap={1.5}>
            <Typography variant="body1" lineHeight={1.8} color="#ffffff">
              Stay up to date with announcements and news in the official
              Bittensor{" "}
              <Typography
                component="a"
                href="https://discord.gg/ksHbEaRczz"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: "text.primary",
                  fontWeight: 500,
                }}
              >
                discord server
              </Typography>
              .
            </Typography>
            <Typography variant="body1" lineHeight={1.8} color="#ffffff">
              Review our codebase and get started mining by checking out the
              readme on our{" "}
              <Typography
                component="a"
                href="https://github.com/entrius/gittensor"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: "text.primary",
                  fontWeight: 500,
                }}
              >
                Github
              </Typography>
              .
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Page>
  );
};

export default AboutPage;

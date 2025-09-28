import React from "react";
import { Stack, Typography } from "@mui/material";
import { Page } from "../components/layout";

const AboutPage: React.FC = () => {
  return (
    <Page title="About">
      <Stack gap={2}>
        <Stack gap={1}>
          <Typography fontWeight="bold">Mission:</Typography>
          <Typography lineHeight={2}>
            Open source software (OSS) powers the digital world, yet developers
            often contribute without compensation. Our goal is to accelerate the
            development of open source software & reward developers for
            meaningful work.
          </Typography>
        </Stack>
        <Stack gap={1}>
          <Typography fontWeight="bold">How:</Typography>
          <Typography lineHeight={2}>
            As a subnet within the Bittensor network, Gittensor distributes
            emissions to OSS developers (miners) whose code has been integrated
            & merged into recognized Github repositories.
          </Typography>
        </Stack>
        <Stack gap={1}>
          <Typography fontWeight="bold">Miners:</Typography>
          <Typography lineHeight={2}>
            OSS developers make pull requests (PRs) into recognized OSS
            repositories on Github. Their goal is to get their code into the
            production branch of a repository. Their compensation (emissions) is
            then calculated based on many factors such as: PR size, files
            affected, repository popularity, number of unique repositories
            contributed to, etc...
          </Typography>
        </Stack>
        <Stack gap={1}>
          <Typography fontWeight="bold">Validators:</Typography>
          <Typography lineHeight={2}>
            Leverage the GitHub API to authenticate miners and verify their
            contributions to OSS repositories. Validators query miners to
            confirm GitHub Personal Access Token (PAT) ownership, analyze merged
            pull requests for quality and impact, calculate reward scores based
            on contribution metrics, and distribute $TAO emissions across the
            network while maintaining system integrity.
          </Typography>
        </Stack>
        <Stack gap={1}>
          <Typography fontWeight="bold">Community:</Typography>
          <Typography lineHeight={2}>
            Stay up to date with announcements and news in the official
            Bittensor{" "}
            <Typography
              component="a"
              href="https://discord.gg/ksHbEaRczz"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                textDecoration: "none",
                color: "blue",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              discord server
            </Typography>
            .
          </Typography>
          <Typography lineHeight={2}>
            Review our codebase and get started mining by checking out the
            readme on our{" "}
            <Typography
              component="a"
              href="https://github.com/entrius/gittensor"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                textDecoration: "none",
                color: "blue",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Github
            </Typography>
            .
          </Typography>
        </Stack>
      </Stack>
    </Page>
  );
};

export default AboutPage;

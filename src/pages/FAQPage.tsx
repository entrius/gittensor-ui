import React from "react";
import { Stack, Typography } from "@mui/material";
import { Page } from "../components/layout";
import FAQ from "../components/FAQ";

const FAQPage: React.FC = () => {
  return (
    <Page title="FAQ">
      <Stack gap={3} sx={{ maxWidth: 900, mx: "auto", width: "100%" }}>
        <FAQ
          question="What is Gittensor?"
          answer="Gittensor is a subnet within the Bittensor network that rewards open source software developers for their contributions. It distributes emissions to developers whose code has been integrated and merged into recognized GitHub repositories."
        />

        <FAQ
          question="How do I start mining on Gittensor?"
          answer="To start mining, you need to make pull requests to recognized OSS repositories on GitHub. Once your code is merged into the production branch, you'll be eligible for emissions based on factors like PR size, files affected, repository popularity, and more. Check out our GitHub repository for detailed setup instructions."
        />

        <FAQ
          question="What factors determine mining rewards?"
          answer="Mining rewards are calculated based on multiple factors including: PR size, number of files affected, repository popularity, number of unique repositories contributed to, code quality, and impact of the contribution. The more meaningful and diverse your contributions, the higher your potential rewards."
        />

        <FAQ
          question="What is the role of validators?"
          answer="Validators leverage the GitHub API to authenticate miners and verify their contributions. They query miners to confirm GitHub Personal Access Token (PAT) ownership, analyze merged pull requests for quality and impact, calculate reward scores based on contribution metrics, and distribute $TAO emissions across the network."
        />

        <FAQ
          question="How do I connect my GitHub account?"
          answer={
            <>
              You'll need to create a GitHub Personal Access Token (PAT) with
              the appropriate permissions. Validators will use this to verify
              your contributions. Visit the{" "}
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
                Gittensor repository
              </Typography>{" "}
              for detailed instructions on setting up your PAT and connecting
              your account.
            </>
          }
        />

        <FAQ
          question="What repositories are eligible for mining?"
          answer="Gittensor recognizes contributions to a curated list of open source repositories. The list includes popular and impactful OSS projects across various domains. Check the repositories page or our documentation for the current list of eligible repositories."
        />

        <FAQ
          question="When are emissions distributed?"
          answer="Emissions are distributed periodically based on the Bittensor network's emission schedule. The exact timing and amount depend on your contribution quality, the network's current state, and validator consensus on reward calculations."
        />

        <FAQ
          question="How can I get help or report issues?"
          answer={
            <>
              Join the{" "}
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
              </Typography>{" "}
              to connect with other developers and get support. You can also
              open issues on our{" "}
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
                GitHub repository
              </Typography>{" "}
              for technical issues or feature requests.
            </>
          }
        />
      </Stack>
    </Page>
  );
};

export default FAQPage;

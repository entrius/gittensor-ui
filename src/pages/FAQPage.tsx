import React from "react";
import { Stack, Typography } from "@mui/material";
import { Page } from "../components/layout";
import FAQ from "../components/FAQ";

const FAQPage: React.FC = () => {
  return (
    <Page title="FAQ">
      <Stack gap={3} sx={{ maxWidth: 900, mx: "auto", width: "100%" }}>
        <FAQ
          question="What is an incentive mechanism?"
          answer="A set of rules, guidelines, and restrictions on how to judge, score, and rank a group of contestants. The goal ususally to elicit or influence a specific behavior or outcome. In the Bittensor ecosystem, this is the foundation of a subnet"
        />
        <FAQ
          question="What is a subnet?"
          answer="The implementation of an incentive mechanism with the outcome of some kind of digital asset, commodity, or service."
        />
        <FAQ
          question="What are alpha tokens?"
          answer="A subnet specific asset that is created within the Bittensor blockchain. New tokens are minted/distributed daily. It has a fluctuating price based on a subnet's liquidity pool. They also may provide utility value to the incentive mechanism or other aspects of a subnet."
        />
        <FAQ
          question="What is Gittensor?"
          answer="Gittensor is a subnet within the Bittensor network that rewards open source software developers for their contributions. It distributes emissions, in the form of alpha tokens, to developers whose code has been integrated and merged into recognized GitHub repositories."
        />
        <FAQ
          question="How do I start mining on Gittensor?"
          answer="To start mining, you need to make pull requests to recognized OSS repositories on GitHub. Once your code is merged into the production branch, you'll be eligible for emissions based on factors like PR size, files affected, repository popularity, and more. Check out our GitHub repository for detailed setup instructions."
        />
        <FAQ
          question="What repositories are eligible for mining?"
          answer="Gittensor recognizes contributions to a curated list of open source repositories. The list includes popular and impactful OSS projects across various domains. Check the repositories page for the current list of eligible repositories."
        />
      </Stack>
    </Page>
  );
};

export default FAQPage;

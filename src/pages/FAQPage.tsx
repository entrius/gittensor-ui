import React from "react";
import { Stack, Box } from "@mui/material";
import { Page } from "../components/layout";
import FAQ from "../components/FAQ";

const FAQPage: React.FC = () => {
  return (
    <Page title="FAQ">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: { xs: "auto", md: "calc(100vh - 80px)" },
          width: "100%",
          py: { xs: 2, sm: 0 },
        }}
      >
        <Stack gap={{ xs: 2, sm: 3 }} sx={{ maxWidth: 900, width: "100%" }}>
          <FAQ
            question="What is an incentive mechanism?"
            answer="A set of rules, guidelines, and restrictions on how to judge, score, and rank a group of contestants. The goal usually to elicit or influence a specific behavior or outcome. In the Bittensor ecosystem, this is the foundation of a subnet."
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
        </Stack>
      </Box>
    </Page>
  );
};

export default FAQPage;

import React from 'react';
import { Stack, Box } from '@mui/material';
import FAQ from '../FAQ';

export const FAQContent: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    }}
  >
    <Stack gap={{ xs: 2, sm: 3 }} sx={{ width: '100%', maxWidth: '100%' }}>
      <FAQ
        question="What is an incentive mechanism?"
        answer="A set of rules, guidelines, and restrictions on how to judge, score, and rank a group of contestants. The goal usually to elicit or influence a specific behavior or outcome. In the Bittensor ecosystem, this is the foundation of a subnet."
      />
      <FAQ
        question="What is a subnet?"
        answer={
          <>
            The implementation of an incentive mechanism with the outcome of
            some kind of digital asset, commodity, or service. Learn more at{' '}
            <a
              href="https://docs.learnbittensor.org/subnets/understanding-subnets"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              Understanding Subnets
            </a>
            .
          </>
        }
      />
      <FAQ
        question="What are alpha tokens?"
        answer={
          <>
            A subnet specific asset that is created within the Bittensor
            blockchain. New tokens are minted/distributed daily. It has a
            fluctuating price based on a subnet's liquidity pool. They also may
            provide utility value to the incentive mechanism or other aspects of
            a subnet. Check Gittensor's token page on{' '}
            <a
              href="https://taostats.io/subnets/74/chart"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              Taostats
            </a>
            .
          </>
        }
      />
      <FAQ
        question="What is Gittensor?"
        answer="Gittensor is subnet 74 within the Bittensor network that rewards open source software developers for their contributions. It distributes emissions, in the form of alpha tokens, to developers whose code has been integrated and merged into recognized GitHub repositories."
      />
      <FAQ
        question="How do I start mining on Gittensor?"
        answer={
          <>
            To start mining, you need to make pull requests to recognized OSS
            repositories on GitHub. Once your code is merged into the production
            branch, you'll be eligible for emissions based on factors like PR
            size, files affected, repository popularity, and more. Check out our
            GitHub repository for detailed setup instructions. Feel free to join
            the{' '}
            <a
              href="https://discord.com/invite/bittensor"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              Discord
            </a>{' '}
            and ask questions.
          </>
        }
      />
      <FAQ
        question="How are rewards calculated?"
        answer={
          <>
            Your rewards are determined by the weight of the repository you
            contribute to, the quality of your code changes (measured by
            token-based scoring), and multipliers like time decay, review
            quality, and issue bonuses. We also factor in your 'credibility',
            which is the ratio of your merged PRs to your total PR attempts
            (merged + closed). See the{' '}
            <a
              href="https://docs.gittensor.io/oss-contributions.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              scoring documentation
            </a>{' '}
            for a complete breakdown.
          </>
        }
      />
      <FAQ
        question="Do I need to stake TAO to become a miner?"
        answer={
          <>
            No, miners do not need to stake TAO to participate. However,
            registering a miner UID on the subnet requires a registration fee
            (burn) in TAO, which fluctuates based on network demand. See the{' '}
            <a
              href="https://docs.bittensor.com/miners"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              official Bittensor documentation
            </a>{' '}
            for more details.
          </>
        }
      />
      <FAQ
        question="What repositories can I contribute to?"
        answer={
          <>
            You must contribute to an incentivized repository listed in our
            master list. To become eligible for rewards, you need at least 5
            merged PRs with a token score of 5 or higher and 80% credibility.
            Check the{' '}
            <a
              href="https://docs.gittensor.io/oss-contributions.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              Scoring documentation
            </a>{' '}
            for full eligibility details.
          </>
        }
      />
    </Stack>
  </Box>
);

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CodeIcon from '@mui/icons-material/Code';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useMonthlyRewards } from '../../hooks/useMonthlyRewards';

export const AboutContent: React.FC = () => {
  const theme = useTheme();
  const monthlyRewards = useMonthlyRewards();

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          maxWidth: 1000,
          width: '100%',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {/* 1. Context: What is Gittensor? */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              mb: 3,
              color: 'text.primary',
            }}
          >
            The Marketplace for Open Source
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography
                variant="body1"
                sx={{
                  color: alpha(theme.palette.common.white, 0.8),
                  lineHeight: 1.8,
                  fontSize: '1.05rem',
                  mb: 2,
                }}
              >
                Open source software powers the world, yet its builders are
                rarely compensated for the immense value they create. Gittensor
                changes this by turning code contributions into direct, on-chain
                rewards.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: alpha(theme.palette.common.white, 0.8),
                  lineHeight: 1.8,
                  fontSize: '1.05rem',
                }}
              >
                Submit Pull Requests to whitelisted repositories and earn when
                they merge. Discover open issues that others later solve and
                earn from a separate pool. Two ways to earn, one network:{' '}
                <strong style={{ color: theme.palette.text.primary }}>
                  Code, Merge, Earn.
                </strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.common.white, 0.05)} 0%, ${alpha(theme.palette.common.white, 0.02)} 100%)`,
                  border: `1px solid ${theme.palette.border.light}`,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{ mb: 2, color: 'secondary.main' }}
                >
                  How It Works
                </Typography>
                <Stack spacing={2}>
                  {[
                    {
                      role: 'Miners (You)',
                      desc: 'Merge PRs to OSS repos and discover open issues for others to solve.',
                    },
                    {
                      role: 'Validators',
                      desc: 'Score contributions, verify merges, and set on-chain weights.',
                    },
                    {
                      role: 'The Network',
                      desc: 'Distributes emissions across two pools: OSS contributions and issue discovery.',
                    },
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: 'secondary.main',
                          mt: 1,
                        }}
                      />
                      <Box>
                        <Typography
                          variant="subtitle2"
                          fontWeight="bold"
                          color="text.primary"
                        >
                          {item.role}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.desc}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* 2. Recruitment: Why Mine? */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ mb: 4, textAlign: 'center' }}
          >
            Why Become a Miner?
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                icon: <MonetizationOnIcon fontSize="large" />,
                title: 'Direct Incentives',
                desc: monthlyRewards
                  ? `Stop coding for free. Compete for a share of the $${monthlyRewards.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )} monthly reward pool through OSS contributions or Issue Discovery.`
                  : 'Stop coding for free. Earn alpha tokens through two tracks: merge PRs to OSS repositories or discover issues for others to solve.',
              },
              {
                icon: <VerifiedUserIcon fontSize="large" />,
                title: 'On-Chain Resume',
                desc: 'Build a verifiable reputation. Your contributions are permanently recorded on-chain, creating proof of your engineering skills.',
              },
              {
                icon: <CodeIcon fontSize="large" />,
                title: 'Freedom to Build',
                desc: 'Work on your terms. No managers, no set hours. Contribute code and get paid for the value you create.',
              },
            ].map((card, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box
                  sx={{
                    p: 4,
                    height: '100%',
                    borderRadius: 4,
                    background: alpha(theme.palette.common.white, 0.02),
                    border: '1px solid',
                    borderColor: 'border.subtle',
                  }}
                >
                  <Box sx={{ color: 'secondary.main', mb: 2 }}>{card.icon}</Box>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    gutterBottom
                    sx={{ color: 'text.primary' }}
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    lineHeight={1.6}
                    color="text.secondary"
                  >
                    {card.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* 3. CTA: Check the Docs / Get Started */}
        <Box
          sx={{
            textAlign: 'center',
            p: 6,
            borderRadius: 4,
            background: `linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.common.white, 0.03)} 100%)`,
            border: `1px solid ${theme.palette.border.light}`,
            mb: 8,
          }}
        >
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
            Ready to Start earning?
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
          >
            We have prepared a comprehensive guide to help you set up your
            miner, register on the network, and make your first submission.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            href="https://docs.gittensor.io/"
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon />}
            sx={{
              px: 5,
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderRadius: '50px',
              boxShadow: `0 0 20px ${alpha(theme.palette.common.black, 0.3)}`,
              textTransform: 'none',
            }}
          >
            View Documentation & Setup Guide
          </Button>
        </Box>

        {/* Community Section (Footer) */}
        <Box
          sx={{
            mt: { xs: 4, sm: 5, md: 6 },
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.common.black, 0.3),
            border: `1px solid ${theme.palette.border.light}`,
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            gutterBottom
            sx={{
              mb: 2.5,
              fontSize: { xs: '1.2rem', sm: '1.3rem' },
              color: 'text.primary',
              letterSpacing: '0.02em',
            }}
          >
            Community
          </Typography>
          <Typography
            variant="body1"
            lineHeight={1.8}
            color={alpha(theme.palette.common.white, 0.9)}
            fontSize={{ xs: '0.95rem', sm: '1rem' }}
            sx={{ mb: 2 }}
          >
            Stay up to date with announcements and news in the{' '}
            <Typography
              component="a"
              href="https://docs.learnbittensor.org/resources/community-links"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'secondary.main',
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
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
            color={alpha(theme.palette.common.white, 0.9)}
            fontSize={{ xs: '0.95rem', sm: '1rem' }}
          >
            Review our codebase and get started mining by checking out the
            readme on our{' '}
            <Typography
              component="a"
              href="https://github.com/entrius/gittensor"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'secondary.main',
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
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
  );
};

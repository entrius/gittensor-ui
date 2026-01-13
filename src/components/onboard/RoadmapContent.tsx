import React from 'react';
import { Box, Stack, Typography, useTheme, useMediaQuery } from '@mui/material';
import {
  CurrencyExchange,
  Speed,
  SmartToy,
  AutoAwesome,
} from '@mui/icons-material';

interface RoadmapItemProps {
  title: string;
  timeframe: string;
  description: string;
  icon: React.ReactNode;
  isLast?: boolean;
  index: number;
}

const RoadmapItem: React.FC<RoadmapItemProps> = ({
  title,
  timeframe,
  description,
  icon,
  isLast,
  index,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isEven = index % 2 === 0;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: isMobile ? 'column' : isEven ? 'row' : 'row-reverse',
        alignItems: 'center',
        width: '100%',
        mb: isLast ? 0 : { xs: 6, md: 0 },
      }}
    >
      {/* Date/Timeframe - Desktop Only */}
      {!isMobile && (
        <Box
          sx={{
            width: '50%',
            textAlign: isEven ? 'right' : 'left',
            pr: isEven ? 6 : 0,
            pl: isEven ? 0 : 6,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              color: 'secondary.main',
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
            }}
          >
            {timeframe}
          </Typography>
        </Box>
      )}

      {/* Central Line & Dot */}
      <Box
        sx={{
          position: 'absolute',
          left: isMobile ? '24px' : '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            border: '2px solid',
            borderColor: 'secondary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'secondary.main',
            boxShadow: '0 0 15px rgba(255, 215, 0, 0.2)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {icon}
        </Box>
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flexGrow: 1,
              background:
                'linear-gradient(180deg, rgba(255, 215, 0, 0.5) 0%, rgba(255, 215, 0, 0.1) 100%)',
              my: 1,
            }}
          />
        )}
      </Box>

      {/* Content Card */}
      <Box
        sx={{
          width: isMobile ? 'calc(100% - 60px)' : '50%',
          ml: isMobile ? '60px' : 0,
          pl: isMobile ? 0 : isEven ? 6 : 0,
          pr: isMobile ? 0 : isEven ? 0 : 6,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            p: 3,
            borderRadius: 4,
            background:
              'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {isMobile && (
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                color: 'secondary.main',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'block',
                mb: 1,
              }}
            >
              {timeframe}
            </Typography>
          )}
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ mb: 1.5, color: '#fff' }}
          >
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" lineHeight={1.6}>
            {description}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export const RoadmapContent: React.FC = () => {
  const roadmapItems = [
    {
      title: 'Issue Bounty Marketplace',
      timeframe: 'Phase 1',
      icon: <CurrencyExchange />,
      description:
        'Users will be able to attach bounties to any GitHub issue through a secure smart contract interface. The platform will collect a small fee from each bounty, establishing a durable and scalable revenue model.',
    },
    {
      title: 'Custom Benchmark Suite',
      timeframe: 'Phase 2',
      icon: <Speed />,
      description:
        'Repository owners and organizations can upload proprietary benchmarks or evaluation criteria. Miners compete to optimize for any measurable objective, including accuracy, speed, cost efficiency, and reliability.',
    },
    {
      title: 'Code Review Agent',
      timeframe: 'Phase 3',
      icon: <SmartToy />,
      description:
        'A fully autonomous review system trained on hundreds of thousands of real merged and closed pull requests. The agent will evaluate contributions, make acceptance recommendations, and enable continuous improvement loops.',
    },
    {
      title: 'End to End Autonomy',
      timeframe: 'Future',
      icon: <AutoAwesome />,
      description:
        'The system will run itself: issues → autonomous PRs → autonomous review and merge → continuous self-improvement of real-world codebases.',
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        py: 4,
      }}
    >
      <Box sx={{ maxWidth: 1000, width: '100%', px: { xs: 2, md: 4 } }}>
        <Stack spacing={{ xs: 0, md: 0 }} sx={{ mb: 12 }}>
          {roadmapItems.map((item, index) => (
            <RoadmapItem
              key={index}
              {...item}
              index={index}
              isLast={index === roadmapItems.length - 1}
            />
          ))}
        </Stack>

        {/* Vision Section */}
        <Box
          sx={{
            p: { xs: 3, md: 6 },
            mt: 4,
            borderRadius: 4,
            background:
              'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative Elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              background:
                'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />

          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              mb: 4,
              color: '#fff',
              fontFamily: '"JetBrains Mono", monospace',
              textAlign: 'center',
            }}
          >
            The Vision
          </Typography>

          <Stack spacing={3}>
            <Typography
              variant="body1"
              lineHeight={1.6}
              color="text.secondary"
              sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}
            >
              We are creating the first permissionless marketplace for software
              development, ushering in a new economic paradigm where any entity
              can access a global talent pool. In this true meritocracy,
              software development becomes a commodity, judged solely by value
              and quality, abstracting away the distinction between human
              developers and AI agents.
            </Typography>

            <Typography
              variant="body1"
              lineHeight={1.6}
              color="text.secondary"
              sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}
            >
              By creating an open marketplace for coding tasks, we are
              redefining how software is built. This decentralized approach
              leverages collective intelligence to solve complex problems,
              offering a scalable and community-owned foundation for the future
              of software development.
            </Typography>

            <Typography
              variant="body1"
              lineHeight={1.6}
              color="text.secondary"
              sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}
            >
              We are turning the concept of "autonomous agents" into operational
              reality. Gittensor is not just a tool, it is a self-improving
              ecosystem designed to maintain and evolve real-world applications
              at a global scale.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

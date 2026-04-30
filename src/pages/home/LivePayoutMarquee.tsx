import React, { useMemo } from 'react';
import { Box, Stack, Typography, alpha, keyframes } from '@mui/material';
import { useInfiniteCommitLog, useStats } from '../../api';

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const formatRelative = (iso: string | null) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diffMs / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const LivePayoutMarquee: React.FC = () => {
  const { data: stats } = useStats();
  const { data } = useInfiniteCommitLog({ refetchInterval: 30000 });
  const taoPrice = stats?.prices?.tao?.data?.price ?? null;

  const items = useMemo(() => {
    const all = data?.pages.flat() ?? [];
    return all.filter((pr) => pr.mergedAt).slice(0, 12);
  }, [data]);

  if (items.length === 0) return null;

  const looped = [...items, ...items];

  return (
    <Box
      sx={(theme) => ({
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        ml: '-50vw',
        mr: '-50vw',
        my: { xs: 4, sm: 5 },
        py: 1.5,
        borderTop: `1px solid ${theme.palette.border.light}`,
        borderBottom: `1px solid ${theme.palette.border.light}`,
        backgroundColor: alpha(theme.palette.background.default, 0.45),
        overflow: 'hidden',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        maskImage:
          'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      })}
    >
      <Stack
        direction="row"
        spacing={4}
        sx={{
          width: 'max-content',
          animation: `${scroll} 60s linear infinite`,
          '&:hover': { animationPlayState: 'paused' },
        }}
      >
        {looped.map((pr, i) => {
          const score = parseFloat(pr.score || '0');
          const usd =
            pr.predictedUsdPerDay ??
            (pr.predictedTaoPerDay && taoPrice
              ? pr.predictedTaoPerDay * taoPrice
              : null);
          return (
            <Stack
              key={`${pr.repository}-${pr.pullRequestNumber}-${i}`}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ flexShrink: 0 }}
            >
              <Typography
                sx={(theme) => ({
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: theme.palette.diff.additions,
                })}
              >
                +{score.toFixed(2)}
              </Typography>
              <Typography
                sx={{ fontSize: '0.82rem', color: 'text.secondary' }}
              >
                {pr.author}/{pr.repository}#{pr.pullRequestNumber}
              </Typography>
              {usd && usd > 0 ? (
                <Typography
                  sx={(theme) => ({
                    fontSize: '0.72rem',
                    color: alpha(theme.palette.text.primary, 0.5),
                  })}
                >
                  ~${usd.toFixed(2)}/day
                </Typography>
              ) : null}
              <Typography
                sx={{ fontSize: '0.7rem', color: 'text.tertiary' }}
              >
                {formatRelative(pr.mergedAt || pr.prCreatedAt)}
              </Typography>
              <Box
                sx={(theme) => ({
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: alpha(theme.palette.text.primary, 0.25),
                })}
              />
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
};

export default LivePayoutMarquee;

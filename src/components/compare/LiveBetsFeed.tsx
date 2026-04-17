import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { type LiveBet } from '../../hooks/useWatchlistIntel';
import { STATUS_COLORS } from '../../theme';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
import { formatDistanceToNow } from 'date-fns';

interface LiveBetsFeedProps {
  bets: LiveBet[];
  isLoading: boolean;
}

export const LiveBetsFeed: React.FC<LiveBetsFeedProps> = ({
  bets,
  isLoading,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (bets.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            color: 'text.secondary',
          }}
        >
          No open PRs from pinned miners right now.
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.75rem',
            color: (t) => alpha(t.palette.text.primary, 0.4),
            mt: 1,
          }}
        >
          Open PRs represent live bets — positions that haven't been cashed yet.
        </Typography>
      </Box>
    );
  }

  // Group bets by repository to show collision alerts
  const byRepo = new Map<string, LiveBet[]>();
  for (const bet of bets) {
    const list = byRepo.get(bet.repository) ?? [];
    list.push(bet);
    byRepo.set(bet.repository, list);
  }

  const contested = Array.from(byRepo.entries()).filter(
    ([, list]) => list.length >= 2,
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          Live Bets ({bets.length})
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.72rem',
            color: 'text.secondary',
          }}
        >
          Open PRs from pinned miners — current positions not yet scored.
        </Typography>
      </Box>

      {/* Collision alerts */}
      {contested.length > 0 && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${alpha(STATUS_COLORS.warning, 0.3)}`,
            backgroundColor: alpha(STATUS_COLORS.warning, 0.06),
          }}
        >
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: STATUS_COLORS.warning,
              mb: 0.5,
            }}
          >
            Collision Alert
          </Typography>
          {contested.map(([repo, list]) => (
            <Typography
              key={repo}
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.68rem',
                color: 'text.secondary',
              }}
            >
              {[...new Set(list.map((b) => b.author))].join(' & ')} have open PRs in{' '}
              <Typography
                component="span"
                sx={{
                  color: STATUS_COLORS.info,
                  fontSize: 'inherit',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
                onClick={() =>
                  navigate(
                    `/miners/repository?name=${encodeURIComponent(repo)}`,
                  )
                }
              >
                {repo}
              </Typography>
            </Typography>
          ))}
        </Box>
      )}

      {/* Bet rows */}
      {bets.map((bet) => (
        <Box
          key={`${bet.githubId}-${bet.repository}-${bet.pullRequestNumber}`}
          onClick={() =>
            navigate(
              `/miners/pr?repo=${encodeURIComponent(bet.repository)}&number=${bet.pullRequestNumber}`,
            )
          }
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${theme.palette.border.light}`,
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              backgroundColor: 'surface.subtle',
              borderColor: 'border.medium',
            },
          }}
        >
          <Avatar
            src={getGithubAvatarSrc(bet.author)}
            sx={{ width: 28, height: 28, flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {bet.pullRequestTitle}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.68rem',
                  color: STATUS_COLORS.info,
                }}
              >
                {bet.repository.split('/')[1] ?? bet.repository}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                }}
              >
                {bet.prCreatedAt
                  ? formatDistanceToNow(new Date(bet.prCreatedAt), {
                      addSuffix: true,
                    })
                  : '–'}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 0.25,
              flexShrink: 0,
            }}
          >
            <Chip
              size="small"
              label={`${bet.potentialScore.toFixed(2)} pts`}
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.65rem',
                fontWeight: 700,
                height: 20,
                backgroundColor: alpha(STATUS_COLORS.info, 0.12),
                color: STATUS_COLORS.info,
              }}
            />
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.6rem',
                color: 'text.secondary',
              }}
            >
              {(bet.additions || bet.deletions)
                ? `+${bet.additions ?? 0} −${bet.deletions ?? 0}`
                : ''}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

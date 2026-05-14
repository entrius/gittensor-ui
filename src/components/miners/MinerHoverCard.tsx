import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { LinkBox } from '../common/linkBehavior';
import { getGithubAvatarSrc, parseNumber } from '../../utils/ExplorerUtils';
import { type MinerEvaluation } from '../../api/models/Dashboard';

interface MinerHoverCardProps {
  miner?: MinerEvaluation;
  /** Pre-computed rank among all miners by `totalScore`, if available. */
  rank?: number;
  /** Used when `miner` isn't present in the cache; renders a minimal fallback. */
  fallbackGithubId?: string;
  fallbackUsername?: string;
}

const StatRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 1,
    }}
  >
    <Typography
      variant="caption"
      sx={(t) => ({
        color: alpha(t.palette.text.primary, 0.55),
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      })}
    >
      {label}
    </Typography>
    <Typography
      sx={(t) => ({
        color: t.palette.text.primary,
        fontSize: '0.85rem',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      })}
    >
      {value}
    </Typography>
  </Box>
);

const formatUsdPerDay = (value: number): string =>
  value > 0 ? `$${value.toFixed(2)}/d` : '—';

const formatCredibility = (value: number): string =>
  value > 0 ? `${(value * 100).toFixed(1)}%` : '—';

const MinerHoverCard: React.FC<MinerHoverCardProps> = ({
  miner,
  rank,
  fallbackGithubId,
  fallbackUsername,
}) => {
  const theme = useTheme();

  const githubId = miner?.githubId ?? fallbackGithubId ?? '';
  const username = miner?.githubUsername ?? fallbackUsername ?? githubId;
  const href = githubId
    ? `/miners/details?githubId=${encodeURIComponent(githubId)}`
    : undefined;

  return (
    <Box
      role="dialog"
      aria-label={`${username} preview`}
      sx={{
        p: 2,
        minWidth: 260,
        maxWidth: 320,
        backgroundColor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Avatar
          src={getGithubAvatarSrc(username)}
          alt={username}
          sx={{ width: 40, height: 40 }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {username}
          </Typography>
          {typeof rank === 'number' && rank > 0 && (
            <Chip
              label={`Rank #${rank}`}
              size="small"
              sx={(t) => ({
                mt: 0.25,
                height: 20,
                fontSize: '0.65rem',
                backgroundColor: alpha(t.palette.text.primary, 0.08),
                color: t.palette.text.primary,
              })}
            />
          )}
        </Box>
      </Stack>

      {miner ? (
        <Stack spacing={0.5}>
          <StatRow
            label="Score"
            value={parseNumber(miner.totalScore).toFixed(2)}
          />
          <StatRow
            label="Credibility"
            value={formatCredibility(parseNumber(miner.credibility))}
          />
          <StatRow
            label="USD / day"
            value={formatUsdPerDay(parseNumber(miner.usdPerDay))}
          />
          <StatRow label="PRs" value={String(parseNumber(miner.totalPrs))} />
        </Stack>
      ) : (
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.78rem',
            color: alpha(theme.palette.text.primary, 0.6),
            mb: 1.5,
          }}
        >
          Not a tracked miner. View this account on GitHub for details.
        </Typography>
      )}

      {href && (
        <LinkBox
          href={href}
          sx={{
            mt: 1.5,
            display: 'inline-block',
            fontSize: '0.78rem',
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          View full profile →
        </LinkBox>
      )}
    </Box>
  );
};

export default MinerHoverCard;

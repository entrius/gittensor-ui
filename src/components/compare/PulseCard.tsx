import React from 'react';
import { Box, Card, Typography, Avatar, Tooltip, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMinerGithubData } from '../../api';
import { STATUS_COLORS } from '../../theme';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
import { credibilityColor } from '../../utils/format';
import { type MinerSnapshot, computeDelta } from '../../hooks/usePulseBoard';
import { DeltaBadge } from './DeltaBadge';
import { PinButton } from './PinButton';

interface PulseCardMiner {
  githubId: string;
  author?: string;
  totalScore: number;
  rank?: number;
  credibility: number;
  totalMergedPrs: number;
  totalSolvedIssues?: number;
  usdPerDay: number;
  isEligible?: boolean;
}

interface PulseCardProps {
  miner: PulseCardMiner;
  snapshot: MinerSnapshot | undefined;
}

interface StatRowProps {
  label: string;
  value: string;
  delta: number | null;
  invertColor?: boolean;
  deltaFormat?: (n: number) => string;
  color?: string;
  tooltip?: string;
}

const StatRow: React.FC<StatRowProps> = ({
  label,
  value,
  delta,
  invertColor,
  deltaFormat,
  color,
  tooltip,
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 0.5,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.72rem',
          color: 'text.secondary',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography
          sx={{
            fontSize: '0.82rem',
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 600,
            color: color ?? 'text.primary',
          }}
        >
          {value}
        </Typography>
        <DeltaBadge
          value={delta}
          invertColor={invertColor}
          format={deltaFormat}
        />
      </Box>
    </Box>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement="left" arrow>
        {content}
      </Tooltip>
    );
  }

  return content;
};

export const PulseCard: React.FC<PulseCardProps> = ({ miner, snapshot }) => {
  const theme = useTheme();

  const isNumericId = !miner.author || /^\d+$/.test(miner.author);
  const shouldFetch = !!miner.githubId && isNumericId;
  const { data: githubData } = useMinerGithubData(miner.githubId, shouldFetch);

  const username = githubData?.login || miner.author || miner.githubId || '';
  const avatarSrc = githubData?.avatarUrl || getGithubAvatarSrc(username);

  const sinceDate = (() => {
    if (!snapshot?.capturedAt) return null;
    const d = new Date(snapshot.capturedAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  const scoreDelta = snapshot
    ? computeDelta(miner.totalScore, snapshot.totalScore)
    : null;
  const rankDelta = snapshot
    ? computeDelta(miner.rank ?? 0, snapshot.rank)
    : null;
  const credDelta = snapshot
    ? computeDelta(miner.credibility, snapshot.credibility)
    : null;
  const prsDelta = snapshot
    ? computeDelta(miner.totalMergedPrs, snapshot.totalMergedPrs)
    : null;
  const issuesDelta = snapshot
    ? computeDelta(miner.totalSolvedIssues ?? 0, snapshot.totalSolvedIssues)
    : null;
  const usdDelta = snapshot
    ? computeDelta(miner.usdPerDay, snapshot.usdPerDay)
    : null;

  return (
    <Card
      sx={{
        p: 2,
        backgroundColor: 'background.default',
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        height: '100%',
      }}
      elevation={0}
    >
      {/* Header: Avatar + Name + Pin */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
        >
          <Avatar
            src={avatarSrc}
            sx={{
              width: 36,
              height: 36,
              border: `2px solid ${alpha(theme.palette.status.merged, 0.3)}`,
              flexShrink: 0,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {username}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'status.merged',
                }}
              >
                #{miner.rank ?? '–'}
              </Typography>
              {sinceDate && (
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    color: 'text.secondary',
                  }}
                >
                  since {sinceDate}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
        <PinButton githubId={miner.githubId} />
      </Box>

      {/* Stats */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderTop: `1px solid ${theme.palette.border.light}`,
          pt: 1,
        }}
      >
        <StatRow
          label="Score"
          value={miner.totalScore.toFixed(2)}
          delta={scoreDelta}
        />
        <StatRow
          label="Rank"
          value={`#${miner.rank ?? '–'}`}
          delta={rankDelta}
          invertColor
          deltaFormat={(n) => String(Math.round(n))}
        />
        <StatRow
          label="Credibility"
          value={`${(miner.credibility * 100).toFixed(1)}%`}
          delta={credDelta !== null ? credDelta * 100 : null}
          deltaFormat={(n) => `${n.toFixed(1)}%`}
          color={credibilityColor(miner.credibility)}
        />
        <StatRow
          label="Merged PRs"
          value={String(miner.totalMergedPrs)}
          delta={prsDelta}
          deltaFormat={(n) => String(Math.round(n))}
        />
        <StatRow
          label="Solved Issues"
          value={String(miner.totalSolvedIssues ?? 0)}
          delta={issuesDelta}
          deltaFormat={(n) => String(Math.round(n))}
        />
        <StatRow
          label="Earnings"
          value={`$${Math.round(miner.usdPerDay).toLocaleString()}/d`}
          delta={usdDelta}
          deltaFormat={(n) =>
            `$${Math.abs(n) < 1 ? n.toFixed(2) : Math.round(n).toLocaleString()}`
          }
          color={miner.usdPerDay > 0 ? STATUS_COLORS.success : undefined}
        />
      </Box>
    </Card>
  );
};

import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Avatar } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SectionCard } from './SectionCard';
import { STATUS_COLORS, scrollbarSx } from '../../theme';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
import { LinkBox } from '../common/linkBehavior';
import { type MinerStats, FONTS } from './types';
import { ActivitySidebarCards } from './ActivitySidebarCards';
import { useEligibilityFilteredMiners } from './useEligibilityFilteredMiners';

// Re-export MinerStats for backward compatibility
export type { MinerStats } from './types';

interface LeaderboardSidebarProps {
  miners: MinerStats[];
  getMinerHref: (miner: MinerStats) => string;
  linkState?: Record<string, unknown>;
  variant?: 'oss' | 'discoveries';
}

export const LeaderboardSidebar: React.FC<LeaderboardSidebarProps> = ({
  miners,
  getMinerHref,
  linkState,
  variant = 'oss',
}) => {
  // State for toggling lists
  const [leaderboardType, setLeaderboardType] = useState<'earners' | 'active'>(
    'earners',
  );

  const filteredMiners = useEligibilityFilteredMiners(miners);

  const topEarners = useMemo(
    () =>
      [...filteredMiners]
        .sort((a, b) => (b.usdPerDay || 0) - (a.usdPerDay || 0))
        .slice(0, 5),
    [filteredMiners],
  );

  const mostActive = useMemo(
    () =>
      [...filteredMiners]
        .sort((a, b) =>
          variant === 'discoveries'
            ? (b.totalIssues || 0) - (a.totalIssues || 0)
            : (b.totalPRs || 0) - (a.totalPRs || 0),
        )
        .slice(0, 5),
    [filteredMiners, variant],
  );

  return (
    <Stack
      spacing={2}
      sx={{ height: '100%', overflow: 'auto', pr: 1, ...scrollbarSx }}
    >
      <ActivitySidebarCards miners={miners} variant={variant} />

      {/* Leaderboard Lists (Tabs) */}
      <SectionCard
        title={leaderboardType === 'earners' ? 'Top Earners' : 'Most Active'}
        action={
          <LeaderboardTabs
            activeTab={leaderboardType}
            onTabChange={setLeaderboardType}
            variant={variant}
          />
        }
        sx={{ flexShrink: 0 }}
      >
        <Box sx={{ px: 2, pb: 2 }}>
          <LeaderboardHeader type={leaderboardType} variant={variant} />
          {(leaderboardType === 'earners' ? topEarners : mostActive).map(
            (miner, i) => (
              <LeaderboardRow
                key={miner.id}
                miner={miner}
                rank={i + 1}
                type={leaderboardType}
                variant={variant}
                href={getMinerHref(miner)}
                linkState={linkState}
              />
            ),
          )}
        </Box>
      </SectionCard>
    </Stack>
  );
};

interface LeaderboardTabsProps {
  activeTab: 'earners' | 'active';
  onTabChange: (tab: 'earners' | 'active') => void;
  variant?: 'oss' | 'discoveries';
}

const LeaderboardTabs: React.FC<LeaderboardTabsProps> = ({
  activeTab,
  onTabChange,
  variant = 'oss',
}) => (
  <Box
    sx={(theme) => ({
      display: 'flex',
      gap: 0.5,
      backgroundColor: theme.palette.surface.light,
      p: 0.5,
      borderRadius: 2,
    })}
  >
    {[
      { label: '$', value: 'earners' as const },
      {
        label: variant === 'discoveries' ? 'Issues' : 'PRs',
        value: 'active' as const,
      },
    ].map((option) => (
      <Box
        key={option.value}
        onClick={() => onTabChange(option.value)}
        sx={(theme) => ({
          px: 1.5,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 1.5,
          cursor: 'pointer',
          backgroundColor:
            activeTab === option.value
              ? alpha(theme.palette.text.primary, 0.15)
              : 'transparent',
          color:
            activeTab === option.value
              ? theme.palette.text.primary
              : STATUS_COLORS.open,
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: alpha(theme.palette.text.primary, 0.1),
            color: theme.palette.text.primary,
          },
        })}
      >
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {option.label}
        </Typography>
      </Box>
    ))}
  </Box>
);

interface LeaderboardHeaderProps {
  type: 'earners' | 'active';
  variant?: 'oss' | 'discoveries';
}

const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  type,
  variant = 'oss',
}) => (
  <Box
    sx={(theme) => ({
      display: 'flex',
      py: 1,
      borderBottom: `1px solid ${theme.palette.border.light}`,
      mb: 1,
    })}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: STATUS_COLORS.open,
        width: 24,
        textTransform: 'uppercase',
      }}
    >
      #
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: STATUS_COLORS.open,
        flex: 1,
        textTransform: 'uppercase',
      }}
    >
      Miner
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: STATUS_COLORS.open,
        textTransform: 'uppercase',
      }}
    >
      {type === 'earners'
        ? '$/Day'
        : variant === 'discoveries'
          ? 'Issues'
          : 'PRs'}
    </Typography>
  </Box>
);

interface LeaderboardRowProps {
  miner: MinerStats;
  rank: number;
  type: 'earners' | 'active';
  variant?: 'oss' | 'discoveries';
  href: string;
  linkState?: Record<string, unknown>;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  miner,
  rank,
  type,
  variant = 'oss',
  href,
  linkState,
}) => {
  return (
    <LinkBox
      href={href}
      linkState={linkState}
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        py: 1,
        px: 2,
        mx: -2,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: alpha(theme.palette.text.primary, 0.03),
        },
      })}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.85rem',
          color: STATUS_COLORS.open,
          width: 24,
        }}
      >
        {rank}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flex: 1,
          minWidth: 0,
        }}
      >
        <Avatar
          src={getGithubAvatarSrc(miner.author || miner.githubId)}
          sx={{ width: 20, height: 20 }}
        />
        <Typography
          sx={(theme) => ({
            fontFamily: FONTS.mono,
            fontSize: '0.85rem',
            color: theme.palette.text.tertiary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {miner.author || miner.githubId}
        </Typography>
      </Box>
      <Typography
        sx={(theme) => ({
          fontFamily: FONTS.mono,
          fontSize: '0.95rem',
          color:
            type === 'earners'
              ? STATUS_COLORS.merged
              : theme.palette.text.primary,
          fontWeight: 600,
        })}
      >
        {type === 'earners'
          ? `$${Math.round(miner.usdPerDay || 0).toLocaleString()}`
          : variant === 'discoveries'
            ? miner.totalIssues
            : miner.totalPRs}
      </Typography>
    </LinkBox>
  );
};

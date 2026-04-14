import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Avatar } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { SectionCard } from './SectionCard';
import { STATUS_COLORS } from '../../theme';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
import { type MinerStats, FONTS } from './types';

// Re-export MinerStats for backward compatibility
export type { MinerStats } from './types';

interface LeaderboardSidebarProps {
  miners: MinerStats[];
  getMinerHref: (githubId: string) => string;
  linkState?: unknown;
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

  // Stats (Use original unfiltered list for stats)
  const topEarners = useMemo(
    () =>
      [...miners]
        .sort((a, b) => (b.usdPerDay || 0) - (a.usdPerDay || 0))
        .slice(0, 5),
    [miners],
  );

  const mostActive = useMemo(
    () =>
      [...miners]
        .sort((a, b) =>
          variant === 'discoveries'
            ? (b.totalIssues || 0) - (a.totalIssues || 0)
            : (b.totalPRs || 0) - (a.totalPRs || 0),
        )
        .slice(0, 5),
    [miners, variant],
  );

  // Network Stats Data
  const networkStats = useMemo(
    () => ({
      totalMiners: miners.length,
      eligible: miners.filter((m) => m.isEligible).length,
      totalPRs: miners.reduce((acc, m) => acc + (m.totalPRs || 0), 0),
      totalIssues: miners.reduce((acc, m) => acc + (m.totalIssues || 0), 0),
      dailyPool: miners.reduce((acc, m) => acc + (m.usdPerDay || 0), 0),
    }),
    [miners],
  );

  return (
    <Stack spacing={2} sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
      {/* CARD 1: Network Stats */}
      <SectionCard title="Network Stats" sx={{ flexShrink: 0 }}>
        <Box
          sx={{
            pt: 1,
            px: 2,
            pb: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <StatRow label="Total Miners" value={networkStats.totalMiners} />
          <StatRow
            label={variant === 'discoveries' ? 'Issues Eligible' : 'Eligible'}
            value={networkStats.eligible}
          />
          <StatRow
            label={variant === 'discoveries' ? 'Total Issues' : 'Total PRs'}
            value={
              variant === 'discoveries'
                ? networkStats.totalIssues
                : networkStats.totalPRs
            }
          />
          <StatRow
            label="Daily Pool"
            value={`$${networkStats.dailyPool.toLocaleString()}`}
            valueColor={STATUS_COLORS.merged}
          />
        </Box>
      </SectionCard>

      {/* CARD 2: Leaderboard Lists (Tabs) */}
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
                href={getMinerHref(miner.githubId || miner.author || '')}
                linkState={linkState}
              />
            ),
          )}
        </Box>
      </SectionCard>
    </Stack>
  );
};

interface StatRowProps {
  label: string;
  value: number | string;
  valueColor?: string;
}

const StatRow: React.FC<StatRowProps> = ({ label, value, valueColor }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.85rem',
        color: STATUS_COLORS.open,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={(theme) => ({
        fontFamily: FONTS.mono,
        fontWeight: 600,
        fontSize: '1.1rem',
        color: valueColor ?? theme.palette.text.primary,
      })}
    >
      {value}
    </Typography>
  </Box>
);

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
  linkState?: unknown;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  miner,
  rank,
  type,
  variant = 'oss',
  href,
  linkState,
}) => (
  <Box
    component={RouterLink}
    to={href}
    state={linkState}
    sx={(theme) => ({
      display: 'flex',
      alignItems: 'center',
      py: 1,
      cursor: 'pointer',
      textDecoration: 'none',
      color: 'inherit',
      '&:hover': {
        backgroundColor: alpha(theme.palette.text.primary, 0.03),
        borderRadius: 1,
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
  </Box>
);

import React from 'react';
import { Box, Card, Typography, Avatar } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { useMinerGithubData, useMinerPRs } from '../../api';
import { CHART_COLORS, STATUS_COLORS } from '../../theme';
import { type MinerStats, FONTS } from './types';

interface MinerCardProps {
  miner: MinerStats;
  onClick: () => void;
}

export const MinerCard: React.FC<MinerCardProps> = ({ miner, onClick }) => {
  // Helper to check for numeric IDs or missing values
  const isNumericId = (val: string | undefined) => !val || /^\d+$/.test(val);

  // Fetch profile if author is missing or looks like an ID
  const shouldFetch = isNumericId(miner.author);
  const { data: githubData } = useMinerGithubData(miner.githubId, shouldFetch);
  // Also fetch PRs as fallback if github data is missing
  const { data: prs } = useMinerPRs(miner.githubId, shouldFetch);

  const username =
    githubData?.login ||
    prs?.[0]?.author ||
    (!isNumericId(miner.author) ? miner.author : miner.githubId) ||
    miner.githubId ||
    '';
  const credibilityPercent = (miner.credibility || 0) * 100;

  const isEligible = miner.isEligible ?? false;
  const borderColor = isEligible
    ? 'rgba(63, 185, 80, 0.3)'
    : 'rgba(48, 54, 61, 0.4)';

  if (!isEligible) {
    return (
      <Card
        onClick={onClick}
        sx={{
          p: 1.5,
          cursor: 'pointer',
          backgroundColor: '#000000',
          border: '1px solid rgba(48, 54, 61, 0.4)',
          borderRadius: 2,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          '&:hover': {
            backgroundColor: 'rgba(13, 17, 23, 0.8)',
            borderColor: 'rgba(110, 118, 129, 0.5)',
            transform: 'translateY(-1px)',
          },
        }}
        elevation={0}
      >
        <Avatar
          src={`https://avatars.githubusercontent.com/${username}`}
          sx={{
            width: 24,
            height: 24,
            border: '1px solid rgba(48, 54, 61, 0.5)',
            filter: 'grayscale(100%)',
            opacity: 0.7,
          }}
        />
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.9rem',
            fontWeight: 500,
            color: STATUS_COLORS.open,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {username}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#484f58',
            textTransform: 'uppercase',
            border: '1px solid rgba(48, 54, 61, 0.5)',
            borderRadius: 1,
            px: 0.75,
            py: 0.1,
          }}
        >
          Ineligible
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 1,
        backgroundColor: '#000000',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${borderColor}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        '&:hover': {
          backgroundColor: 'rgba(22, 27, 34, 0.6)',
          borderColor: 'rgba(63, 185, 80, 0.5)',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.6)',
        },
      }}
      elevation={0}
    >
      {/* Header: Identity + Rank */}
      <MinerCardHeader username={username} miner={miner} />

      {/* Main Stats: Earnings & Credibility */}
      <MinerCardStats miner={miner} credibilityPercent={credibilityPercent} />

      {/* Footer: Stats Grid */}
      <MinerCardFooter miner={miner} />
    </Card>
  );
};

interface MinerCardHeaderProps {
  username: string;
  miner: MinerStats;
}

const MinerCardHeader: React.FC<MinerCardHeaderProps> = ({
  username,
  miner,
}) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Box sx={{ position: 'relative' }}>
        <Avatar
          src={`https://avatars.githubusercontent.com/${username}`}
          sx={{
            width: 36,
            height: 36,
            border: '2px solid rgba(63, 185, 80, 0.3)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            backgroundColor: '#0d1117',
            border: '1px solid rgba(63, 185, 80, 0.3)',
            borderRadius: '4px',
            px: 0.5,
            py: 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.6rem',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            #{miner.rank}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ overflow: 'hidden' }}>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '1rem',
            fontWeight: 700,
            color: '#ffffff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {username}
        </Typography>
      </Box>
    </Box>
  </Box>
);

interface MinerCardStatsProps {
  miner: MinerStats;
  credibilityPercent: number;
}

const MinerCardStats: React.FC<MinerCardStatsProps> = ({
  miner,
  credibilityPercent,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
    }}
  >
    {/* Earnings */}
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '1.6rem',
            fontWeight: 800,
            color: STATUS_COLORS.merged,
            lineHeight: 1,
          }}
        >
          ${Math.round(miner.usdPerDay || 0).toLocaleString()}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: STATUS_COLORS.open,
          }}
        >
          /day
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          color: STATUS_COLORS.merged,
          opacity: 0.7,
          mt: 0.2,
        }}
      >
        ~${Math.round((miner.usdPerDay || 0) * 30).toLocaleString()}/mo
      </Typography>
    </Box>

    {/* Credibility Donut */}
    <Box sx={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <ReactECharts
        option={{
          backgroundColor: 'transparent',
          series: [
            {
              type: 'pie',
              radius: ['65%', '90%'],
              silent: true,
              label: { show: false },
              itemStyle: {
                borderRadius: 3,
                borderColor: 'rgba(13, 17, 23, 0.8)',
                borderWidth: 2,
              },
              data: [
                {
                  value: miner.totalMergedPrs || 0,
                  itemStyle: { color: CHART_COLORS.merged },
                },
                {
                  value: miner.totalOpenPrs || 0,
                  itemStyle: { color: CHART_COLORS.open },
                },
                {
                  value: miner.totalClosedPrs || 0,
                  itemStyle: { color: CHART_COLORS.closed },
                },
              ],
            },
          ],
        }}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'svg' }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color:
              credibilityPercent >= 80
                ? STATUS_COLORS.merged
                : STATUS_COLORS.open,
            fontWeight: 700,
          }}
        >
          {credibilityPercent.toFixed(0)}%
        </Typography>
      </Box>
    </Box>
  </Box>
);

interface MinerCardFooterProps {
  miner: MinerStats;
}

const MinerCardFooter: React.FC<MinerCardFooterProps> = ({ miner }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr auto',
      gap: 1,
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: 1.5,
      p: 1,
      alignItems: 'center',
    }}
  >
    <StatItem
      label="Merged"
      value={miner.totalMergedPrs || 0}
      color={STATUS_COLORS.merged}
    />
    <StatItem label="Open" value={miner.totalOpenPrs || 0} color="#c9d1d9" />
    <StatItem
      label="Closed"
      value={miner.totalClosedPrs || 0}
      color="#f85149"
    />
    <Box
      sx={{
        textAlign: 'right',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        pl: 1.5,
      }}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.6rem',
          color: STATUS_COLORS.open,
          textTransform: 'uppercase',
          mb: 0.2,
        }}
      >
        Score
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.9rem',
          color: '#e6edf3',
          fontWeight: 700,
        }}
      >
        {Number(miner.totalScore).toFixed(2)}
      </Typography>
    </Box>
  </Box>
);

interface StatItemProps {
  label: string;
  value: number;
  color: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color }) => (
  <Box>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.6rem',
        color: STATUS_COLORS.open,
        textTransform: 'uppercase',
        mb: 0.2,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.85rem',
        color,
        fontWeight: 600,
      }}
    >
      {value}
    </Typography>
  </Box>
);

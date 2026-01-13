import React from 'react';
import { Box, Card, Typography } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { TIER_COLORS, STATUS_COLORS, CHART_COLORS } from '../../theme';

interface TierStats {
  total: number;
  merged: number;
  open: number;
  closed: number;
  credibility: number;
  totalScore: number;
  avgScorePerMiner: number;
}

interface TierPerformanceTableProps {
  tierStats: Partial<Record<string, TierStats>>;
  maxValues: {
    total: number;
    merged: number;
    open: number;
    closed: number;
    totalScore: number;
    avgScorePerMiner: number;
  };
  getOpacity: (value: number, max: number) => string | number;
}

const TIER_ORDER = ['Gold', 'Silver', 'Bronze', 'Candidate'] as const;

const getTierColor = (tier: string): string => {
  const colors: Record<string, string> = {
    Gold: TIER_COLORS.gold,
    Silver: TIER_COLORS.silver,
    Bronze: TIER_COLORS.bronze,
    Candidate: '#ffffff',
  };
  return colors[tier] || '#ffffff';
};

const TierPerformanceTable: React.FC<TierPerformanceTableProps> = ({
  tierStats,
  maxValues,
  getOpacity,
}) => (
  <Card sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box sx={{ width: '100%', minWidth: 'fit-content' }}>
        {/* Table Header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '12% 10% 1fr 24%',
            alignItems: 'center',
            gap: { xs: 0.5, md: 1 },
            pb: 1,
            px: { xs: 0.5, md: 1 },
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Box sx={{ pl: { xs: 0.5, md: 1 } }}>
            <Typography
              variant="tableHeader"
              sx={{ fontSize: { xs: '0.6rem', md: '0.7rem' } }}
            >
              Tier
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="tableHeader"
              sx={{ fontSize: { xs: '0.6rem', md: '0.7rem' } }}
            >
              Miners
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
            }}
          >
            <Typography
              variant="tableHeader"
              sx={{
                gridColumn: 'span 4',
                textAlign: 'center',
                fontSize: { xs: '0.6rem', md: '0.7rem' },
              }}
            >
              M.O.C Ratio
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}
          >
            <Typography
              variant="tableHeader"
              sx={{
                textAlign: 'center',
                fontSize: { xs: '0.6rem', md: '0.7rem' },
              }}
            >
              Score
            </Typography>
            <Typography
              variant="tableHeader"
              sx={{
                textAlign: 'center',
                fontSize: { xs: '0.6rem', md: '0.7rem' },
              }}
            >
              Avg/Miner
            </Typography>
          </Box>
        </Box>

        {/* Table Rows */}
        {TIER_ORDER.map((tier) => {
          const stats = tierStats[tier] || {
            total: 0,
            merged: 0,
            open: 0,
            closed: 0,
            credibility: 0,
            totalScore: 0,
            avgScorePerMiner: 0,
          };
          const isCandidate = tier === 'Candidate';
          const color = getTierColor(tier);

          return (
            <TierRow
              key={tier}
              tier={tier}
              stats={stats}
              color={color}
              isCandidate={isCandidate}
              maxValues={maxValues}
              getOpacity={getOpacity}
            />
          );
        })}
      </Box>
    </Box>
  </Card>
);

interface TierRowProps {
  tier: string;
  stats: TierStats;
  color: string;
  isCandidate: boolean;
  maxValues: TierPerformanceTableProps['maxValues'];
  getOpacity: TierPerformanceTableProps['getOpacity'];
}

const TierRow: React.FC<TierRowProps> = ({
  tier,
  stats,
  color,
  isCandidate,
  maxValues,
  getOpacity,
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '12% 10% 1fr 24%',
      alignItems: 'center',
      gap: { xs: 0.5, md: 1 },
      py: { xs: 0.5, md: 0.75 },
      px: { xs: 0.5, md: 1 },
      mt: isCandidate ? 1 : 0,
      borderTop: isCandidate ? '1px solid rgba(255,255,255,0.1)' : 'none',
    }}
  >
    {/* Tier Name */}
    <Box
      sx={{
        pl: { xs: 0.5, md: 1 },
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 1.5 },
      }}
    >
      {!isCandidate && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
            boxShadow: `0 0 10px ${color}40`,
          }}
        />
      )}
      <Typography
        sx={{
          color: '#fff',
          fontSize: { xs: '0.7rem', md: '0.85rem' },
          fontWeight: 600,
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        {isCandidate ? 'Unranked' : tier}
      </Typography>
    </Box>

    {/* Miners Count */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 1,
        height: { xs: '36px', md: '48px' },
        border: '1px solid rgba(255,255,255,0.02)',
      }}
    >
      <Typography
        sx={{
          color: isCandidate
            ? 'rgba(255,255,255,0.9)'
            : `rgba(255,255,255,${getOpacity(stats.total, maxValues.total)})`,
          fontSize: { xs: '0.75rem', md: '0.9rem' },
          fontWeight: 600,
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        {stats.total}
      </Typography>
    </Box>

    {/* M.O.C Ratio */}
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 1,
        height: { xs: '36px', md: '48px' },
        alignItems: 'center',
        border: '1px solid rgba(255,255,255,0.02)',
      }}
    >
      <MiniGauge stats={stats} />
      <StatCell
        value={stats.merged}
        color={CHART_COLORS.merged}
        opacity={isCandidate ? 1 : getOpacity(stats.merged, maxValues.merged)}
      />
      <StatCell
        value={stats.open}
        color={CHART_COLORS.open}
        opacity={isCandidate ? 1 : getOpacity(stats.open, maxValues.open)}
      />
      <StatCell
        value={stats.closed}
        color={CHART_COLORS.closed}
        opacity={isCandidate ? 1 : getOpacity(stats.closed, maxValues.closed)}
      />
    </Box>

    {/* Score Group */}
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 1,
        height: { xs: '36px', md: '48px' },
        alignItems: 'center',
        border: '1px solid rgba(255,255,255,0.02)',
      }}
    >
      <StatCell
        value={stats.totalScore.toFixed(0)}
        color="#fff"
        opacity={
          isCandidate ? 0.9 : getOpacity(stats.totalScore, maxValues.totalScore)
        }
      />
      <StatCell
        value={stats.avgScorePerMiner.toFixed(1)}
        color={CHART_COLORS.merged}
        opacity={
          isCandidate
            ? 1
            : getOpacity(stats.avgScorePerMiner, maxValues.avgScorePerMiner)
        }
      />
    </Box>
  </Box>
);

const StatCell: React.FC<{
  value: number | string;
  color: string;
  opacity: string | number;
}> = ({ value, color, opacity }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Typography
      sx={{
        color:
          typeof opacity === 'number'
            ? color
            : `${color.replace(')', `,${opacity})`).replace('rgb', 'rgba')}`,
        opacity: typeof opacity === 'number' ? opacity : 1,
        fontSize: { xs: '0.7rem', md: '0.85rem' },
        fontWeight: 600,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const MiniGauge: React.FC<{ stats: TierStats }> = ({ stats }) => {
  const hasData = stats.merged + stats.closed > 0;
  const credibilityColor = !hasData
    ? 'rgba(255,255,255,0.3)'
    : stats.credibility >= 0.7
      ? CHART_COLORS.merged
      : stats.credibility >= 0.4
        ? STATUS_COLORS.warning
        : CHART_COLORS.closed;

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: hasData ? `${(stats.credibility * 100).toFixed(0)}` : 'N/A',
      left: 'center',
      top: 'middle',
      textStyle: {
        color: credibilityColor,
        fontSize: hasData ? 10 : 9,
        fontWeight: 'bold',
        fontFamily: '"JetBrains Mono", monospace',
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['65%', '80%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 1,
          borderColor: '#0d1117',
          borderWidth: 0.5,
        },
        label: { show: false },
        emphasis: { scale: false },
        labelLine: { show: false },
        data: hasData
          ? [
              {
                value: stats.merged,
                itemStyle: { color: CHART_COLORS.merged },
              },
              { value: stats.open, itemStyle: { color: CHART_COLORS.open } },
              {
                value: stats.closed,
                itemStyle: { color: CHART_COLORS.closed },
              },
            ]
          : [{ value: 1, itemStyle: { color: 'rgba(255,255,255,0.1)' } }],
      },
    ],
  };

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Box sx={{ width: { xs: 28, md: 38 }, height: { xs: 28, md: 38 } }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </Box>
    </Box>
  );
};

export default TierPerformanceTable;

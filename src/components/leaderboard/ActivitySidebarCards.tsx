import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import { SectionCard } from './SectionCard';
import {
  CHART_COLORS,
  STATUS_COLORS,
  DIFF_COLORS,
  CREDIBILITY_COLORS,
} from '../../theme';
import { credibilityColor } from '../../utils/format';
import { type MinerStats, FONTS } from './types';
import { useEligibilityFilteredMiners } from './useEligibilityFilteredMiners';

interface ActivitySidebarCardsProps {
  miners: MinerStats[];
  variant?: 'oss' | 'discoveries' | 'overview';
  defaultFilter?: 'eligible' | 'all';
  /** Content to insert between the Miners Activity card and the rest. */
  insertAfterFirstCard?: React.ReactNode;
}

interface MinerActivityStats {
  all: number;
  eligiblePr: number;
  ineligiblePr: number;
  eligibleIssue: number;
  ineligibleIssue: number;
}

interface PrActivityStats {
  merged: number;
  open: number;
  closed: number;
  mergeRate: number;
}

interface IssueActivityStats {
  solved: number;
  open: number;
  closed: number;
  solveRate: number;
}

interface CodeImpactStats {
  linesAdded: number;
  linesDeleted: number;
  reposTouched: number;
  avgCredibility: number;
}

interface FocusedActivityStats {
  eligible: number;
  ineligible: number;
  trackLabel: string;
}

interface ActivitySegment {
  label: string;
  value: number;
  color: string;
}

interface ActivityDonutCardProps {
  title: string;
  rateLabel: string;
  rate: number;
  rateColor: string;
  totalUsdPerDay: number;
  segments: ActivitySegment[];
}

const sumMinersBy = (
  miners: MinerStats[],
  getValue: (miner: MinerStats) => number | undefined,
) => miners.reduce((acc, miner) => acc + (getValue(miner) || 0), 0);

const percentOf = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const completionRate = (completed: number, closed: number) => {
  const resolved = completed + closed;
  return resolved > 0 ? Math.round((completed / resolved) * 100) : 0;
};

const rateColor = (rate: number) =>
  rate >= 80
    ? CREDIBILITY_COLORS.excellent
    : rate >= 50
      ? CREDIBILITY_COLORS.moderate
      : STATUS_COLORS.closed;

const getMinerActivityStats = (miners: MinerStats[]): MinerActivityStats => {
  const all = miners.length;
  const eligiblePr = miners.filter((m) => m.ossIsEligible).length;
  const eligibleIssue = miners.filter((m) => m.discoveriesIsEligible).length;

  return {
    all,
    eligiblePr,
    ineligiblePr: Math.max(0, all - eligiblePr),
    eligibleIssue,
    ineligibleIssue: Math.max(0, all - eligibleIssue),
  };
};

const getPrActivityStats = (miners: MinerStats[]): PrActivityStats => {
  const merged = sumMinersBy(miners, (m) => m.totalMergedPrs);
  const open = sumMinersBy(miners, (m) => m.totalOpenPrs);
  const closed = sumMinersBy(miners, (m) => m.totalClosedPrs);

  return {
    merged,
    open,
    closed,
    mergeRate: completionRate(merged, closed),
  };
};

const getIssueActivityStats = (miners: MinerStats[]): IssueActivityStats => {
  const solved = sumMinersBy(miners, (m) => m.totalSolvedIssues);
  const open = sumMinersBy(miners, (m) => m.totalOpenIssues);
  const closed = sumMinersBy(miners, (m) => m.totalClosedIssues);

  return {
    solved,
    open,
    closed,
    solveRate: completionRate(solved, closed),
  };
};

const getCodeImpactStats = (miners: MinerStats[]): CodeImpactStats => {
  const credibilityValues = miners
    .map((m) => m.credibility)
    .filter((c): c is number => typeof c === 'number');
  const avgCredibility =
    credibilityValues.length > 0
      ? Math.round(
          (credibilityValues.reduce((acc, c) => acc + c, 0) /
            credibilityValues.length) *
            100,
        )
      : 0;

  return {
    linesAdded: sumMinersBy(miners, (m) => m.linesAdded),
    linesDeleted: sumMinersBy(miners, (m) => m.linesDeleted),
    reposTouched: sumMinersBy(miners, (m) => m.uniqueReposCount),
    avgCredibility,
  };
};

const getFocusedActivityStats = (
  stats: MinerActivityStats,
  variant: 'oss' | 'discoveries',
): FocusedActivityStats =>
  variant === 'discoveries'
    ? {
        eligible: stats.eligibleIssue,
        ineligible: Math.max(0, stats.all - stats.eligibleIssue),
        trackLabel: 'Issue eligible',
      }
    : {
        eligible: stats.eligiblePr,
        ineligible: Math.max(0, stats.all - stats.eligiblePr),
        trackLabel: 'OSS eligible',
      };

const buildPrActivityCard = (
  stats: PrActivityStats,
  totalUsdPerDay: number,
): ActivityDonutCardProps => ({
  title: 'PR Activity',
  rateLabel: 'Merge Rate',
  rate: stats.mergeRate,
  rateColor: rateColor(stats.mergeRate),
  totalUsdPerDay,
  segments: [
    { label: 'Merged', value: stats.merged, color: CHART_COLORS.merged },
    { label: 'Open', value: stats.open, color: CHART_COLORS.open },
    { label: 'Closed', value: stats.closed, color: CHART_COLORS.closed },
  ],
});

const buildIssueActivityCard = (
  stats: IssueActivityStats,
  totalUsdPerDay: number,
): ActivityDonutCardProps => ({
  title: 'Issue Activity',
  rateLabel: 'Solve Rate',
  rate: stats.solveRate,
  rateColor: rateColor(stats.solveRate),
  totalUsdPerDay,
  segments: [
    { label: 'Solved', value: stats.solved, color: CHART_COLORS.merged },
    { label: 'Open', value: stats.open, color: CHART_COLORS.open },
    { label: 'Closed', value: stats.closed, color: CHART_COLORS.closed },
  ],
});

export const ActivitySidebarCards: React.FC<ActivitySidebarCardsProps> = ({
  miners: allMiners,
  variant = 'overview',
  defaultFilter = 'eligible',
  insertAfterFirstCard,
}) => {
  const miners = useEligibilityFilteredMiners(allMiners, defaultFilter);
  const minerActivityStats = useMemo(
    () => getMinerActivityStats(allMiners),
    [allMiners],
  );

  const ossUsdPerDay = useMemo(
    () =>
      miners
        .filter((m) => m.ossIsEligible)
        .reduce((acc, m) => acc + (m.usdPerDay || 0), 0),
    [miners],
  );

  const issueUsdPerDay = useMemo(
    () =>
      miners
        .filter((m) => m.discoveriesIsEligible)
        .reduce((acc, m) => acc + (m.usdPerDay || 0), 0),
    [miners],
  );

  const prStats = useMemo(() => getPrActivityStats(miners), [miners]);
  const issueStats = useMemo(() => getIssueActivityStats(miners), [miners]);
  const codeStats = useMemo(() => getCodeImpactStats(miners), [miners]);

  if (variant !== 'overview') {
    const focusedStats = getFocusedActivityStats(minerActivityStats, variant);
    const activityStats =
      variant === 'discoveries'
        ? buildIssueActivityCard(issueStats, issueUsdPerDay)
        : buildPrActivityCard(prStats, ossUsdPerDay);

    return (
      <>
        <FocusedMinersActivityCard
          total={minerActivityStats.all}
          eligible={focusedStats.eligible}
          ineligible={focusedStats.ineligible}
          trackLabel={focusedStats.trackLabel}
        />
        {insertAfterFirstCard}
        <ActivityDonutCard {...activityStats} />
      </>
    );
  }

  return (
    <>
      <OverviewMinersActivityCard stats={minerActivityStats} />
      {insertAfterFirstCard}
      <ActivityDonutCard {...buildPrActivityCard(prStats, ossUsdPerDay)} />
      <ActivityDonutCard
        {...buildIssueActivityCard(issueStats, issueUsdPerDay)}
      />
      <CodeImpactCard stats={codeStats} />
    </>
  );
};

// ── Shared sub-components ────────────────────────────────────────

export interface StatRowProps {
  label: string;
  value: number | string;
  valueColor?: string;
}

export const StatRow: React.FC<StatRowProps> = ({
  label,
  value,
  valueColor,
}) => (
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

interface FocusedMinersActivityCardProps {
  total: number;
  eligible: number;
  ineligible: number;
  trackLabel: string;
}

const FocusedMinersActivityCard: React.FC<FocusedMinersActivityCardProps> = ({
  total,
  eligible,
  ineligible,
  trackLabel,
}) => {
  const eligiblePercent = percentOf(eligible, total);

  return (
    <SectionCard title="Miners Activity" sx={{ flexShrink: 0 }}>
      <Box sx={{ px: 2, pt: 1, pb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            mb: 2,
          }}
        >
          <MinerStatusTile
            label={trackLabel}
            value={eligible}
            percent={eligiblePercent}
          />
          <MinerStatusTile
            label="Ineligible"
            value={ineligible}
            percent={Math.max(0, 100 - eligiblePercent)}
          />
        </Box>

        <StatRow label="All" value={total.toLocaleString()} />
      </Box>
    </SectionCard>
  );
};

interface MinerStatusTileProps {
  label: string;
  value: number;
  percent: number;
}

const MinerStatusTile: React.FC<MinerStatusTileProps> = ({
  label,
  value,
  percent,
}) => (
  <Box
    sx={(theme) => ({
      p: 1.15,
      borderRadius: 2,
      border: `1px solid ${theme.palette.border.light}`,
      backgroundColor: alpha(theme.palette.text.primary, 0.035),
      minWidth: 0,
    })}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.68rem',
        color: STATUS_COLORS.open,
        textTransform: 'uppercase',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        mb: 0.75,
      }}
    >
      {label}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8 }}>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'text.primary',
          lineHeight: 1,
        }}
      >
        {value.toLocaleString()}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          color: STATUS_COLORS.open,
        }}
      >
        {percent}%
      </Typography>
    </Box>
  </Box>
);

const ActivityDonutCard: React.FC<ActivityDonutCardProps> = ({
  title,
  rateLabel,
  rate,
  rateColor,
  totalUsdPerDay,
  segments,
}) => {
  const total = segments.reduce((acc, segment) => acc + segment.value, 0);

  return (
    <SectionCard title={title} sx={{ flexShrink: 0 }}>
      <Box sx={{ px: 2, pt: 1, pb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.75,
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 92,
              height: 92,
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <ReactECharts
              option={{
                backgroundColor: 'transparent',
                series: [
                  {
                    type: 'pie',
                    radius: ['65%', '90%'],
                    silent: true,
                    label: { show: false },
                    itemStyle: { borderRadius: 3, borderWidth: 0 },
                    data:
                      total > 0
                        ? segments.map((segment) => ({
                            value: segment.value,
                            itemStyle: { color: segment.color },
                          }))
                        : [
                            {
                              value: 1,
                              itemStyle: { color: 'rgba(255,255,255,0.08)' },
                            },
                          ],
                  },
                ],
              }}
              style={{ width: '100%', height: '100%' }}
              opts={{ renderer: 'svg' }}
            />
            <Box
              sx={(theme) => ({
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                color: theme.palette.text.primary,
              })}
            >
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: rateColor,
                  lineHeight: 1,
                }}
              >
                {rate}%
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.56rem',
                  color: STATUS_COLORS.open,
                  mt: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {rateLabel}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {segments.map((segment) => (
              <ActivityLegendRow key={segment.label} segment={segment} />
            ))}
          </Box>
        </Box>

        <StatRow
          label="Total $/day"
          value={`$${Math.round(totalUsdPerDay).toLocaleString()}`}
          valueColor={STATUS_COLORS.merged}
        />
      </Box>
    </SectionCard>
  );
};

const OverviewMinersActivityCard: React.FC<{ stats: MinerActivityStats }> = ({
  stats,
}) => {
  const prPercent = percentOf(stats.eligiblePr, stats.all);
  const issuePercent = percentOf(stats.eligibleIssue, stats.all);

  return (
    <SectionCard title="Miners Activity" sx={{ flexShrink: 0 }}>
      <Box sx={{ px: 2, pt: 1, pb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            mb: 2,
          }}
        >
          <MinerStatusTile
            label="OSS eligible"
            value={stats.eligiblePr}
            percent={prPercent}
          />
          <MinerStatusTile
            label="Issue eligible"
            value={stats.eligibleIssue}
            percent={issuePercent}
          />
        </Box>
        <StatRow label="All" value={stats.all.toLocaleString()} />
      </Box>
    </SectionCard>
  );
};

const CodeImpactCard: React.FC<{ stats: CodeImpactStats }> = ({ stats }) => {
  const maxLines = Math.max(stats.linesAdded, stats.linesDeleted, 1);

  return (
    <SectionCard title="Code Impact" sx={{ flexShrink: 0 }}>
      <Box
        sx={{
          px: 2,
          pt: 1,
          pb: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.6,
        }}
      >
        <ImpactBar
          label="Lines Added"
          value={`+${stats.linesAdded.toLocaleString()}`}
          percent={(stats.linesAdded / maxLines) * 100}
          color={DIFF_COLORS.additions}
        />
        <ImpactBar
          label="Lines Deleted"
          value={`-${stats.linesDeleted.toLocaleString()}`}
          percent={(stats.linesDeleted / maxLines) * 100}
          color={DIFF_COLORS.deletions}
        />
        <StatRow
          label="Repos Touched"
          value={stats.reposTouched.toLocaleString()}
        />
        <ImpactBar
          label="Avg Credibility"
          value={`${stats.avgCredibility}%`}
          percent={stats.avgCredibility}
          color={credibilityColor(stats.avgCredibility / 100)}
        />
      </Box>
    </SectionCard>
  );
};

interface ImpactBarProps {
  label: string;
  value: string;
  percent: number;
  color: string;
}

const ImpactBar: React.FC<ImpactBarProps> = ({
  label,
  value,
  percent,
  color,
}) => (
  <Box>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        mb: 0.7,
      }}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.78rem',
          color: STATUS_COLORS.open,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.9rem',
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </Typography>
    </Box>
    <Box
      sx={(theme) => ({
        height: 5,
        borderRadius: 999,
        backgroundColor: alpha(theme.palette.text.primary, 0.08),
        overflow: 'hidden',
      })}
    >
      <Box
        sx={{
          width: `${Math.min(100, Math.max(0, percent))}%`,
          height: '100%',
          borderRadius: 999,
          backgroundColor: color,
          transition: 'width 0.3s ease',
        }}
      />
    </Box>
  </Box>
);

const ActivityLegendRow: React.FC<{ segment: ActivitySegment }> = ({
  segment,
}) => (
  <Box
    sx={(theme) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1,
      py: 0.55,
      borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`,
      '&:last-of-type': { borderBottom: 'none' },
    })}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: segment.color,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.78rem',
          color: STATUS_COLORS.open,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {segment.label}
      </Typography>
    </Box>
    <Typography
      sx={(theme) => ({
        fontFamily: FONTS.mono,
        fontSize: '0.9rem',
        fontWeight: 700,
        color: theme.palette.text.primary,
      })}
    >
      {segment.value.toLocaleString()}
    </Typography>
  </Box>
);

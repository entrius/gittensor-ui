import React from 'react';
import { Skeleton, Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IssuesStats } from '../../api/models/Issues';
import KpiCard from '../KpiCard';
import { SectionCard } from '../leaderboard/SectionCard';
import { FONTS } from '../leaderboard/types';
import { formatTokenAmount, formatAlphaToUsd } from '../../utils/format';
import { usePrices } from '../../hooks/usePrices';
import { STATUS_COLORS } from '../../theme';

/** Token glyph shown with Alpha bounty amounts (matches value cells). */
const BOUNTY_ALPHA_SYMBOL = 'ل';

/** Row counts for bounty sidebar stats; merged list, aligned with `IssuesList` filter tabs. */
export interface IssueStatsTabularCounts {
  total: number;
  active: number;
  /** `registered` status (Pending tab). */
  registered: number;
  /** completed + cancelled (History tab). */
  history: number;
  /** `completed` status; green column in PR-style sidebar. */
  completed: number;
  /** `cancelled` status; red column in PR-style sidebar. */
  cancelled: number;
}

interface IssueStatsProps {
  stats?: IssuesStats;
  isLoading?: boolean;
  /** `grid` KPI tiles; `stack` issues+fund table; `sidebarDuo` Solved/Available/Cancelled triple; `sidebarFinancial` pool + payouts (Miners Activity–style table). */
  layout?: 'grid' | 'stack' | 'sidebarDuo' | 'sidebarFinancial';
  /** Merged-list counts for `sidebarDuo` / `stack`. */
  tabularCounts?: IssueStatsTabularCounts;
  /** `grid` only: four KPIs or pool+payout pair. */
  gridMetrics?: 'all' | 'financial';
}

type CardDef = {
  title: string;
  value: string | number;
  subtitle: string;
  valueColor?: string;
};

interface BountyTableRowProps {
  label: string;
  issues: number;
  fund: React.ReactNode;
  fundColor?: string;
}

/** Mirrors `ActivitySidebarCards` `PRColumn` (merged / open / closed row). */
const BountySidebarMetricColumn: React.FC<{
  label: string;
  value: number;
  color: string;
}> = ({ label, value, color }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0.5,
    }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: STATUS_COLORS.open,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.92rem',
        fontWeight: 600,
        color,
      }}
    >
      {value.toLocaleString()}
    </Typography>
  </Box>
);

/** Miners Activity–style row for `sidebarFinancial` (label + amount + USD). */
const BountyFundsActivityRow: React.FC<{
  label: string;
  alphaDisplay: React.ReactNode;
  usdDisplay: React.ReactNode;
  alphaColor?: string;
}> = ({ label, alphaDisplay, usdDisplay, alphaColor }) => (
  <Box
    sx={(theme) => ({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 1,
      alignItems: 'center',
      py: 1.1,
      borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
      '&:last-of-type': { borderBottom: 'none' },
    })}
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
      sx={(t) => ({
        fontFamily: FONTS.mono,
        fontWeight: 600,
        fontSize: '0.92rem',
        color: alphaColor ?? t.palette.text.primary,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      })}
    >
      {alphaDisplay}
    </Typography>
    <Typography
      sx={(t) => ({
        fontFamily: FONTS.mono,
        fontWeight: 500,
        fontSize: '0.9rem',
        color: alpha(t.palette.text.primary, 0.5),
        textAlign: 'center',
      })}
    >
      {usdDisplay}
    </Typography>
  </Box>
);

const BountyTableRow: React.FC<BountyTableRowProps> = ({
  label,
  issues,
  fund,
  fundColor,
}) => (
  <Box
    sx={(theme) => ({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 1,
      alignItems: 'center',
      py: 1.1,
      borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
      '&:last-of-type': { borderBottom: 'none' },
    })}
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
        color: theme.palette.text.primary,
        textAlign: 'center',
      })}
    >
      {issues.toLocaleString()}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontWeight: 600,
        fontSize: '1.1rem',
        color: fundColor ?? STATUS_COLORS.open,
        textAlign: 'center',
      }}
    >
      {fund}
    </Typography>
  </Box>
);

const IssueStats: React.FC<IssueStatsProps> = ({
  stats,
  isLoading = false,
  layout = 'grid',
  tabularCounts,
  gridMetrics = 'all',
}) => {
  const { taoPrice, alphaPrice, hasPrices } = usePrices();

  const poolStr = `${formatTokenAmount(stats?.totalBountyPool)} ${BOUNTY_ALPHA_SYMBOL}`;
  const payoutStr = `${formatTokenAmount(stats?.totalPayouts)} ${BOUNTY_ALPHA_SYMBOL}`;

  const allCards: CardDef[] = [
    {
      title: 'Total Issues',
      value: stats?.totalIssues ?? 0,
      subtitle: 'All registered issues',
    },
    {
      title: 'Available Issues',
      value: stats?.activeIssues ?? 0,
      subtitle: 'Available for solving',
    },
    {
      title: 'Bounty Pool',
      value: `${formatTokenAmount(stats?.totalBountyPool)} ${BOUNTY_ALPHA_SYMBOL}`,
      subtitle: hasPrices
        ? (formatAlphaToUsd(stats?.totalBountyPool, taoPrice, alphaPrice) ??
          'Total available')
        : 'Total available',
    },
    {
      title: 'Total Payouts',
      value: `${formatTokenAmount(stats?.totalPayouts)} ${BOUNTY_ALPHA_SYMBOL}`,
      subtitle: hasPrices
        ? (formatAlphaToUsd(stats?.totalPayouts, taoPrice, alphaPrice) ??
          'Paid to solvers')
        : 'Paid to solvers',
      valueColor: STATUS_COLORS.merged,
    },
  ];

  const cards = gridMetrics === 'financial' ? allCards.slice(2) : allCards;

  const gridSx = {
    display: 'grid',
    gridTemplateColumns:
      gridMetrics === 'financial'
        ? { xs: 'repeat(2, minmax(0, 1fr))' }
        : {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(4, minmax(0, 1fr))',
          },
    gap: 2,
    width: '100%',
  } as const;

  if (isLoading && layout === 'sidebarDuo') {
    return (
      <SectionCard title="Bounty activity" sx={{ flexShrink: 0 }}>
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
            }}
          >
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <Skeleton variant="text" width={56} height={14} />
                <Skeleton variant="text" width={40} height={28} />
              </Box>
            ))}
          </Box>
        </Box>
      </SectionCard>
    );
  }

  if (layout === 'sidebarDuo') {
    const solvedVal = tabularCounts?.completed ?? stats?.completedIssues ?? 0;
    const availableVal = tabularCounts?.active ?? stats?.activeIssues ?? 0;
    const closedVal = tabularCounts?.cancelled ?? 0;

    return (
      <SectionCard title="Bounty activity" sx={{ flexShrink: 0 }}>
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
            }}
          >
            <BountySidebarMetricColumn
              label="Solved"
              value={solvedVal}
              color={STATUS_COLORS.merged}
            />
            <BountySidebarMetricColumn
              label="Available"
              value={availableVal}
              color={STATUS_COLORS.open}
            />
            <BountySidebarMetricColumn
              label="Cancelled"
              value={closedVal}
              color={STATUS_COLORS.closed}
            />
          </Box>
        </Box>
      </SectionCard>
    );
  }

  if (isLoading && layout === 'sidebarFinancial') {
    return (
      <SectionCard title="Bounty funds" sx={{ flexShrink: 0 }}>
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
              pb: 1.5,
              mb: 1.5,
              borderBottom: `1px solid ${theme.palette.border.light}`,
            })}
          >
            <Skeleton
              variant="text"
              width="30%"
              sx={{ justifySelf: 'start' }}
            />
            <Skeleton
              variant="text"
              width="40%"
              sx={{ justifySelf: 'center' }}
            />
            <Skeleton
              variant="text"
              width="40%"
              sx={{ justifySelf: 'center' }}
            />
          </Box>
          {[1, 2].map((i) => (
            <Box
              key={i}
              sx={(theme) => ({
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 1,
                py: 1.1,
                borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
                '&:last-of-type': { borderBottom: 'none' },
              })}
            >
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="text" sx={{ mx: 'auto' }} width="55%" />
              <Skeleton variant="text" sx={{ mx: 'auto' }} width="45%" />
            </Box>
          ))}
        </Box>
      </SectionCard>
    );
  }

  if (layout === 'sidebarFinancial') {
    const poolUsdCell =
      formatAlphaToUsd(stats?.totalBountyPool, taoPrice, alphaPrice) ??
      (!hasPrices ? 'Total available' : '—');
    const payoutUsdCell =
      formatAlphaToUsd(stats?.totalPayouts, taoPrice, alphaPrice) ??
      (!hasPrices ? 'Paid to solvers' : '—');

    return (
      <SectionCard title="Bounty funds" sx={{ flexShrink: 0 }}>
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              pb: 1.5,
              borderBottom: `1px solid ${theme.palette.border.light}`,
              mb: 1.5,
            })}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: STATUS_COLORS.open,
                textTransform: 'uppercase',
              }}
            >
              &nbsp;
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: STATUS_COLORS.open,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {BOUNTY_ALPHA_SYMBOL}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: STATUS_COLORS.open,
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              USD
            </Typography>
          </Box>

          <BountyFundsActivityRow
            label="Pool"
            alphaDisplay={poolStr}
            usdDisplay={poolUsdCell}
          />
          <BountyFundsActivityRow
            label="Payouts"
            alphaDisplay={payoutStr}
            usdDisplay={payoutUsdCell}
            alphaColor={STATUS_COLORS.merged}
          />
        </Box>
      </SectionCard>
    );
  }
  if (isLoading && layout === 'stack') {
    return (
      <SectionCard title="Bounty activity" sx={{ flexShrink: 0 }}>
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
              pb: 1.5,
              mb: 1.5,
              borderBottom: `1px solid ${theme.palette.border.light}`,
            })}
          >
            <Skeleton
              variant="text"
              width="40%"
              sx={{ justifySelf: 'start' }}
            />
            <Skeleton
              variant="text"
              width="55%"
              sx={{ justifySelf: 'center' }}
            />
            <Skeleton
              variant="text"
              width="55%"
              sx={{ justifySelf: 'center' }}
            />
          </Box>
          {[1, 2, 3].map((i) => (
            <Box
              key={i}
              sx={(theme) => ({
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 1,
                py: 1.1,
                borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
                '&:last-of-type': { borderBottom: 'none' },
              })}
            >
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="text" sx={{ mx: 'auto' }} width="40%" />
              <Skeleton variant="text" sx={{ mx: 'auto' }} width="60%" />
            </Box>
          ))}
        </Box>
      </SectionCard>
    );
  }

  if (layout === 'stack') {
    const issuesAll = tabularCounts?.total ?? stats?.totalIssues ?? 0;
    const issuesLive = tabularCounts?.active ?? stats?.activeIssues ?? 0;
    const issuesHistory = tabularCounts?.history ?? stats?.completedIssues ?? 0;

    return (
      <SectionCard title="Bounty activity" sx={{ flexShrink: 0 }}>
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              pb: 1.5,
              borderBottom: `1px solid ${theme.palette.border.light}`,
              mb: 1.5,
            })}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: STATUS_COLORS.open,
                textTransform: 'uppercase',
              }}
            >
              &nbsp;
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: STATUS_COLORS.open,
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              Issues
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: STATUS_COLORS.open,
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              Fund (α)
            </Typography>
          </Box>

          <BountyTableRow label="All" issues={issuesAll} fund={poolStr} />
          <BountyTableRow label="Live" issues={issuesLive} fund="—" />
          <BountyTableRow
            label="History"
            issues={issuesHistory}
            fund={payoutStr}
            fundColor={STATUS_COLORS.merged}
          />
        </Box>
      </SectionCard>
    );
  }

  if (isLoading) {
    const skeletonCount = gridMetrics === 'financial' ? 2 : 4;
    return (
      <Box sx={gridSx}>
        {Array.from({ length: skeletonCount }, (_, i) => i + 1).map((i) => (
          <Box key={i}>
            <Box
              sx={{
                p: 2,
                backgroundColor: 'transparent',
                border: '1px solid',
                borderColor: 'border.light',
                borderRadius: 3,
              }}
            >
              <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={36} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={gridSx}>
      {cards.map((card) => (
        <Box key={card.title}>
          <KpiCard
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            sx={
              card.valueColor
                ? { '& .MuiTypography-h4': { color: card.valueColor } }
                : undefined
            }
          />
        </Box>
      ))}
    </Box>
  );
};

export default IssueStats;

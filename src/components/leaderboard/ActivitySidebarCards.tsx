import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SectionCard } from './SectionCard';
import { STATUS_COLORS, DIFF_COLORS, CREDIBILITY_COLORS } from '../../theme';
import { credibilityColor } from '../../utils/format';
import { type MinerStats, FONTS } from './types';
import { useEligibilityFilteredMiners } from './useEligibilityFilteredMiners';

interface ActivitySidebarCardsProps {
  miners: MinerStats[];
}

export const ActivitySidebarCards: React.FC<ActivitySidebarCardsProps> = ({
  miners: allMiners,
}) => {
  const miners = useEligibilityFilteredMiners(allMiners);
  const minerActivityStats = useMemo(() => {
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
  }, [miners]);

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

  const prStats = useMemo(() => {
    const merged = miners.reduce((acc, m) => acc + (m.totalMergedPrs || 0), 0);
    const open = miners.reduce((acc, m) => acc + (m.totalOpenPrs || 0), 0);
    const closed = miners.reduce((acc, m) => acc + (m.totalClosedPrs || 0), 0);
    const resolved = merged + closed;
    const mergeRate = resolved > 0 ? Math.round((merged / resolved) * 100) : 0;
    return { merged, open, closed, mergeRate };
  }, [miners]);

  const issueStats = useMemo(() => {
    const solved = miners.reduce(
      (acc, m) => acc + (m.totalSolvedIssues || 0),
      0,
    );
    const open = miners.reduce((acc, m) => acc + (m.totalOpenIssues || 0), 0);
    const closed = miners.reduce(
      (acc, m) => acc + (m.totalClosedIssues || 0),
      0,
    );
    const resolved = solved + closed;
    const solveRate = resolved > 0 ? Math.round((solved / resolved) * 100) : 0;
    return { solved, open, closed, solveRate };
  }, [miners]);

  const codeStats = useMemo(() => {
    const linesAdded = miners.reduce((acc, m) => acc + (m.linesAdded || 0), 0);
    const linesDeleted = miners.reduce(
      (acc, m) => acc + (m.linesDeleted || 0),
      0,
    );
    const reposTouched = miners.reduce(
      (acc, m) => acc + (m.uniqueReposCount || 0),
      0,
    );
    return { linesAdded, linesDeleted, reposTouched };
  }, [miners]);

  const avgCredibilityStats = useMemo(() => {
    // Match the `test` branch logic: average of provided numeric values,
    // then expressed as a percentage (0-100).
    const ossValues = miners
      .map((m) => m.credibility)
      .filter((c): c is number => typeof c === 'number');
    const discValues = miners
      .map((m) => m.issueCredibility)
      .filter((c): c is number => typeof c === 'number');

    const ossAvg =
      ossValues.length > 0
        ? Math.round(
            (ossValues.reduce((acc, c) => acc + c, 0) / ossValues.length) * 100,
          )
        : 0;
    const discAvg =
      discValues.length > 0
        ? Math.round(
            (discValues.reduce((acc, c) => acc + c, 0) / discValues.length) *
              100,
          )
        : 0;
    return { ossAvg, discAvg };
  }, [miners]);

  const solveRateColor =
    issueStats.solveRate >= 80
      ? CREDIBILITY_COLORS.excellent
      : issueStats.solveRate >= 50
        ? CREDIBILITY_COLORS.moderate
        : STATUS_COLORS.closed;

  const mergeRateColor =
    prStats.mergeRate >= 80
      ? CREDIBILITY_COLORS.excellent
      : prStats.mergeRate >= 50
        ? CREDIBILITY_COLORS.moderate
        : STATUS_COLORS.closed;

  return (
    <>
      {/* CARD 1: Miners Activity */}
      <SectionCard title="Miners Activity" sx={{ flexShrink: 0 }}>
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
              PR
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
              Issue
            </Typography>
          </Box>

          <MinerActivityRow
            label="All"
            pr={minerActivityStats.all}
            issue={minerActivityStats.all}
          />
          <MinerActivityRow
            label="Eligible"
            pr={minerActivityStats.eligiblePr}
            issue={minerActivityStats.eligibleIssue}
          />
          <MinerActivityRow
            label="Ineligible"
            pr={minerActivityStats.ineligiblePr}
            issue={minerActivityStats.ineligibleIssue}
          />
        </Box>
      </SectionCard>

      {/* CARD 2: PR Activity */}
      <SectionCard title="PR Activity" sx={{ flexShrink: 0 }}>
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
              mb: 2,
              pb: 2,
              borderBottom: `1px solid ${theme.palette.border.light}`,
            })}
          >
            <PRColumn
              label="Merged"
              value={prStats.merged}
              color={STATUS_COLORS.merged}
            />
            <PRColumn
              label="Open"
              value={prStats.open}
              color={STATUS_COLORS.open}
            />
            <PRColumn
              label="Closed"
              value={prStats.closed}
              color={STATUS_COLORS.closed}
            />
          </Box>

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
              Merge Rate
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <RateBar rate={prStats.mergeRate} color={mergeRateColor} />
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: mergeRateColor,
                  minWidth: 40,
                  textAlign: 'right',
                }}
              >
                {prStats.mergeRate}%
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1.25,
            }}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.85rem',
                color: STATUS_COLORS.open,
              }}
            >
              Avg Credibility
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <RateBar
                rate={avgCredibilityStats.ossAvg}
                color={credibilityColor(avgCredibilityStats.ossAvg / 100)}
              />
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: credibilityColor(avgCredibilityStats.ossAvg / 100),
                  minWidth: 40,
                  textAlign: 'right',
                }}
              >
                {avgCredibilityStats.ossAvg}%
              </Typography>
            </Box>
          </Box>

          <StatRow
            label="Total $/day"
            value={`$${Math.round(ossUsdPerDay).toLocaleString()}`}
            valueColor={STATUS_COLORS.merged}
          />
        </Box>
      </SectionCard>

      {/* CARD 3: Issue Activity */}
      <SectionCard title="Issue Activity" sx={{ flexShrink: 0 }}>
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
              mb: 2,
              pb: 2,
              borderBottom: `1px solid ${theme.palette.border.light}`,
            })}
          >
            <PRColumn
              label="Solved"
              value={issueStats.solved}
              color={STATUS_COLORS.merged}
            />
            <PRColumn
              label="Open"
              value={issueStats.open}
              color={STATUS_COLORS.open}
            />
            <PRColumn
              label="Closed"
              value={issueStats.closed}
              color={STATUS_COLORS.closed}
            />
          </Box>

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
              Solve Rate
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <RateBar rate={issueStats.solveRate} color={solveRateColor} />
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: solveRateColor,
                  minWidth: 40,
                  textAlign: 'right',
                }}
              >
                {issueStats.solveRate}%
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1.25,
            }}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.85rem',
                color: STATUS_COLORS.open,
              }}
            >
              Avg Credibility
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <RateBar
                rate={avgCredibilityStats.discAvg}
                color={credibilityColor(avgCredibilityStats.discAvg / 100)}
              />
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: credibilityColor(avgCredibilityStats.discAvg / 100),
                  minWidth: 40,
                  textAlign: 'right',
                }}
              >
                {avgCredibilityStats.discAvg}%
              </Typography>
            </Box>
          </Box>

          <StatRow
            label="Total $/day"
            value={`$${Math.round(issueUsdPerDay).toLocaleString()}`}
            valueColor={STATUS_COLORS.merged}
          />
        </Box>
      </SectionCard>

      {/* CARD 4: Code Impact */}
      <SectionCard title="Code Impact" sx={{ flexShrink: 0 }}>
        <Box
          sx={{
            px: 2,
            pt: 1,
            pb: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <StatRow
            label="Lines Added"
            value={`+${codeStats.linesAdded.toLocaleString()}`}
            valueColor={DIFF_COLORS.additions}
          />
          <StatRow
            label="Lines Deleted"
            value={`-${codeStats.linesDeleted.toLocaleString()}`}
            valueColor={DIFF_COLORS.deletions}
          />
          <StatRow
            label="Repos Touched"
            value={codeStats.reposTouched.toLocaleString()}
          />
        </Box>
      </SectionCard>
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

interface MinerActivityRowProps {
  label: string;
  pr: number;
  issue: number;
}

const MinerActivityRow: React.FC<MinerActivityRowProps> = ({
  label,
  pr,
  issue,
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
      {pr.toLocaleString()}
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
      {issue.toLocaleString()}
    </Typography>
  </Box>
);

interface PRColumnProps {
  label: string;
  value: number;
  color: string;
}

const PRColumn: React.FC<PRColumnProps> = ({ label, value, color }) => (
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
        fontSize: '1.1rem',
        fontWeight: 600,
        color,
      }}
    >
      {value.toLocaleString()}
    </Typography>
  </Box>
);

interface RateBarProps {
  rate: number;
  color: string;
}

const RateBar: React.FC<RateBarProps> = ({ rate, color }) => (
  <Box
    sx={(theme) => ({
      width: 64,
      height: 6,
      borderRadius: 3,
      backgroundColor: alpha(theme.palette.text.primary, 0.1),
      overflow: 'hidden',
    })}
  >
    <Box
      sx={{
        width: `${rate}%`,
        height: '100%',
        borderRadius: 3,
        backgroundColor: color,
        transition: 'width 0.4s ease',
      }}
    />
  </Box>
);

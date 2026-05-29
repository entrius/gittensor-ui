import React, { useMemo } from 'react';
import { Box, Card, Tooltip, Typography } from '@mui/material';
import { WarningAmberOutlined as WarningIcon } from '@mui/icons-material';
import {
  useMinerStats,
  useReposAndWeights,
  type MinerRepositoryEvaluation,
  type RepositoryConfig,
} from '../../api';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import {
  computeOpenPrAllowance,
  getEligibilityThresholds,
} from '../../utils/minerProgress';

interface MinerOpenPrRiskProps {
  githubId: string;
}

const toNum = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

type RiskLevel = 'over' | 'at' | 'near' | 'ok';

interface RepoRisk {
  repo: string;
  open: number;
  allowance: number;
  collateral: number;
  level: RiskLevel;
}

const RISK_META: Record<RiskLevel, { color: string; label: string }> = {
  over: { color: STATUS_COLORS.error, label: 'Over limit' },
  at: { color: STATUS_COLORS.warningOrange, label: 'At limit' },
  near: { color: STATUS_COLORS.warning, label: '1 slot left' },
  ok: { color: STATUS_COLORS.success, label: 'Healthy' },
};

const levelFor = (open: number, allowance: number): RiskLevel => {
  if (open > allowance) return 'over';
  if (open === allowance) return 'at';
  if (allowance - open <= 1) return 'near';
  return 'ok';
};

const RISK_ORDER: Record<RiskLevel, number> = {
  over: 0,
  at: 1,
  near: 2,
  ok: 3,
};

/**
 * Open-PR risk monitor. Open PRs withhold collateral and, once a miner exceeds
 * a repo's open-PR allowance, that repo's contribution score is zeroed. This
 * surfaces both so a miner can keep their open queue inside the safe band.
 *
 * The allowance grows with lifetime token score
 * (`base + floor(tokenScore / perSlot)`, capped) — see `computeOpenPrAllowance`.
 * Renders nothing when the miner has no open PRs.
 */
const MinerOpenPrRisk: React.FC<MinerOpenPrRiskProps> = ({ githubId }) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: repos } = useReposAndWeights();

  const configByRepo = useMemo(() => {
    const map = new Map<string, RepositoryConfig>();
    (repos ?? []).forEach((r) => map.set(r.fullName.toLowerCase(), r.config));
    return map;
  }, [repos]);

  const { rows, totalOpen, totalCollateral } = useMemo(() => {
    const evals: MinerRepositoryEvaluation[] = (
      minerStats?.repositories ?? []
    ).filter((r) => r.repositoryFullName.trim().length > 0);

    const built: RepoRisk[] = [];
    let open = 0;
    let collateral = 0;
    for (const r of evals) {
      const repoOpen = toNum(r.totalOpenPrs);
      collateral += toNum(r.totalCollateralScore);
      if (repoOpen <= 0) continue;
      open += repoOpen;
      const thresholds = getEligibilityThresholds(
        configByRepo.get(r.repositoryFullName.toLowerCase()),
      );
      const allowance = computeOpenPrAllowance(
        toNum(r.totalTokenScore),
        thresholds,
      );
      built.push({
        repo: r.repositoryFullName,
        open: repoOpen,
        allowance,
        collateral: toNum(r.totalCollateralScore),
        level: levelFor(repoOpen, allowance),
      });
    }
    built.sort(
      (a, b) => RISK_ORDER[a.level] - RISK_ORDER[b.level] || b.open - a.open,
    );
    return { rows: built, totalOpen: open, totalCollateral: collateral };
  }, [minerStats, configByRepo]);

  if (totalOpen <= 0) return null;

  const hasBreach = rows.some((r) => r.level === 'over' || r.level === 'at');

  return (
    <Card sx={{ p: { xs: 1.5, md: 2 } }} elevation={0}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          mb: 1.25,
        }}
      >
        <WarningIcon
          sx={{
            fontSize: '1rem',
            color: hasBreach ? STATUS_COLORS.warningOrange : 'text.secondary',
          }}
        />
        <Typography variant="sectionTitle">Open PR risk</Typography>
        <Box
          sx={{
            ml: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '0.72rem',
            color: 'text.secondary',
          }}
        >
          <Typography component="span" sx={{ fontSize: 'inherit' }}>
            <Box
              component="span"
              sx={{ color: 'text.primary', fontWeight: 700 }}
            >
              {totalOpen}
            </Box>{' '}
            open
          </Typography>
          <Box
            component="span"
            sx={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              bgcolor: 'text.tertiary',
            }}
          />
          <Tooltip
            title="Score withheld as collateral while these PRs stay open. Released as they merge, forfeited if they close unmerged."
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Typography
              component="span"
              sx={{ fontSize: 'inherit', cursor: 'help' }}
            >
              <Box
                component="span"
                sx={{ color: STATUS_COLORS.warningOrange, fontWeight: 700 }}
              >
                {totalCollateral.toFixed(2)}
              </Box>{' '}
              collateral
            </Typography>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {rows.map((r) => {
          const meta = RISK_META[r.level];
          const fillPct = Math.min(
            100,
            (r.open / Math.max(1, r.allowance)) * 100,
          );
          return (
            <Box
              key={r.repo}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: meta.color,
                  flexShrink: 0,
                }}
              />
              <Typography
                title={r.repo}
                sx={{
                  fontSize: '0.78rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: '0 1 auto',
                  minWidth: 0,
                }}
              >
                {r.repo}
              </Typography>
              <Box
                sx={{
                  width: 64,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: 'border.light',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: `${fillPct}%`,
                    height: '100%',
                    backgroundColor: meta.color,
                    borderRadius: 999,
                  }}
                />
              </Box>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {r.open}/{r.allowance}
              </Typography>
              <Tooltip
                title={
                  r.level === 'over'
                    ? 'Open PRs exceed the allowance — this repository’s contribution score is currently zeroed. Merge or close PRs to recover.'
                    : `Allowance ${r.allowance} (grows with token score). Open PRs beyond it zero this repo’s contribution score.`
                }
                arrow
                placement="top"
                slotProps={tooltipSlotProps}
              >
                <Typography
                  sx={{
                    fontSize: '0.66rem',
                    fontWeight: 600,
                    color: meta.color,
                    whiteSpace: 'nowrap',
                    cursor: 'help',
                    flexShrink: 0,
                  }}
                >
                  {meta.label}
                </Typography>
              </Tooltip>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
};

export default MinerOpenPrRisk;

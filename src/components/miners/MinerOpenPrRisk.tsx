import React, { useMemo } from 'react';
import { alpha, Box, Card, Tooltip, Typography } from '@mui/material';
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
    <Card sx={{ p: { xs: 2, md: 2.5 } }} elevation={0}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
          mb: 1.75,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon
            sx={{
              fontSize: '1.1rem',
              color: hasBreach ? STATUS_COLORS.warningOrange : 'text.secondary',
            }}
          />
          <Typography variant="sectionTitle">Open PR risk</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1 }}
            >
              {totalOpen}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.66rem',
                color: 'text.tertiary',
                textTransform: 'uppercase',
              }}
            >
              open PRs
            </Typography>
          </Box>
          <Tooltip
            title="Score withheld as collateral while these PRs stay open. Released as they merge (or forfeited if they close unmerged)."
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Box sx={{ textAlign: 'right', cursor: 'help' }}>
              <Typography
                sx={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: STATUS_COLORS.warningOrange,
                }}
              >
                {totalCollateral.toFixed(2)}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.66rem',
                  color: 'text.tertiary',
                  textTransform: 'uppercase',
                }}
              >
                collateral held
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.map((r) => {
          const meta = RISK_META[r.level];
          const fillPct = Math.min(
            100,
            (r.open / Math.max(1, r.allowance)) * 100,
          );
          return (
            <Box
              key={r.repo}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr auto',
                  sm: 'minmax(0,1fr) 120px auto',
                },
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Typography
                title={r.repo}
                sx={{
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {r.repo}
              </Typography>

              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: 'border.light',
                    overflow: 'hidden',
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
                    fontSize: '0.72rem',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.open}/{r.allowance}
                </Typography>
              </Box>

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
                <Box
                  sx={{
                    justifySelf: 'end',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 0.9,
                    py: 0.3,
                    borderRadius: 1,
                    border: `1px solid ${alpha(meta.color, 0.35)}`,
                    backgroundColor: alpha(meta.color, 0.1),
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: meta.color,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: meta.color,
                    }}
                  >
                    {meta.label}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
};

export default MinerOpenPrRisk;

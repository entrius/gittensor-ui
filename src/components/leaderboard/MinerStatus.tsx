import React from 'react';
import { Box, Tooltip, Typography, alpha } from '@mui/material';
import type { MinerEvaluation } from '../../api';
import { MINER_STATUS_COLORS, tooltipSlotProps } from '../../theme';
import { parseNumber } from '../../utils/ExplorerUtils';
import type { MinerActivity } from './useMinerActivityIndex';

export type MinerStatusKind =
  | 'penalized'
  | 'hot'
  | 'climbing'
  | 'rising'
  | 'dormant'
  | 'cooling'
  | 'specialist'
  | 'dual'
  | 'none';

export interface MinerStatus {
  kind: MinerStatusKind;
  icon: string;
  label: string;
  hint: string;
}

const REGISTRY: Record<
  Exclude<MinerStatusKind, 'none'>,
  Omit<MinerStatus, 'kind'>
> = {
  penalized: {
    icon: '⚠️',
    label: 'Penalized',
    hint: 'Validator flagged this miner — see the details page for the failed_reason',
  },
  hot: {
    icon: '🔥',
    label: 'Hot',
    hint: '≥3 merged PRs in the last 3 days',
  },
  climbing: {
    icon: '🚀',
    label: 'Climbing',
    hint: 'Up ≥3 ranks since yesterday',
  },
  rising: {
    icon: '📈',
    label: 'Rising',
    hint: 'Merged PRs up ≥50% this week vs the prior week',
  },
  dormant: {
    icon: '💤',
    label: 'Dormant',
    hint: 'No merged PRs in the last 14 days',
  },
  cooling: {
    icon: '🌙',
    label: 'Cooling',
    hint: 'No merged PRs this week (was active last week)',
  },
  specialist: {
    icon: '🎯',
    label: 'Specialist',
    hint: '≤2 unique repos with ≥5 merged PRs (deep focus)',
  },
  dual: {
    icon: '⚖️',
    label: 'Dual',
    hint: 'Eligible in both OSS and Discovery in at least one repo',
  },
};

const TONE: Record<
  Exclude<MinerStatusKind, 'none'>,
  string
> = MINER_STATUS_COLORS;

export const STATUS_NONE: MinerStatus = {
  kind: 'none',
  icon: '',
  label: '',
  hint: '',
};

const make = (kind: Exclude<MinerStatusKind, 'none'>): MinerStatus => ({
  kind,
  ...REGISTRY[kind],
});

interface DeriveExtras {
  previousRank?: number;
  currentRank?: number;
}

export const deriveMinerStatus = (
  miner: MinerEvaluation,
  activity: MinerActivity,
  extras: DeriveExtras = {},
): MinerStatus => {
  const failed = (miner.failedReason ?? '').trim();
  if (failed) return { ...make('penalized'), hint: failed };

  const recent3 = activity.dailyMerged.slice(-3).reduce((a, b) => a + b, 0);
  const recent14 = activity.dailyMerged.slice(-14).reduce((a, b) => a + b, 0);
  if (recent3 >= 3) return make('hot');

  const { previousRank, currentRank } = extras;
  if (
    previousRank !== undefined &&
    currentRank !== undefined &&
    previousRank - currentRank >= 3
  ) {
    return make('climbing');
  }

  const last7 = activity.dailyMerged.slice(-7).reduce((a, b) => a + b, 0);
  const prior7 =
    activity.dailyMerged.length >= 14
      ? activity.dailyMerged.slice(-14, -7).reduce((a, b) => a + b, 0)
      : 0;
  if (last7 >= 3 && prior7 > 0 && last7 >= prior7 * 1.5) return make('rising');

  if (recent14 === 0) return make('dormant');

  const uniqueRepos = parseNumber(miner.uniqueReposCount);
  const merged = parseNumber(miner.totalMergedPrs);
  if (uniqueRepos > 0 && uniqueRepos <= 2 && merged >= 5) {
    return make('specialist');
  }
  if (miner.isEligible && miner.isIssueEligible) return make('dual');

  if (last7 === 0 && prior7 > 0) return make('cooling');

  return STATUS_NONE;
};

export const StatusBadge: React.FC<{ status: MinerStatus }> = ({ status }) => {
  if (status.kind === 'none') return null;
  const color = TONE[status.kind];
  return (
    <Tooltip
      title={`${status.label} · ${status.hint}`}
      arrow
      placement="top"
      slotProps={tooltipSlotProps}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          px: '6px',
          py: '2px',
          borderRadius: '999px',
          backgroundColor: alpha(color, 0.12),
          border: `1px solid ${alpha(color, 0.3)}`,
          color,
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '0.3px',
          lineHeight: 1,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <Box component="span" aria-hidden sx={{ fontSize: '0.7rem' }}>
          {status.icon}
        </Box>
        <Typography
          component="span"
          sx={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            letterSpacing: 'inherit',
            color: 'inherit',
            lineHeight: 1,
          }}
        >
          {status.label}
        </Typography>
      </Box>
    </Tooltip>
  );
};

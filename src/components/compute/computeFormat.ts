import { formatDistanceToNowStrict } from 'date-fns';
import { STATUS_COLORS } from '../../theme';
import type {
  ServingMiner,
  ServingMinerStatus,
  ServingPricingSource,
} from '../../api';

export const WINDOW_SLOTS = 10;
export const WINDOW_READY_MEAN = 0.8;
export const CAPACITY_REFERENCE_TPS = 180;

export const COMPUTE_STATUS_META: Record<
  ServingMinerStatus,
  { label: string; color: string; hint: string }
> = {
  ready: {
    label: 'Ready',
    color: STATUS_COLORS.success,
    hint: `Serving and earning — rolling ${WINDOW_SLOTS}-slot window mean ≥ ${WINDOW_READY_MEAN}.`,
  },
  probation: {
    label: 'Probation',
    color: STATUS_COLORS.warning,
    hint: `Not READY yet. The validator sends 2 baseline prompts per round so the miner can build a ${WINDOW_SLOTS}-slot window with mean ≥ ${WINDOW_READY_MEAN}.`,
  },
  quarantined: {
    label: 'Quarantined',
    color: STATUS_COLORS.error,
    hint: 'A WRONG answer wiped the window and paused this miner for 1 hour.',
  },
};

const HOTKEY_EDGE = 6;

export const shortHotkey = (hotkey: string, edge = HOTKEY_EDGE): string => {
  if (!hotkey) return '';
  if (hotkey.length <= edge * 2 + 1) return hotkey;
  return `${hotkey.slice(0, edge)}…${hotkey.slice(-edge)}`;
};

export const formatFixed = (
  value: number | null | undefined,
  decimals = 2,
): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toFixed(decimals);

export const formatPercent = (
  fraction: number | null | undefined,
  decimals = 0,
): string =>
  fraction === null || fraction === undefined || !Number.isFinite(fraction)
    ? '—'
    : `${(fraction * 100).toFixed(decimals)}%`;

/** "12.34 α" — estimate marker is added by callers' labels. */
export const formatAlpha = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : `${value.toFixed(2)} α`;

export const formatUsd = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      });

/** Payout estimates are meaningless without a price — render "—". */
export const hasPricing = (
  source: ServingPricingSource | null | undefined,
): boolean => source !== 'none';

export const formatWindow = (miner: {
  windowN: number;
  windowMean: number;
}): string =>
  `${miner.windowN}/${WINDOW_SLOTS} · ${formatFixed(miner.windowMean, 2)}`;

export const uptimeFraction = (miner: {
  readyRounds24h: number;
  rounds24h: number;
}): number | null =>
  miner.rounds24h > 0 ? miner.readyRounds24h / miner.rounds24h : null;

export const formatRoundTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDistanceToNowStrict(date)} ago`;
};

/** Plain-English "why" for the miner's current status. */
export const describeMinerStatus = (miner: ServingMiner): string => {
  switch (miner.status) {
    case 'ready':
      return `Serving. Window ${miner.windowN}/${WINDOW_SLOTS}, settled ${formatFixed(miner.settledScore, 2)}.`;
    case 'probation':
      return `Not READY yet — window ${miner.windowN}/${WINDOW_SLOTS} mean ${formatFixed(miner.windowMean, 2)}, needs ≥ ${WINDOW_READY_MEAN} (validator sends 2 baseline prompts per round).`;
    case 'quarantined':
      return `Quarantined until ${formatRoundTime(miner.quarantinedUntil)} after a wrong answer; window reset.`;
    default:
      return '';
  }
};

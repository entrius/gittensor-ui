import { formatDistanceToNowStrict } from 'date-fns';
import { STATUS_COLORS } from '../../theme';
import type {
  ServingMiner,
  ServingMinerStatus,
  ServingPricingSource,
} from '../../api';

export const WINDOW_SLOTS = 10;
export const WINDOW_READY_MEAN = 0.8;
export const SETTLEMENT_ROUNDS = 12;

/** Header tooltips for the fleet table / KPI cards. */
export const COMPUTE_METRIC_HINTS = {
  tps: 'Decode rate the validator observed on traffic it sent this miner (completion tokens ÷ time after first token), mean over the round.',
  ttft: 'Time to first token the validator observed on traffic it sent this miner, mean over the round.',
  credit:
    'Speed credit 0–1: TTFT band × decode band against the blessed 5090 curve, mean over the round. Misses earn 0.',
  attested:
    'Hardware attestation this round: seeded VRAM fill + GEMM chain must match the reference runtime. Admission only — not attested = not READY, no pay this round.',
  tokens:
    'Output tokens the validator’s gateway saw this miner serve on user traffic — counted by the gateway, never self-reported. This is what the miner is paid for; baseline prompts pay nothing.',
  settled: `Mean round score over the trailing ${SETTLEMENT_ROUNDS} rounds (~1 h): the hour’s served tokens in card-hours. 1.0 = one 5090 flat out for the hour; this is what the miner is paid on.`,
  round:
    'This round: served output tokens ÷ what one 5090 decodes in a round, if the window passed and the card attested.',
} as const;

export const COMPUTE_STATUS_META: Record<
  ServingMinerStatus,
  { label: string; color: string; hint: string }
> = {
  ready: {
    label: 'Ready',
    color: STATUS_COLORS.success,
    hint: `Serving and paid per token routed to it — rolling ${WINDOW_SLOTS}-slot window mean ≥ ${WINDOW_READY_MEAN}, attested.`,
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

export const formatMs = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : `${Math.round(value)} ms`;

export const formatTps = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : `${Math.round(value)} tok/s`;

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

export const formatUsd = (
  value: number | null | undefined,
  maximumFractionDigits = 2,
): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits,
      });

/** Token counts in compact form: 840 · 84.0k · 1.20M · 2.5B. */
export const formatTokens = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '—';
  if (value < 1_000) return String(Math.round(value));
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)}k`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  return `${(value / 1_000_000_000).toFixed(2)}B`;
};

export type MissSeverity = 'strike' | 'neutral';

/**
 * Only a wrong answer (strike) is an error; timeouts / unavailable /
 * not-verified / empty completion are ordinary misses. A bare "Success"
 * is a legacy validator string for an empty completion — never show it red.
 */
export const classifyMissReason = (
  reason: string,
): { label: string; severity: MissSeverity } => {
  const trimmed = reason.trim();
  if (/^success$/i.test(trimmed)) {
    return { label: 'empty completion', severity: 'neutral' };
  }
  const lower = trimmed.toLowerCase();
  const isStrike =
    lower.startsWith('wrong') ||
    lower.includes('reference mismatch') ||
    lower.includes('wrong');
  return { label: trimmed, severity: isStrike ? 'strike' : 'neutral' };
};

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
      return `Serving. Window ${miner.windowN}/${WINDOW_SLOTS}, settled ${formatFixed(miner.settledScore, 2)} (${SETTLEMENT_ROUNDS}-round mean).`;
    case 'probation':
      return `Not READY yet — window ${miner.windowN}/${WINDOW_SLOTS} mean ${formatFixed(miner.windowMean, 2)}, needs ≥ ${WINDOW_READY_MEAN} (validator sends 2 baseline prompts per round).`;
    case 'quarantined':
      return `Quarantined until ${formatRoundTime(miner.quarantinedUntil)} after a wrong answer; window reset.`;
    default:
      return '';
  }
};

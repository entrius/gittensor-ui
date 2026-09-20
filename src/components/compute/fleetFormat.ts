import { STATUS_COLORS } from '../../theme';
import type { ComputeBox, ComputeCard, ComputeFleet } from '../../api';

/** What a fleet row shows as its status: the card's state, or the box's when it has no proven cards. */
export type FleetRowStatus =
  | 'LEASED'
  | 'IDLE'
  | 'CHECKING'
  | 'STARTING'
  | 'DRAINING'
  | 'ADMIT'
  | 'BENCHED';

export const FLEET_STATUS_META: Record<
  FleetRowStatus,
  { label: string; color: string; hint: string }
> = {
  LEASED: {
    label: 'Leased',
    color: STATUS_COLORS.success,
    hint: 'Serving a blessed workload: earns the leased rate.',
  },
  IDLE: {
    label: 'Idle',
    color: STATUS_COLORS.info,
    hint: 'Proven and waiting for a workload: earns the idle rate.',
  },
  CHECKING: {
    label: 'Checking',
    color: STATUS_COLORS.warning,
    hint: 'Being re-proven after a workload left: unpaid, usually under a minute.',
  },
  STARTING: {
    label: 'Starting',
    color: STATUS_COLORS.warning,
    hint: 'A workload is loading on the card: unpaid until it answers its first health probe.',
  },
  DRAINING: {
    label: 'Draining',
    color: STATUS_COLORS.warningOrange,
    hint: 'The workload is finishing its requests before it leaves the card.',
  },
  ADMIT: {
    label: 'Admit',
    color: STATUS_COLORS.neutral,
    hint: 'Found on chain, waiting for its first proof. No cards yet.',
  },
  BENCHED: {
    label: 'Benched',
    color: STATUS_COLORS.error,
    hint: 'Failed a proof or a rule: unpaid until the bench ends.',
  },
};

// LEASED, IDLE, the states in between, BENCHED last.
const STATUS_RANK: Record<FleetRowStatus, number> = {
  LEASED: 0,
  IDLE: 1,
  DRAINING: 2,
  STARTING: 3,
  CHECKING: 4,
  ADMIT: 5,
  BENCHED: 6,
};

export interface FleetRow {
  key: string;
  box: ComputeBox;
  card: ComputeCard | null;
  status: FleetRowStatus;
  /** First row of its box: the only one that repeats the box's identity. */
  leads: boolean;
}

const rowStatus = (
  box: ComputeBox,
  card: ComputeCard | null,
): FleetRowStatus =>
  box.status === 'BENCHED'
    ? 'BENCHED'
    : card && card.state in FLEET_STATUS_META
      ? (card.state as FleetRowStatus)
      : 'ADMIT';

/** One row per card, grouped by box; a box with no cards (ADMIT, BENCHED) keeps one row of its own. */
export const fleetRows = (boxes: ComputeBox[]): FleetRow[] => {
  const groups = boxes.map((box) => {
    const cards: Array<ComputeCard | null> =
      box.cards.length && box.status !== 'BENCHED' ? box.cards : [null];
    const rows = cards
      .map((card) => ({ card, status: rowStatus(box, card) }))
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
    return { box, rows, rank: STATUS_RANK[rows[0].status] };
  });
  groups.sort(
    (a, b) =>
      a.rank - b.rank ||
      (a.box.uid ?? Number.MAX_SAFE_INTEGER) -
        (b.box.uid ?? Number.MAX_SAFE_INTEGER) ||
      a.box.hotkey.localeCompare(b.box.hotkey),
  );
  return groups.flatMap(({ box, rows }) =>
    rows.map(({ card, status }, index) => ({
      key: `${box.hotkey}-${card?.card ?? 'box'}`,
      box,
      card,
      status,
      leads: index === 0,
    })),
  );
};

/** Cards that passed their proof and are earning or about to: IDLE + LEASED + DRAINING. */
export const provenCards = (fleet: ComputeFleet): number => {
  const by = fleet.totals.cards_by_state;
  return (by.IDLE ?? 0) + (by.LEASED ?? 0) + (by.DRAINING ?? 0);
};

const HOTKEY_EDGE = 6;

export const shortHotkey = (hotkey: string, edge = HOTKEY_EDGE): string => {
  if (!hotkey) return '';
  if (hotkey.length <= edge * 2 + 1) return hotkey;
  return `${hotkey.slice(0, edge)}…${hotkey.slice(-edge)}`;
};

/** 95 -> "1m 35s", 4000 -> "1h 6m", 200000 -> "2d 7h". */
export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400)
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
};

/** Unix seconds -> "5m ago" against `nowS`. */
export const formatAgo = (
  at: number | null | undefined,
  nowS: number,
): string => {
  if (at == null) return '—';
  const s = Math.max(0, nowS - at);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const formatUsdRate = (value: number | null | undefined): string =>
  value == null ? '—' : `$${value.toFixed(2)}`;

/** `gpu_uuid_pin` -> "gpu uuid pin"; `heartbeat:same_card` -> "heartbeat same card". */
export const humanize = (name: string): string => name.replace(/[_:]/g, ' ');

// A published phrase is assembled by the controller from constants in its own source plus integers, so it can hold
// nothing a box reported. This is the page's own check on that, not its only defence: React escapes what it renders.
const PHRASE = /^[A-Za-z0-9][A-Za-z0-9 ,.()'/-]{0,199}$/;

/**
 * Why one check failed, in the controller's words — or `null`, and the caller names the check instead. Anything
 * that does not look like a phrase we would have written is dropped rather than shown.
 */
export const benchPhrase = (box: ComputeBox, check: string): string | null => {
  const text = box.last_failed_why?.[check];
  return typeof text === 'string' && PHRASE.test(text) ? text : null;
};

// Standing events that are good news, not a miss.
const QUIET_EVENTS = new Set(['clean_lease', 'released', 'folded']);

/** The row's last miss or failed check, or null when there is nothing to report. */
export const lastMiss = (
  row: FleetRow,
  nowS: number,
): { text: string; when: string } | null => {
  const { box, card } = row;
  // A failed check is the box's, not a card's: said once, on the box's first row. The check's own words if the
  // controller published them — "failed card_free" named the check and told the miner nothing to do about it.
  if (row.leads && box.last_failed.length)
    return {
      text: box.last_failed
        .map((check) => benchPhrase(box, check) ?? `failed ${humanize(check)}`)
        .join('; '),
      when: formatAgo(box.last_check_at, nowS),
    };
  if (card?.heartbeat_misses)
    return {
      text: `${card.heartbeat_misses} missed heartbeat${card.heartbeat_misses === 1 ? '' : 's'}`,
      when: card.last_heartbeat_at
        ? `last ok ${formatAgo(card.last_heartbeat_at, nowS)}`
        : '',
    };
  const event = row.leads ? box.last_event : null;
  if (event && !QUIET_EVENTS.has(event.kind))
    return { text: humanize(event.kind), when: formatAgo(event.at, nowS) };
  return null;
};

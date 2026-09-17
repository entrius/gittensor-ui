// GET /compute/fleet: the compute pool as its controller last published it
// (gittensor `controller/publish.py`, "schema": 1), plus das's `stale` /
// `age_s`. Field names are the document's own snake_case. Timestamps are unix
// seconds.

export type ComputeCardState =
  | 'IDLE'
  | 'CHECKING'
  | 'STARTING'
  | 'LEASED'
  | 'DRAINING';

export type ComputeBoxStatus = 'ADMIT' | 'IDLE' | 'BENCHED';

export interface ComputeCard {
  /** First 12 hex of sha256(GPU UUID); the raw UUID is never published. */
  card: string;
  state: ComputeCardState | string;
  since: number | null;
  // Present while an instance is on the card.
  workload?: string | null;
  image?: string | null;
  leased_at?: number | null;
  uptime_s?: number | null;
  healthy?: boolean;
  draining?: boolean;
  heartbeat_misses?: number;
  last_heartbeat_at?: number | null;
}

export interface ComputeBox {
  hotkey: string;
  uid: number | null;
  status: ComputeBoxStatus | string;
  standing: string;
  gpu_type: string | null;
  card_count: number;
  last_check_at: number | null;
  last_failed: string[];
  bench_until: number | null;
  benched_reason: string | null;
  pay: {
    weight: number;
    idle_h: number;
    leased_h: number;
    usd_window: number;
  } | null;
  last_event: { at: number | null; kind: string } | null;
  cards: ComputeCard[];
}

export interface ComputeRate {
  idle_usd_per_card_hour: number;
  leased_usd_per_card_hour: number;
  source: 'scorecard' | 'table';
}

export interface ComputeFleet {
  schema: number;
  generated_at: number;
  network: string | null;
  netuid: number | null;
  controller: {
    running: boolean;
    round_n: number | null;
    last_round_at: number | null;
    round_interval_s: number | null;
    publish_interval_s: number | null;
  };
  scorecard: {
    sha256: string | null;
    issued_at: number | null;
    valid_until: number | null;
    valid: boolean;
    recycle_share: number | null;
  } | null;
  rates: Record<string, ComputeRate>;
  oracle: {
    tao_usd: number | null;
    alpha_tao: number | null;
    held: boolean;
  } | null;
  totals: {
    boxes: number;
    cards: number;
    cards_by_state: Record<string, number>;
  };
  boxes: ComputeBox[];
  stale: boolean;
  age_s: number;
}

// Compute (serving) sub-mechanism — one validator's snapshot of the RTX 5090
// serving pool. All figures are that validator's own audit, not consensus.

export type ServingMinerStatus = 'ready' | 'probation' | 'quarantined';

export interface ServingStatus {
  validatorHotkey: string;
  roundTs: string;
  served: number;
  gateway: number;
  baseline: number;
  passes: number;
  misses: number;
  strikes: number;
  neutral: number;
  ready: number;
  probation: number;
  quarantined: number;
  cardEquivalents: number;
  /** Fraction of subnet emissions flowing to the pool (≤ poolCap). */
  poolShare: number;
  poolCap: number;
  gpuHourUsd: number;
  alphaPerHour: number | null;
  alphaUsd: number | null;
  estAlphaPerCardDay: number | null;
  estUsdPerCardDay: number | null;
  roundsLast24h: number;
  retentionDays: number;
}

export interface ServingMiner {
  uid: number;
  hotkey: string;
  githubId: string | null;
  username: string | null;
  modelId: string;
  status: ServingMinerStatus;
  windowMean: number;
  windowN: number;
  windowPassed: boolean;
  quarantinedUntil: string | null;
  served: number;
  credit: number;
  probeTps: number | null;
  capacity: number;
  roundScore: number;
  settledScore: number;
  lastMissReason: string | null;
  roundTs: string;
  readyRounds24h: number;
  rounds24h: number;
  estAlphaPerDay: number | null;
  estUsdPerDay: number | null;
}

export interface ServingRound {
  roundTs: string;
  status: ServingMinerStatus;
  windowMean: number;
  windowN: number;
  credit: number;
  probeTps: number | null;
  capacity: number;
  roundScore: number;
  settledScore: number;
  served: number;
  lastMissReason: string | null;
}

export interface ServingMiss {
  roundTs: string;
  reason: string;
}

export interface ServingMinerDetail {
  validatorHotkey: string;
  miner: ServingMiner | null;
  /** Ascending by time. */
  rounds: ServingRound[];
  /** Most recent ≤ 20, newest first. */
  misses: ServingMiss[];
}

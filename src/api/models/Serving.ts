// Compute (serving) sub-mechanism — one validator's snapshot of the RTX 5090
// serving pool. All figures are that validator's own audit, not consensus.

export type ServingMinerStatus = 'ready' | 'probation' | 'quarantined';

/** Where the alpha price used for USD estimates came from. */
export type ServingPricingSource = 'validator' | 'taostats' | 'none';

/** The model/runtime pin the validator currently enforces. */
export interface ServingRelease {
  modelId: string;
  /** e.g. "gittensor-ai-lab/sparkinfer@12954e6" */
  runtimePin: string;
  modelSha256: string;
  modelFile: string;
  /** e.g. "entrius/sparkinfer:12954e6" */
  image: string;
}

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
  /** From the validator; null on rows written before the column existed. */
  poolCap: number | null;
  gpuHourUsd: number | null;
  pricingSource: ServingPricingSource;
  alphaPerHour: number | null;
  alphaUsd: number | null;
  /** Per 72-min tempo. */
  estAlphaPerCardTempo: number | null;
  estAlphaPerCardDay: number | null;
  estUsdPerCardDay: number | null;
  roundsLast24h: number;
  release: ServingRelease | null;
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
  /** Speed credit 0–1: TTFT band × decode band, mean over the round's served requests. */
  credit: number;
  /** Validator-observed time to first token, mean over the round (ms). */
  ttftMs: number | null;
  /** Validator-observed decode rate on served traffic, mean over the round (tok/s). */
  decodeTps: number | null;
  /** 1 when this round's hardware attestation passed, else 0. */
  capacity: number;
  roundScore: number;
  /** Trailing 12-round mean of roundScore — what the miner is paid on. */
  settledScore: number;
  lastMissReason: string | null;
  roundTs: string;
  readyRounds24h: number;
  rounds24h: number;
  estAlphaPerTempo: number | null;
  estAlphaPerDay: number | null;
  estUsdPerDay: number | null;
}

export interface ServingRound {
  roundTs: string;
  status: ServingMinerStatus;
  windowMean: number;
  windowN: number;
  credit: number;
  ttftMs: number | null;
  decodeTps: number | null;
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

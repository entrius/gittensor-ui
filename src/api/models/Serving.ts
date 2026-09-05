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
  /** e.g. "entrius/sparkinfer:7498736@sha256:…" — the runtime container */
  image: string;
  /** e.g. "entrius/gt-attest:v1" — the attest container every box runs beside the runtime; null on older rounds */
  attestImage: string | null;
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
  /** Σ settled scores — the hour's served tokens across the fleet, in card-hours. */
  cardEquivalents: number;
  /** Output tokens paid this round across the fleet. */
  tokens: number;
  /** Prompt (input) tokens paid as prefill this round across the fleet. */
  promptTokens: number;
  /** tokens + promptTokens: every token the gateway served this round. */
  totalTokens: number;
  /** Output tokens paid over the validator's last 24 h of rounds. */
  tokensLast24h: number;
  /** Prompt (input) tokens paid over the last 24 h of rounds. */
  promptTokensLast24h: number;
  /** Total tokens (input + output) served over the last 24 h of rounds. */
  totalTokensLast24h: number;
  /** User requests the gateway routed to a miner over the last 24 h (served or failed; 429s never reach a miner). */
  requestsLast24h: number;
  /** Fraction of subnet emissions flowing to the pool (≤ poolCap). */
  poolShare: number;
  /** From the validator; null on rows written before the column existed. */
  poolCap: number | null;
  /** What one 5090 flat out for an hour earns; the per-token rate derives from it. */
  gpuHourUsd: number | null;
  /** The release's derived rate, USD per million output tokens; null on older rounds. */
  usdPerMTokens: number | null;
  /** The same card-hour over one card's hourly prefill, USD per million input tokens; null on older rounds. */
  usdPerMPromptTokens: number | null;
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
  /** Passed this round's hardware attestation — admission to the READY set, not pay. */
  attested: boolean;
  /** Output tokens the gateway saw this miner serve on user traffic this round — what it is paid for. */
  tokens: number;
  /** Prompt (input) tokens on those same requests, paid as prefill. */
  promptTokens: number;
  /** Output tokens served over the last 24 h of rounds. */
  tokens24h: number;
  /** Prompt (input) tokens served over the last 24 h of rounds. */
  promptTokens24h: number;
  /** This round's served tokens in card-equivalents (1.0 = one card flat out for the round). */
  roundScore: number;
  /** Trailing 12-round mean of roundScore — the hour's tokens in card-hours; what the miner is paid on. */
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
  attested: boolean;
  tokens: number;
  promptTokens: number;
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

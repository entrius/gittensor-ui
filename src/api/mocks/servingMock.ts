// Dev-only fixtures for the /serving endpoints. Enabled via
// `VITE_SERVING_MOCK=true` while the das endpoints are being built; loaded
// lazily so nothing here reaches the production bundle.
import type {
  ServingMiner,
  ServingMinerDetail,
  ServingMinerStatus,
  ServingRound,
  ServingStatus,
} from '../models/Serving';

const VALIDATOR_HOTKEY = '5GroGYvJ9wYfM2ZV8N7nDgWcM4tYkr1yF3QpZbH6sLdKcE2v';
const ROUND_MS = 5 * 60 * 1000;
const ALPHA_USD = 0.31;

const latestRoundTs = () =>
  new Date(Math.floor(Date.now() / ROUND_MS) * ROUND_MS).toISOString();

// Deterministic pseudo-random so the fleet is stable across refetches.
const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const hotkeyFor = (uid: number) =>
  `5${uid.toString(36).padStart(3, 'a')}${'F7kQmZ2xNpLcT9vRbW4yHdG8sJ3eA6uC1oK5iM0nX'.slice(0, 44)}`;

const FIXTURE_ROWS: Array<{
  uid: number;
  status: ServingMinerStatus;
  username: string | null;
  githubId: string | null;
}> = [
  { uid: 12, status: 'ready', username: 'gpu-octo', githubId: '583231' },
  { uid: 47, status: 'ready', username: 'serverfarm', githubId: '1024' },
  { uid: 88, status: 'probation', username: null, githubId: null },
  { uid: 133, status: 'ready', username: 'blackwell-bob', githubId: '77' },
  { uid: 160, status: 'quarantined', username: 'carlos4s', githubId: '9001' },
  { uid: 201, status: 'probation', username: 'newrig', githubId: '5555' },
];

const buildMiner = (
  row: (typeof FIXTURE_ROWS)[number],
  roundTs: string,
): ServingMiner => {
  const rand = seeded(row.uid);
  const ready = row.status === 'ready';
  const quarantined = row.status === 'quarantined';
  const windowN = quarantined ? 0 : ready ? 10 : 3 + Math.floor(rand() * 5);
  const windowMean = quarantined
    ? 0
    : ready
      ? 0.8 + rand() * 0.2
      : 0.4 + rand() * 0.35;
  const probeTps = quarantined ? null : 120 + rand() * 90;
  const capacity = probeTps ? Math.min(probeTps / 180, 1.2) : 0;
  const credit = ready ? 0.85 + rand() * 0.15 : 0.5 + rand() * 0.4;
  const roundScore = ready ? credit * capacity : 0;
  const settledScore = ready ? roundScore * (0.9 + rand() * 0.1) : 0;
  const rounds24h = 280 + Math.floor(rand() * 8);
  const readyRounds24h = ready
    ? rounds24h - Math.floor(rand() * 20)
    : Math.floor(rand() * 60);
  const estAlphaPerDay = ready ? settledScore * 54.2 : 0;
  return {
    uid: row.uid,
    hotkey: hotkeyFor(row.uid),
    githubId: row.githubId,
    username: row.username,
    modelId: 'gpt-oss-20b',
    status: row.status,
    windowMean: Number(windowMean.toFixed(3)),
    windowN,
    windowPassed: ready,
    quarantinedUntil: quarantined
      ? new Date(Date.now() + 37 * 60 * 1000).toISOString()
      : null,
    served: ready ? 20 + Math.floor(rand() * 40) : 2,
    credit: Number(credit.toFixed(3)),
    probeTps: probeTps === null ? null : Number(probeTps.toFixed(1)),
    capacity: Number(capacity.toFixed(3)),
    roundScore: Number(roundScore.toFixed(3)),
    settledScore: Number(settledScore.toFixed(3)),
    lastMissReason: quarantined
      ? 'WRONG: reference mismatch on baseline prompt 2'
      : ready
        ? null
        : 'TIMEOUT: no response within 30s on gateway request',
    roundTs,
    readyRounds24h,
    rounds24h,
    estAlphaPerDay: Number(estAlphaPerDay.toFixed(2)),
    estUsdPerDay: Number((estAlphaPerDay * ALPHA_USD).toFixed(2)),
  };
};

export const mockServingMiners = (): ServingMiner[] => {
  const roundTs = latestRoundTs();
  return FIXTURE_ROWS.map((row) => buildMiner(row, roundTs));
};

export const mockServingStatus = (): ServingStatus => {
  const miners = mockServingMiners();
  const ready = miners.filter((m) => m.status === 'ready').length;
  const cardEquivalents = miners.reduce((sum, m) => sum + m.settledScore, 0);
  const alphaPerHour = 2.26;
  return {
    validatorHotkey: VALIDATOR_HOTKEY,
    roundTs: latestRoundTs(),
    served: miners.reduce((sum, m) => sum + m.served, 0),
    gateway: 96,
    baseline: 12,
    passes: 91,
    misses: 5,
    strikes: 1,
    neutral: 0,
    ready,
    probation: miners.filter((m) => m.status === 'probation').length,
    quarantined: miners.filter((m) => m.status === 'quarantined').length,
    cardEquivalents: Number(cardEquivalents.toFixed(2)),
    poolShare: 0.0212,
    poolCap: 0.035,
    gpuHourUsd: 0.7,
    alphaPerHour,
    alphaUsd: ALPHA_USD,
    estAlphaPerCardDay: Number((alphaPerHour * 24).toFixed(2)),
    estUsdPerCardDay: Number((alphaPerHour * 24 * ALPHA_USD).toFixed(2)),
    roundsLast24h: 287,
    retentionDays: 7,
  };
};

export const mockServingMinerDetail = (
  hotkey: string,
  hours: number,
): ServingMinerDetail | null => {
  const miner = mockServingMiners().find((m) => m.hotkey === hotkey);
  if (!miner) return null;
  const rand = seeded(miner.uid * 7);
  const count = Math.floor((hours * 60) / 5);
  const end = new Date(miner.roundTs).getTime();
  const rounds: ServingRound[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const ts = new Date(end - i * ROUND_MS).toISOString();
    const jitter = () => 0.92 + rand() * 0.16;
    const probeTps =
      miner.probeTps === null
        ? null
        : Number((miner.probeTps * jitter()).toFixed(1));
    const capacity = probeTps
      ? Number(Math.min(probeTps / 180, 1.2).toFixed(3))
      : 0;
    const credit = Number(Math.min(1, miner.credit * jitter()).toFixed(3));
    const missed = rand() < 0.04;
    const roundScore =
      miner.status === 'ready' && !missed
        ? Number((credit * capacity).toFixed(3))
        : 0;
    rounds.push({
      roundTs: ts,
      status: miner.status,
      windowMean: miner.windowMean,
      windowN: miner.windowN,
      credit,
      probeTps,
      capacity,
      roundScore,
      settledScore: Number((roundScore * 0.95).toFixed(3)),
      served: missed ? 0 : miner.served,
      lastMissReason: missed ? 'TIMEOUT: gateway request exceeded 30s' : null,
    });
  }
  const misses = rounds
    .filter((r) => r.lastMissReason)
    .slice(-20)
    .reverse()
    .map((r) => ({ roundTs: r.roundTs, reason: r.lastMissReason as string }));
  return { validatorHotkey: VALIDATOR_HOTKEY, miner, rounds, misses };
};

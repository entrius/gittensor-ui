// Serving (compute) API hooks — one validator's snapshot of the RTX 5090
// serving pool. Uses `/serving` endpoints on the main das API.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios, { type AxiosError } from 'axios';
import { useApiQuery } from './ApiUtils';
import type {
  ServingMiner,
  ServingMinerDetail,
  ServingRound,
  ServingStatus,
} from './models/Serving';

/** Audit rounds are 5 min; a minute keeps the page fresh without hammering. */
export const SERVING_REFETCH_MS = 60_000;

// Dev-only fixtures while the das endpoints are being built. The mock module
// is imported lazily so it never ships in the production bundle.
const USE_SERVING_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_SERVING_MOCK === 'true';

const notFound = (): AxiosError =>
  new axios.AxiosError('Not Found', '404', undefined, undefined, {
    status: 404,
    statusText: 'Not Found',
    data: null,
    headers: {},
    config: {} as never,
  });

const useServingMockQuery = <T>(
  queryName: string,
  url: string,
  queryParams: Record<string, string | number | undefined> | undefined,
  resolve: (mock: typeof import('./mocks/servingMock')) => T | null | undefined,
  enabled = true,
) =>
  useQuery<T, AxiosError>({
    queryKey: [queryName, url, queryParams],
    queryFn: async () => {
      const mock = await import('./mocks/servingMock');
      const data = resolve(mock);
      if (data === null || data === undefined) throw notFound();
      return data;
    },
    retry: false,
    enabled,
    refetchInterval: SERVING_REFETCH_MS,
  });

// Numeric columns arrive as strings when TypeORM hands back postgres
// `numeric`; coerce so callers can sort / format without runtime surprises.
const MINER_NUMERIC_FIELDS: readonly (keyof ServingMiner)[] = [
  'uid',
  'windowMean',
  'windowN',
  'served',
  'credit',
  'tokens',
  'promptTokens',
  'tokens24h',
  'promptTokens24h',
  'roundScore',
  'settledScore',
  'readyRounds24h',
  'rounds24h',
];
const MINER_NULLABLE_NUMERIC_FIELDS: readonly (keyof ServingMiner)[] = [
  'ttftMs',
  'decodeTps',
  'estAlphaPerTempo',
  'estAlphaPerDay',
  'estUsdPerDay',
];
const ROUND_NUMERIC_FIELDS: readonly (keyof ServingRound)[] = [
  'windowMean',
  'windowN',
  'credit',
  'tokens',
  'promptTokens',
  'roundScore',
  'settledScore',
  'served',
];
const STATUS_NUMERIC_FIELDS: readonly (keyof ServingStatus)[] = [
  'served',
  'gateway',
  'baseline',
  'passes',
  'misses',
  'strikes',
  'neutral',
  'ready',
  'probation',
  'quarantined',
  'cardEquivalents',
  'tokens',
  'promptTokens',
  'totalTokens',
  'tokensLast24h',
  'promptTokensLast24h',
  'totalTokensLast24h',
  'requestsLast24h',
  'poolShare',
  'roundsLast24h',
];
const STATUS_NULLABLE_NUMERIC_FIELDS: readonly (keyof ServingStatus)[] = [
  'poolCap',
  'gpuHourUsd',
  'usdPerMTokens',
  'usdPerMPromptTokens',
  'alphaPerHour',
  'estAlphaPerCardTempo',
  'alphaUsd',
  'estAlphaPerCardDay',
  'estUsdPerCardDay',
];

const coerceNumbers = <T extends object>(
  row: T,
  fields: readonly (keyof T)[],
  nullableFields: readonly (keyof T)[] = [],
): T => {
  const next = { ...row } as Record<string, unknown>;
  for (const field of fields) next[field as string] = Number(row[field]) || 0;
  for (const field of nullableFields) {
    const raw = row[field];
    if (raw === null || raw === undefined || raw === '') {
      next[field as string] = null;
    } else {
      const parsed = Number(raw);
      next[field as string] = Number.isFinite(parsed) ? parsed : null;
    }
  }
  return next as T;
};

export const normalizeServingMiner = (row: ServingMiner): ServingMiner =>
  coerceNumbers(row, MINER_NUMERIC_FIELDS, MINER_NULLABLE_NUMERIC_FIELDS);

const normalizeServingRound = (row: ServingRound): ServingRound =>
  coerceNumbers(row, ROUND_NUMERIC_FIELDS, ['ttftMs', 'decodeTps']);

const normalizeServingStatus = (row: ServingStatus): ServingStatus =>
  coerceNumbers(row, STATUS_NUMERIC_FIELDS, STATUS_NULLABLE_NUMERIC_FIELDS);

/** Pool-level snapshot for the latest audit round. 404 → no rounds yet. */
export const useServingStatus = () => {
  const live = useApiQuery<ServingStatus>(
    'useServingStatus',
    '/serving/status',
    SERVING_REFETCH_MS,
    undefined,
    !USE_SERVING_MOCK,
  );
  const mock = useServingMockQuery<ServingStatus>(
    'useServingStatus',
    '/serving/status',
    undefined,
    (m) => m.mockServingStatus(),
    USE_SERVING_MOCK,
  );
  const query = USE_SERVING_MOCK ? mock : live;
  const data = useMemo(
    () => (query.data ? normalizeServingStatus(query.data) : query.data),
    [query.data],
  );
  return { ...query, data };
};

/** Latest round row per live (uid, hotkey). */
export const useServingMiners = () => {
  const live = useApiQuery<ServingMiner[]>(
    'useServingMiners',
    '/serving/miners',
    SERVING_REFETCH_MS,
    undefined,
    !USE_SERVING_MOCK,
  );
  const mock = useServingMockQuery<ServingMiner[]>(
    'useServingMiners',
    '/serving/miners',
    undefined,
    (m) => m.mockServingMiners(),
    USE_SERVING_MOCK,
  );
  const query = USE_SERVING_MOCK ? mock : live;
  const data = useMemo(
    () => query.data?.map(normalizeServingMiner),
    [query.data],
  );
  return { ...query, data };
};

/** Per-hotkey history. 404 → hotkey never seen by this validator. */
export const useServingMinerDetail = (hotkey: string, hours = 24) => {
  const enabled = hotkey.length > 0;
  const params = { hours };
  const url = `/serving/miners/${encodeURIComponent(hotkey)}`;
  const live = useApiQuery<ServingMinerDetail>(
    'useServingMinerDetail',
    url,
    SERVING_REFETCH_MS,
    params,
    enabled && !USE_SERVING_MOCK,
  );
  const mock = useServingMockQuery<ServingMinerDetail>(
    'useServingMinerDetail',
    url,
    params,
    (m) => m.mockServingMinerDetail(hotkey, hours),
    enabled && USE_SERVING_MOCK,
  );
  const query = USE_SERVING_MOCK ? mock : live;
  const data = useMemo<ServingMinerDetail | undefined>(() => {
    const raw = query.data;
    if (!raw) return raw;
    return {
      ...raw,
      miner: raw.miner ? normalizeServingMiner(raw.miner) : null,
      rounds: (raw.rounds ?? []).map(normalizeServingRound),
      misses: raw.misses ?? [],
    };
  }, [query.data]);
  return { ...query, data };
};

/** True when the error is a 404 from the API (no rounds / unknown hotkey). */
export const isNotFoundError = (error: AxiosError | null | undefined) =>
  error?.response?.status === 404;

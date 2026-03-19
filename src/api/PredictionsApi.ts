import { useApiQuery } from './ApiUtils';
import { type MinerPredictionScore } from './models/Predictions';

const usePredictionsQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/predictions${url}`,
    refetchInterval,
    queryParams,
    enabled,
  );

/**
 * Get EMA prediction scores for all currently active miners, ordered by score descending.
 */
export const usePredictionScores = () =>
  usePredictionsQuery<MinerPredictionScore[]>('usePredictionScores', '/scores');

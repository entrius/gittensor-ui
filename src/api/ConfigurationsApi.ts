import { useApiQuery } from './ApiUtils';
import { type TierConfigResponse, type GeneralConfigResponse } from './models';

/**
 * Get tier configuration data (requirements and scoring parameters)
 * Uses the /configurations/tiers endpoint
 */
export const useTierConfigurations = () =>
  useApiQuery<TierConfigResponse>(
    'useTierConfigurations',
    '/configurations/tiers',
  );

/**
 * Get general configuration data (branding, scoring parameters, thresholds)
 * Uses the /configurations/general endpoint
 */
export const useGeneralConfig = () =>
  useApiQuery<GeneralConfigResponse>(
    'useGeneralConfig',
    '/configurations/general',
  );

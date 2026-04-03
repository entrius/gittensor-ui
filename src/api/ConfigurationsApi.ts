import { useApiQuery } from './ApiUtils';
import { type GeneralConfigResponse } from './models';

/**
 * Get general configuration data (branding, scoring parameters, thresholds)
 * Uses the /configurations/general endpoint
 */
export const useGeneralConfig = () =>
  useApiQuery<GeneralConfigResponse>(
    'useGeneralConfig',
    '/configurations/general',
  );

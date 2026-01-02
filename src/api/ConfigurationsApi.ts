import { useApiQuery } from "./ApiUtils";
import { TierConfigResponse } from "./models";

/**
 * Get tier configuration data (requirements and scoring parameters)
 * Uses the /configurations/tiers endpoint
 */
export const useTierConfigurations = () =>
  useApiQuery<TierConfigResponse>(
    "useTierConfigurations",
    "/configurations/tiers",
  );

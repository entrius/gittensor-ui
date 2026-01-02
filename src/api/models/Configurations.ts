export interface TierConfig {
  name: string;
  level: number;
  requiredMerges: number;
  requiredCredibility: number;
  credibilityScalar: number;
  mergedPrBaseScore: number;
  contributionScoreForFullBonus: number;
  contributionScoreMaxBonus: number;
  openPrCollateralPercentage: number;
}

export interface TierConfigResponse {
  tiers: TierConfig[];
  tierOrder: string[];
}

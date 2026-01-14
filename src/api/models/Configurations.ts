export interface TierConfig {
  name: string;
  level: number;
  requiredCredibility: number;
  requiredMinTokenScore: number | null;
  requiredMinTokenScorePerRepo: number;
  requiredQualifiedUniqueRepos: number;
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

export interface GittensorBranding {
  prTaglinePrefix: string;
  minerDetailsUrl: string;
}

export interface LanguageFileScoring {
  defaultProgrammingLanguageWeight: number;
  testFileContributionWeight: number;
  mitigatedExtensions: string[];
  maxLinesScoredForMitigatedExt: number;
}

export interface RepositoryPrScoring {
  defaultMergedPrBaseScore: number;
  mergedPrContributionBonusScoreMax: number;
  uniquePrBoost: number;
  maxIssueCloseWindowDays: number;
  maxIssueAgeForMaxScore: number;
  timeDecayGracePeriodHours: number;
  timeDecaySigmoidMidpoint: number;
  timeDecaySigmoidSteepnessScalar: number;
  timeDecayMinMultiplier: number;
  excessivePrPenaltyThreshold: number;
  excessivePrPenaltySlope: number;
  excessivePrMinMultiplier: number;
}

export interface GeneralConfigResponse {
  branding: GittensorBranding;
  languageFileScoring: LanguageFileScoring;
  repositoryPrScoring: RepositoryPrScoring;
}

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
  // Dynamic open PR threshold params
  openPrThresholdTokenScore: number;
  maxOpenPrThreshold: number;
}

export interface GeneralConfigResponse {
  languageFileScoring: LanguageFileScoring;
  repositoryPrScoring: RepositoryPrScoring;
}

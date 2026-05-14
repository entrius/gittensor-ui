import type { IssueBounty } from '../api/models/Issues';

export interface BountyPoolByRepositoryRow {
  repository: string;
  label: string;
  value: number;
}

const parseBountyAmount = (value: string | null | undefined): number => {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

export const buildBountyPoolByRepositoryRows = (
  issues: IssueBounty[],
  limit = 20,
): BountyPoolByRepositoryRow[] => {
  const repoTotals = new Map<string, number>();

  issues.forEach((issue) => {
    const amount = parseBountyAmount(issue.targetBounty);
    repoTotals.set(
      issue.repositoryFullName,
      (repoTotals.get(issue.repositoryFullName) || 0) + amount,
    );
  });

  return [...repoTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([repository, value]) => ({
      repository,
      label: repository.split('/')[1] || repository,
      value,
    }));
};

import type { IssueBounty } from '../api/models/Issues';

export interface BountyRepositoryPool {
  repositoryFullName: string;
  repositoryName: string;
  amount: number;
}

const parseBountyAmount = (issue: IssueBounty): number => {
  const rawAmount = issue.targetBounty || issue.bountyAmount || '0';
  const amount = Number.parseFloat(rawAmount);
  return Number.isFinite(amount) ? amount : 0;
};

export const getBountyPoolByRepository = (
  issues: IssueBounty[],
  limit = 20,
): BountyRepositoryPool[] => {
  const repoTotals = new Map<string, number>();

  issues.forEach((issue) => {
    repoTotals.set(
      issue.repositoryFullName,
      (repoTotals.get(issue.repositoryFullName) || 0) +
        parseBountyAmount(issue),
    );
  });

  return [...repoTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([repositoryFullName, amount]) => ({
      repositoryFullName,
      repositoryName: repositoryFullName.split('/')[1] || repositoryFullName,
      amount,
    }));
};

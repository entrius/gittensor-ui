import { describe, expect, it } from 'vitest';
import { getBountyPoolByRepository } from '../utils/bountyPoolByRepository';
import type { IssueBounty } from '../api/models/Issues';

const bounty = (
  id: number,
  repositoryFullName: string,
  targetBounty: string,
  bountyAmount = '0',
): IssueBounty => ({
  id,
  githubUrl: `https://github.com/${repositoryFullName}/issues/${id}`,
  repositoryFullName,
  issueNumber: id,
  bountyAmount,
  targetBounty,
  status: 'active',
  solverHotkey: null,
  winningPrNumber: null,
  registeredAtBlock: 0,
  createdAt: '2026-05-12T00:00:00Z',
  updatedAt: '2026-05-12T00:00:00Z',
  closedAt: null,
  completedAt: null,
  title: `Issue ${id}`,
});

describe('getBountyPoolByRepository', () => {
  it('aggregates watched bounty amounts by repository and sorts by pool size', () => {
    const result = getBountyPoolByRepository([
      bounty(1, 'owner/a', '1.5'),
      bounty(2, 'owner/b', '4'),
      bounty(3, 'owner/a', '2.25'),
    ]);

    expect(result).toEqual([
      { repositoryFullName: 'owner/b', repositoryName: 'b', amount: 4 },
      { repositoryFullName: 'owner/a', repositoryName: 'a', amount: 3.75 },
    ]);
  });

  it('falls back to bountyAmount when targetBounty is missing', () => {
    const result = getBountyPoolByRepository([bounty(1, 'owner/a', '', '2.5')]);

    expect(result).toEqual([
      { repositoryFullName: 'owner/a', repositoryName: 'a', amount: 2.5 },
    ]);
  });

  it('limits chart data to the top repositories', () => {
    const issues = Array.from({ length: 25 }, (_, index) =>
      bounty(index + 1, `owner/repo-${index + 1}`, String(index + 1)),
    );

    const result = getBountyPoolByRepository(issues, 20);

    expect(result).toHaveLength(20);
    expect(result[0]).toMatchObject({
      repositoryFullName: 'owner/repo-25',
      amount: 25,
    });
    expect(result[result.length - 1]).toMatchObject({
      repositoryFullName: 'owner/repo-6',
      amount: 6,
    });
  });
});

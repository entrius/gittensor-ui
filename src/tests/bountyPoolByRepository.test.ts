import { describe, expect, it } from 'vitest';
import type { IssueBounty } from '../api/models/Issues';
import { buildBountyPoolByRepositoryRows } from '../utils/bountyPoolByRepository';

const issue = (
  id: number,
  repositoryFullName: string,
  targetBounty: string,
): IssueBounty => ({
  id,
  repositoryFullName,
  targetBounty,
  githubUrl: `https://github.com/${repositoryFullName}/issues/${id}`,
  issueNumber: id,
  bountyAmount: targetBounty,
  status: 'active',
  solverHotkey: null,
  winningPrNumber: null,
  registeredAtBlock: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  closedAt: null,
  completedAt: null,
  title: `Issue ${id}`,
});

describe('buildBountyPoolByRepositoryRows', () => {
  it('aggregates bounty pool by repository and sorts descending', () => {
    const rows = buildBountyPoolByRepositoryRows([
      issue(1, 'owner/a', '1.5'),
      issue(2, 'owner/b', '4'),
      issue(3, 'owner/a', '2.25'),
    ]);

    expect(rows).toEqual([
      { repository: 'owner/b', label: 'b', value: 4 },
      { repository: 'owner/a', label: 'a', value: 3.75 },
    ]);
  });

  it('limits rows and treats invalid amounts as zero', () => {
    const rows = buildBountyPoolByRepositoryRows(
      [
        issue(1, 'owner/a', 'not-a-number'),
        issue(2, 'owner/b', '2'),
        issue(3, 'owner/c', '1'),
      ],
      2,
    );

    expect(rows).toEqual([
      { repository: 'owner/b', label: 'b', value: 2 },
      { repository: 'owner/c', label: 'c', value: 1 },
    ]);
  });
});

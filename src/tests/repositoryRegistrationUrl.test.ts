import { describe, expect, it } from 'vitest';
import { extractRepoFullName } from '../utils/githubRepoUrl';

describe('extractRepoFullName', () => {
  it('normalizes common GitHub repository URLs', () => {
    expect(extractRepoFullName('https://github.com/owner/repo')).toBe(
      'owner/repo',
    );
    expect(
      extractRepoFullName('https://github.com/owner/repo?tab=readme-ov-file'),
    ).toBe('owner/repo');
    expect(extractRepoFullName('https://github.com/owner/repo#readme')).toBe(
      'owner/repo',
    );
    expect(extractRepoFullName('https://github.com/owner/repo/tree/main')).toBe(
      'owner/repo',
    );
  });

  it('rejects URLs without a valid GitHub owner and repository', () => {
    expect(extractRepoFullName('https://github.com/owner')).toBe(null);
    expect(extractRepoFullName('https://example.com/owner/repo')).toBe(null);
    expect(extractRepoFullName('not a url')).toBe(null);
  });
});

import { describe, expect, it } from 'vitest';
import {
  COMMIT_LOG_PAGE_LIMIT,
  getNextCommitLogPageParam,
} from '../api/DashboardApi';
import type { CommitLog } from '../api/models/Dashboard';

const makePage = (length: number) =>
  Array.from({ length }, () => ({}) as CommitLog);

describe('getNextCommitLogPageParam', () => {
  it('returns page 2 when the first page is full', () => {
    expect(getNextCommitLogPageParam(makePage(COMMIT_LOG_PAGE_LIMIT), 1)).toBe(
      2,
    );
  });

  it('uses the last page param instead of the number of cached pages', () => {
    expect(getNextCommitLogPageParam(makePage(COMMIT_LOG_PAGE_LIMIT), 5)).toBe(
      6,
    );
  });

  it('returns undefined when the last page is not full', () => {
    expect(
      getNextCommitLogPageParam(makePage(COMMIT_LOG_PAGE_LIMIT - 1), 5),
    ).toBeUndefined();
  });

  it('returns undefined for an empty page', () => {
    expect(getNextCommitLogPageParam(makePage(0), 5)).toBeUndefined();
  });
});

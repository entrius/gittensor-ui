import { describe, it, expect } from 'vitest';
import { compareMiners } from '../components/leaderboard/TopMinersTable';
import type { MinerStats } from '../components/leaderboard/types';

const baseMiner = (overrides: Partial<MinerStats>): MinerStats => ({
  id: overrides.id ?? '0',
  githubId: overrides.githubId ?? '',
  totalScore: 0,
  baseTotalScore: 0,
  totalPRs: 0,
  linesChanged: 0,
  linesAdded: 0,
  linesDeleted: 0,
  hotkey: 'N/A',
  ...overrides,
});

const noWatch = () => false;

describe('compareMiners credibility sort', () => {
  it('uses PR credibility on the OSS variant', () => {
    const high = baseMiner({ id: 'h', credibility: 0.95, issueCredibility: 0 });
    const low = baseMiner({ id: 'l', credibility: 0.5, issueCredibility: 1 });

    // OSS variant should rank by credibility, not issueCredibility,
    // so `high` (credibility 0.95) outranks `low` (credibility 0.5).
    expect(
      compareMiners(high, low, 'credibility', noWatch, 'oss'),
    ).toBeGreaterThan(0);
  });

  it('uses issue credibility on the Discoveries variant', () => {
    // On the Discoveries page MinerCard renders issueCredibility, so the
    // Credibility column must sort by the same field.
    const a = baseMiner({ id: 'a', credibility: 0.5, issueCredibility: 0.9 });
    const b = baseMiner({ id: 'b', credibility: 0.95, issueCredibility: 0.4 });

    expect(
      compareMiners(a, b, 'credibility', noWatch, 'discoveries'),
    ).toBeGreaterThan(0);
  });

  it('treats missing credibility as 0 on either variant', () => {
    const populated = baseMiner({
      id: 'p',
      credibility: 0.7,
      issueCredibility: 0.7,
    });
    const empty = baseMiner({ id: 'e' });

    expect(
      compareMiners(populated, empty, 'credibility', noWatch, 'oss'),
    ).toBeGreaterThan(0);
    expect(
      compareMiners(populated, empty, 'credibility', noWatch, 'discoveries'),
    ).toBeGreaterThan(0);
  });

  it('defaults to the OSS comparator when no variant is supplied', () => {
    const a = baseMiner({ id: 'a', credibility: 0.9, issueCredibility: 0.1 });
    const b = baseMiner({ id: 'b', credibility: 0.1, issueCredibility: 0.9 });

    expect(compareMiners(a, b, 'credibility', noWatch)).toBeGreaterThan(0);
  });
});

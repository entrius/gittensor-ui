import { REPOSITORY_PR_STATUS_CHIP } from '../theme';

export interface PrStatusLike {
  mergedAt?: string | null;
  prState?: string | null;
}

/** Table status chip color (aligned with Repository Stats / filter accents). */
export function getPrStatusChipColor(state: string, neutral: string): string {
  switch (state) {
    case 'MERGED':
      return REPOSITORY_PR_STATUS_CHIP.merged;
    case 'OPEN':
      return REPOSITORY_PR_STATUS_CHIP.open;
    case 'CLOSED':
      return REPOSITORY_PR_STATUS_CHIP.closed;
    default:
      return neutral;
  }
}

export const isOpenPr = (pr: PrStatusLike): boolean =>
  pr.prState === 'OPEN' || (!pr.prState && !pr.mergedAt);

export const isMergedPr = (pr: PrStatusLike): boolean =>
  pr.prState === 'MERGED' || !!pr.mergedAt;

export const isClosedUnmergedPr = (pr: PrStatusLike): boolean =>
  pr.prState === 'CLOSED' && !pr.mergedAt;

export const getPrStatusCounts = <T extends PrStatusLike>(prs: T[]) => ({
  all: prs.length,
  open: prs.filter(isOpenPr).length,
  merged: prs.filter(isMergedPr).length,
  closed: prs.filter(isClosedUnmergedPr).length,
});

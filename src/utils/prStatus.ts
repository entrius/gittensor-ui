import { STATUS_COLORS } from '../theme';
import { formatDate } from './format';

export interface PrStatusLike {
  mergedAt?: string | null;
  prState?: string | null;
}

export interface PrScoreLike extends PrStatusLike {
  collateralScore?: string | null;
  score?: string | null;
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

export const getPrStatusChipMeta = (pr: PrStatusLike) => {
  const merged = isMergedPr(pr);
  const closed = isClosedUnmergedPr(pr);
  return {
    label: merged ? 'Merged' : closed ? 'Closed' : 'Open',
    color: merged
      ? STATUS_COLORS.merged
      : closed
        ? STATUS_COLORS.closed
        : STATUS_COLORS.open,
  };
};

/** Score used for sort/display: merged score, open collateral, closed-unmerged → 0. */
export const getMinerPrEffectiveScore = (pr: PrScoreLike): number => {
  if (pr.prState === 'CLOSED' && !pr.mergedAt) return 0;
  if (!pr.mergedAt && pr.collateralScore) {
    return parseFloat(pr.collateralScore || '0');
  }
  return parseFloat(pr.score || '0');
};

export const getMinerPrCardDisplayDate = (pr: PrStatusLike): string =>
  pr.mergedAt
    ? formatDate(pr.mergedAt)
    : pr.prState === 'CLOSED'
      ? 'Closed'
      : 'Open';

export const formatMinerPrScoreDisplay = (
  pr: PrScoreLike,
  score: number,
  isCollateral: boolean,
): string =>
  pr.prState === 'CLOSED' && !pr.mergedAt
    ? '—'
    : isCollateral
      ? score.toFixed(4)
      : score.toFixed(2);

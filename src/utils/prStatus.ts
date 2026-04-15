export interface PrStatusLike {
  mergedAt?: string | null;
  prState?: string | null;
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

export const getPrStateColor = (
  prState: string | null | undefined,
  statusPalette: { closed: string; merged: string; open: string },
): string =>
  prState === 'CLOSED'
    ? statusPalette.closed
    : prState === 'MERGED'
      ? statusPalette.merged
      : statusPalette.open;

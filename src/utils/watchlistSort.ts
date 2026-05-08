export function compareByWatchlist<T>(
  a: T,
  b: T,
  getKey: (item: T) => string | undefined,
  isWatched: (key: string) => boolean,
): number {
  const aK = getKey(a);
  const bK = getKey(b);
  return +(aK != null && isWatched(aK)) - +(bK != null && isWatched(bK));
}

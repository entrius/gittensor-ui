/** Split watchlist search on `&` into AND terms (case-insensitive matching). */
export function parseSearchTerms(query: string): string[] {
  return query
    .split('&')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/** Committed tags plus optional in-progress draft (live filter while typing). */
export function joinSearchTerms(terms: string[], draft = ''): string {
  const parts = [...terms];
  const d = draft.trim();
  if (d) parts.push(d);
  return parts.join(' & ');
}

export function matchesAllSearchTerms(
  haystack: string,
  query: string,
): boolean {
  const terms = parseSearchTerms(query);
  if (terms.length === 0) return true;
  const normalized = haystack.toLowerCase();
  return terms.every((term) => normalized.includes(term));
}

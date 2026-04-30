/**
 * Shared base for "cards vs list" view-mode toggles. Issues, Repositories,
 * Leaderboard etc. all expose the same toggle with the same row sizes; this
 * module owns the type, the row constants, the URL-param decoder, and a
 * storage-key-bound `read`/`write` factory so each per-feature module is a
 * thin wrapper instead of a copy.
 */

export type CardListViewMode = 'cards' | 'list';

export const CARD_LIST_VIEW_QUERY_PARAM = 'view';

export const LIST_ROW_SIZES = [10, 25, 50] as const;
export const CARD_ROW_SIZES = [12, 24, 48] as const;
export const VALID_ROW_SIZES: readonly number[] = [
  ...LIST_ROW_SIZES,
  ...CARD_ROW_SIZES,
];
export const DEFAULT_LIST_ROWS = 10;
export const DEFAULT_CARD_ROWS = 12;

export const cardListViewModeFromQuery = (
  value: string | null,
  fallback: CardListViewMode,
): CardListViewMode => {
  if (value === 'cards') return 'cards';
  if (value === 'list') return 'list';
  return fallback;
};

export const clampCardListRows = (
  rows: number,
  mode: CardListViewMode,
): number => {
  const options = mode === 'cards' ? CARD_ROW_SIZES : LIST_ROW_SIZES;
  if ((options as readonly number[]).includes(rows)) return rows;
  return mode === 'cards' ? DEFAULT_CARD_ROWS : DEFAULT_LIST_ROWS;
};

/**
 * Bind storage helpers to a specific localStorage key. Returns no-throw
 * read/write functions so callers don't need their own try/catch.
 */
export const createCardListViewModeStorage = (
  storageKey: string,
  defaultMode: CardListViewMode = 'list',
) => ({
  read: (): CardListViewMode => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === 'cards') return 'cards';
      if (stored === 'list') return 'list';
      return defaultMode;
    } catch {
      return defaultMode;
    }
  },
  write: (mode: CardListViewMode): void => {
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {
      /* private mode / quota — preference won't persist */
    }
  },
});

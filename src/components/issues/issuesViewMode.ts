export type IssuesViewMode = 'cards' | 'list';

export const ISSUES_VIEW_QUERY_PARAM = 'view';
export const ISSUES_VIEW_STORAGE_KEY = 'issues:viewMode';

export const readStoredIssuesViewMode = (): IssuesViewMode => {
  try {
    return window.localStorage.getItem(ISSUES_VIEW_STORAGE_KEY) === 'cards'
      ? 'cards'
      : 'list';
  } catch {
    return 'list';
  }
};

export const writeStoredIssuesViewMode = (mode: IssuesViewMode): void => {
  try {
    window.localStorage.setItem(ISSUES_VIEW_STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable (private mode, quota) — preference won't persist
  }
};

export const getIssuesViewModeFromQuery = (
  value: string | null,
  fallback: IssuesViewMode,
): IssuesViewMode => {
  if (value === 'cards') return 'cards';
  if (value === 'list') return 'list';
  return fallback;
};

// Card grid: 3 cols (lg/md), 2 (sm), 1 (xs). Sizes divisible by 1, 2, 3 so
// the last row of cards is never partial.
export const ISSUES_LIST_ROWS = [10, 25, 50] as const;
export const ISSUES_CARD_ROWS = [12, 24, 48] as const;
export const ISSUES_VALID_ROWS: readonly number[] = [
  ...ISSUES_LIST_ROWS,
  ...ISSUES_CARD_ROWS,
];
export const ISSUES_DEFAULT_LIST_ROWS = 10;
export const ISSUES_DEFAULT_CARD_ROWS = 12;

export const clampRowsForIssuesView = (
  rows: number,
  mode: IssuesViewMode,
): number => {
  const options = mode === 'cards' ? ISSUES_CARD_ROWS : ISSUES_LIST_ROWS;
  if ((options as readonly number[]).includes(rows)) return rows;
  return mode === 'cards' ? ISSUES_DEFAULT_CARD_ROWS : ISSUES_DEFAULT_LIST_ROWS;
};

import {
  CARD_LIST_VIEW_QUERY_PARAM,
  CARD_ROW_SIZES,
  DEFAULT_CARD_ROWS,
  DEFAULT_LIST_ROWS,
  LIST_ROW_SIZES,
  VALID_ROW_SIZES,
  cardListViewModeFromQuery,
  clampCardListRows,
  createCardListViewModeStorage,
  type CardListViewMode,
} from '../../utils/cardListViewMode';

export type IssuesViewMode = CardListViewMode;

export const ISSUES_VIEW_QUERY_PARAM = CARD_LIST_VIEW_QUERY_PARAM;
export const ISSUES_VIEW_STORAGE_KEY = 'issues:viewMode';

const storage = createCardListViewModeStorage(ISSUES_VIEW_STORAGE_KEY);
export const readStoredIssuesViewMode = storage.read;
export const writeStoredIssuesViewMode = storage.write;

export const getIssuesViewModeFromQuery = cardListViewModeFromQuery;

export const ISSUES_LIST_ROWS = LIST_ROW_SIZES;
export const ISSUES_CARD_ROWS = CARD_ROW_SIZES;
export const ISSUES_VALID_ROWS = VALID_ROW_SIZES;
export const ISSUES_DEFAULT_LIST_ROWS = DEFAULT_LIST_ROWS;
export const ISSUES_DEFAULT_CARD_ROWS = DEFAULT_CARD_ROWS;

export const clampRowsForIssuesView = clampCardListRows;

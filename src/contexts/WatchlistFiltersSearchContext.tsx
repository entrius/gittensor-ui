import { createContext, useContext, type ReactNode } from 'react';

const WatchlistFiltersSearchContext = createContext<ReactNode>(null);

export const WatchlistFiltersSearchProvider =
  WatchlistFiltersSearchContext.Provider;

export function useWatchlistFiltersSearchSlot(): ReactNode {
  return useContext(WatchlistFiltersSearchContext);
}

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  ButtonBase,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type Theme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSearchResults } from '../../pages/search/searchData';

const QUICK_RESULT_LIMIT = 3;
const DROPDOWN_CLOSE_DELAY_MS = 150;
const LISTBOX_ID = 'global-search-listbox';
const itemIdFromKey = (key: string) => `global-search-item-${key}`;

type NavItemKind = 'miner' | 'repo' | 'pr' | 'issue' | 'action';

type NavItem = {
  key: string;
  kind: NavItemKind;
  title: string;
  subtitle: string;
  onSelect: () => void;
};

const SECTION_LABELS: Record<Exclude<NavItemKind, 'action'>, string> = {
  miner: 'Miners',
  repo: 'Repositories',
  pr: 'Pull Requests',
  issue: 'Issues',
};

const rowSx = (theme: Theme, active: boolean) => ({
  width: '100%',
  textAlign: 'left',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  p: 1.1,
  borderRadius: '8px',
  border: `1px solid ${
    active ? theme.palette.primary.main : theme.palette.border.subtle
  }`,
  backgroundColor: active
    ? theme.palette.surface.light
    : theme.palette.surface.subtle,
  transition: 'background-color 0.12s, border-color 0.12s',
  '&:hover': {
    backgroundColor: theme.palette.surface.light,
    borderColor: active
      ? theme.palette.primary.main
      : theme.palette.border.light,
  },
});

const subtitleSx = (theme: Theme) => ({
  color: theme.palette.text.secondary,
});

type SectionLabelProps = {
  label: string;
  hasResultsAbove: boolean;
};

const SectionLabel: React.FC<SectionLabelProps> = ({
  label,
  hasResultsAbove,
}) => (
  <Typography
    sx={(theme) => ({
      px: 0.5,
      py: 0.25,
      pt: hasResultsAbove ? 0.75 : 0.25,
      ...theme.typography.monoSmall,
      color: theme.palette.text.secondary,
      letterSpacing: '0.06em',
    })}
  >
    {label}
  </Typography>
);

type ResultRowProps = {
  item: NavItem;
  active: boolean;
  rowRef: (el: HTMLButtonElement | null) => void;
  onMouseEnter: () => void;
};

const ResultRow: React.FC<ResultRowProps> = ({
  item,
  active,
  rowRef,
  onMouseEnter,
}) => {
  const isAction = item.kind === 'action';
  return (
    <ButtonBase
      id={itemIdFromKey(item.key)}
      ref={rowRef}
      role="option"
      aria-selected={active}
      sx={(theme) => rowSx(theme, active)}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onMouseEnter}
      onClick={item.onSelect}
    >
      <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
        <Typography
          sx={(theme) => ({
            color: isAction
              ? theme.palette.primary.main
              : theme.palette.text.primary,
            fontSize: isAction ? '0.9rem' : '0.92rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          })}
        >
          {item.title}
        </Typography>
        {item.subtitle ? (
          <Typography
            variant="caption"
            sx={(theme) => ({
              ...subtitleSx(theme),
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            })}
          >
            {item.subtitle}
          </Typography>
        ) : null}
      </Box>
      <ArrowForwardIcon fontSize="small" />
    </ButtonBase>
  );
};

const EmptyState: React.FC = () => (
  <Box
    sx={(theme) => ({
      px: 1,
      py: 2,
      borderRadius: '8px',
      border: `1px solid ${theme.palette.border.subtle}`,
      backgroundColor: theme.palette.surface.subtle,
    })}
  >
    <Typography
      sx={(theme) => ({
        color: theme.palette.text.primary,
        fontSize: '0.82rem',
      })}
    >
      No quick matches found.
    </Typography>
    <Typography variant="caption" sx={subtitleSx}>
      Press Enter to search all results.
    </Typography>
  </Box>
);

const getMinerSubtitle = (miner: { leaderboardRank: number }) =>
  miner.leaderboardRank > 0 ? `Rank #${miner.leaderboardRank}` : '';

const detectMac = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(ua);
};

const GlobalSearchBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname === '/search';
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isMac] = useState(detectMac);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const blurTimerRef = useRef<number | null>(null);

  // Activate dataset loading after first interaction (or immediately on /search).
  const [isSearchActivated, setIsSearchActivated] = useState(isSearchPage);

  const {
    datasets,
    hasQuery,
    minerResults,
    repositoryResults,
    prResults,
    issueResults,
  } = useSearchResults(
    query,
    {
      miners: QUICK_RESULT_LIMIT,
      repositories: QUICK_RESULT_LIMIT,
      prs: QUICK_RESULT_LIMIT,
      issues: QUICK_RESULT_LIMIT,
    },
    isSearchActivated || isSearchPage,
    'quick',
  );

  const isLoading =
    datasets.miners.isLoading ||
    datasets.repositories.isLoading ||
    datasets.prs.isLoading ||
    datasets.issues.isLoading;

  const hasAnyResults =
    minerResults.length > 0 ||
    repositoryResults.length > 0 ||
    prResults.length > 0 ||
    issueResults.length > 0;

  const trimmedQuery = query.trim();

  // Sync URL query param on /search page.
  useEffect(() => {
    if (!isSearchPage) return;
    const qFromUrl = searchParams.get('q') || '';
    setQuery((prev) => (prev === qFromUrl ? prev : qFromUrl));
  }, [isSearchPage, searchParams]);

  const updateSearchPageQuery = useCallback(
    (value: string) => {
      if (!isSearchPage) return;
      const params = new URLSearchParams(searchParams);
      const trimmedValue = value.trim();
      if (trimmedValue) {
        params.set('q', trimmedValue);
      } else {
        params.delete('q');
      }
      setSearchParams(params, { replace: true });
    },
    [isSearchPage, searchParams, setSearchParams],
  );

  const closeDropdown = useCallback(() => {
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setIsDropdownOpen(false);
  }, []);

  const navigateAndClose = useCallback(
    (path: string) => {
      navigate(path);
      closeDropdown();
    },
    [navigate, closeDropdown],
  );

  const openFullSearch = useCallback(() => {
    if (!trimmedQuery) return;
    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    closeDropdown();
  }, [trimmedQuery, navigate, closeDropdown]);

  const clearQuery = () => {
    setQuery('');
    updateSearchPageQuery('');
  };

  // Flat, indexable list of navigable items — single source of truth for both
  // rendering and keyboard navigation.
  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    minerResults.forEach((miner) => {
      items.push({
        key: `miner-${miner.githubId}`,
        kind: 'miner',
        title: miner.githubUsername || miner.githubId,
        subtitle: getMinerSubtitle(miner),
        onSelect: () =>
          navigateAndClose(
            `/miners/details?githubId=${encodeURIComponent(miner.githubId)}`,
          ),
      });
    });
    repositoryResults.forEach((repo) => {
      items.push({
        key: `repo-${repo.fullName}`,
        kind: 'repo',
        title: repo.fullName,
        subtitle: repo.owner,
        onSelect: () =>
          navigateAndClose(
            `/miners/repository?name=${encodeURIComponent(repo.fullName)}`,
          ),
      });
    });
    prResults.forEach((pr) => {
      items.push({
        key: `pr-${pr.repository}-${pr.pullRequestNumber}`,
        kind: 'pr',
        title: `${pr.repository} #${pr.pullRequestNumber}`,
        subtitle: pr.pullRequestTitle,
        onSelect: () =>
          navigateAndClose(
            `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
          ),
      });
    });
    issueResults.forEach((issue) => {
      items.push({
        key: `issue-${issue.id}`,
        kind: 'issue',
        title:
          issue.title || `${issue.repositoryFullName} #${issue.issueNumber}`,
        subtitle: `${issue.repositoryFullName} · #${issue.issueNumber}`,
        onSelect: () => navigateAndClose(`/bounties/details?id=${issue.id}`),
      });
    });
    if (trimmedQuery) {
      items.push({
        key: 'action-open-full',
        kind: 'action',
        title: `Open full search for "${trimmedQuery}"`,
        subtitle: '',
        onSelect: openFullSearch,
      });
    }
    return items;
  }, [
    minerResults,
    repositoryResults,
    prResults,
    issueResults,
    trimmedQuery,
    navigateAndClose,
    openFullSearch,
  ]);

  // Reset the active row when the result set changes. `navItems` is wrapped
  // in useMemo with stable deps, so its identity only changes when the actual
  // results change — safe to use as a dep directly.
  useEffect(() => {
    setActiveIndex(navItems.length > 0 ? 0 : -1);
  }, [navItems]);

  // Scroll the active row into view as it changes.
  useEffect(() => {
    if (activeIndex < 0) return;
    const activeKey = navItems[activeIndex]?.key;
    if (!activeKey) return;
    const el = rowRefs.current[activeKey];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, navItems]);

  // Global shortcuts: Cmd/Ctrl+K and "/" to focus the search input.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = inputRef.current;
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target =
          (e.target as HTMLElement | null) ||
          (document.activeElement as HTMLElement | null);
        if (!target) return;
        const tag = target.tagName;
        const isEditable =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          target.isContentEditable === true;
        if (isEditable) return;
        // Don't steal focus from open modals / menus / select popovers.
        if (
          target.closest(
            '[role="dialog"], [role="menu"], [role="listbox"], [aria-modal="true"]',
          )
        ) {
          return;
        }
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const showDropdown = !isSearchPage && isDropdownOpen && hasQuery;

  const moveActive = (delta: number) => {
    if (navItems.length === 0) return;
    setActiveIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      return (base + delta + navItems.length) % navItems.length;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && activeIndex >= 0 && navItems[activeIndex]) {
        navItems[activeIndex].onSelect();
      } else {
        openFullSearch();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (showDropdown) {
        e.preventDefault();
        closeDropdown();
      } else {
        inputRef.current?.blur();
      }
      return;
    }

    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        if (navItems.length > 0) setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        if (navItems.length > 0) setActiveIndex(navItems.length - 1);
        break;
    }
  };

  const activeDescendantId =
    showDropdown && activeIndex >= 0 && navItems[activeIndex]
      ? itemIdFromKey(navItems[activeIndex].key)
      : undefined;

  // Stable ref callback factory — the inner ref closure doesn't change per
  // render, avoiding the "null then element" churn on every re-render.
  const getRowRef = useCallback(
    (key: string) => (el: HTMLButtonElement | null) => {
      if (el) {
        rowRefs.current[key] = el;
      } else {
        delete rowRefs.current[key];
      }
    },
    [],
  );

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 900 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search miners, repositories, PRs, issues..."
        value={query}
        autoComplete="off"
        inputRef={inputRef}
        onFocus={() => {
          setIsSearchActivated(true);
          setIsDropdownOpen(true);
        }}
        onBlur={() => {
          if (blurTimerRef.current !== null) {
            window.clearTimeout(blurTimerRef.current);
          }
          blurTimerRef.current = window.setTimeout(() => {
            setIsDropdownOpen(false);
            blurTimerRef.current = null;
          }, DROPDOWN_CLOSE_DELAY_MS);
        }}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          // Reopen dropdown if the user dismissed it with Esc and is now
          // typing again — the input still has focus, so this matches the
          // common "Esc = hide for now, keep typing to reopen" pattern.
          setIsDropdownOpen(true);
          updateSearchPageQuery(value);
        }}
        onKeyDown={handleKeyDown}
        InputProps={{
          role: 'combobox',
          'aria-expanded': showDropdown,
          'aria-haspopup': 'listbox',
          'aria-controls': LISTBOX_ID,
          'aria-activedescendant': activeDescendantId,
          'aria-autocomplete': 'list',
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon
                sx={(theme) => ({
                  color: theme.palette.text.secondary,
                  fontSize: '1rem',
                })}
              />
            </InputAdornment>
          ),
          endAdornment: query ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={clearQuery}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
                aria-label="clear search"
                sx={(theme) => ({ color: theme.palette.text.secondary })}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : (
            <InputAdornment position="end">
              <Box
                aria-hidden
                sx={(theme) => ({
                  display: { xs: 'none', md: 'inline-flex' },
                  alignItems: 'center',
                  px: 0.75,
                  py: 0.1,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.border.light}`,
                  color: theme.palette.text.secondary,
                  fontSize: '0.68rem',
                  lineHeight: 1.4,
                  userSelect: 'none',
                  pointerEvents: 'none',
                })}
              >
                {isMac ? '⌘K' : 'Ctrl K'}
              </Box>
            </InputAdornment>
          ),
        }}
        sx={(theme) => ({
          '& .MuiOutlinedInput-root': {
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.surface.subtle,
            fontSize: '0.85rem',
            borderRadius: 2,
            '& fieldset': { borderColor: theme.palette.border.light },
            '&:hover fieldset': { borderColor: theme.palette.border.medium },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.primary.main,
            },
          },
          '& .MuiInputBase-input::placeholder': {
            fontSize: '0.8rem',
            opacity: 0.75,
          },
        })}
      />

      {showDropdown && (
        <Paper
          id={LISTBOX_ID}
          role="listbox"
          elevation={0}
          sx={(theme) => ({
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: theme.zIndex.modal,
            p: 1.2,
            border: `1px solid ${theme.palette.border.light}`,
            borderRadius: 2,
            backgroundColor: theme.palette.background.default,
            maxHeight: 'min(420px, calc(100vh - 96px))',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.border.light,
              borderRadius: 1,
            },
          })}
        >
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}

          {!isLoading && (
            <Stack spacing={0.5} sx={{ pb: 0.5 }}>
              {!hasAnyResults && <EmptyState />}

              {navItems.map((item, idx) => {
                const prevItem = idx > 0 ? navItems[idx - 1] : null;
                const showSectionLabel =
                  item.kind !== 'action' &&
                  (!prevItem || prevItem.kind !== item.kind);
                return (
                  <React.Fragment key={item.key}>
                    {showSectionLabel && (
                      <SectionLabel
                        label={
                          SECTION_LABELS[
                            item.kind as Exclude<NavItemKind, 'action'>
                          ]
                        }
                        hasResultsAbove={idx > 0}
                      />
                    )}
                    <ResultRow
                      item={item}
                      active={idx === activeIndex}
                      rowRef={getRowRef(item.key)}
                      onMouseEnter={() => setActiveIndex(idx)}
                    />
                  </React.Fragment>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default GlobalSearchBar;

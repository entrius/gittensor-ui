import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const G_PREFIX_TIMEOUT_MS = 1000;

export type KeyboardShortcut = {
  keys: string[];
  label: string;
  path?: string;
};

export const keyboardShortcuts: KeyboardShortcut[] = [
  { keys: ['g', 'd'], label: 'Dashboard', path: '/dashboard' },
  { keys: ['g', 'l'], label: 'Top Miners', path: '/top-miners' },
  { keys: ['g', 'r'], label: 'Repositories', path: '/repositories' },
  { keys: ['g', 'b'], label: 'Bounties', path: '/bounties' },
  { keys: ['g', 'w'], label: 'Watchlist', path: '/watchlist' },
  { keys: ['g', 'o'], label: 'Onboard', path: '/onboard' },
  { keys: ['?'], label: 'Open keyboard shortcuts help' },
  { keys: ['Esc'], label: 'Close overlay or cancel sequence' },
];

const gPrefixRoutes = keyboardShortcuts.reduce<Record<string, string>>(
  (acc, shortcut) => {
    const [prefix, key] = shortcut.keys;
    if (prefix === 'g' && key && shortcut.path) {
      acc[key] = shortcut.path;
    }
    return acc;
  },
  {},
);

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable === true
  );
};

const isInsideOverlay = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      '[role="dialog"], [role="menu"], [role="listbox"], [aria-modal="true"]',
    ),
  );

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isGPrefixActive, setIsGPrefixActive] = useState(false);

  const clearPrefixTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancelPrefix = useCallback(() => {
    clearPrefixTimeout();
    setIsGPrefixActive(false);
  }, [clearPrefixTimeout]);

  const startPrefix = useCallback(() => {
    clearPrefixTimeout();
    setIsGPrefixActive(true);
    timeoutRef.current = window.setTimeout(cancelPrefix, G_PREFIX_TIMEOUT_MS);
  }, [cancelPrefix, clearPrefixTimeout]);

  const openHelp = useCallback(() => {
    cancelPrefix();
    setIsHelpOpen(true);
  }, [cancelPrefix]);

  const closeHelp = useCallback(() => {
    cancelPrefix();
    setIsHelpOpen(false);
  }, [cancelPrefix]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) {
        cancelPrefix();
        return;
      }

      if (e.key === 'Escape') {
        cancelPrefix();
        if (isHelpOpen) {
          setIsHelpOpen(false);
        }
        return;
      }

      if (isInsideOverlay(e.target)) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) {
        cancelPrefix();
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        openHelp();
        return;
      }

      const key = e.key.toLowerCase();
      if (isGPrefixActive) {
        const path = gPrefixRoutes[key];
        e.preventDefault();
        cancelPrefix();
        if (path) {
          navigate(path);
        }
        return;
      }

      if (key === 'g') {
        e.preventDefault();
        startPrefix();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearPrefixTimeout();
    };
  }, [
    cancelPrefix,
    clearPrefixTimeout,
    isGPrefixActive,
    isHelpOpen,
    navigate,
    openHelp,
    startPrefix,
  ]);

  return {
    isHelpOpen,
    closeHelp,
    shortcuts: keyboardShortcuts,
  };
};

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { createAppTheme, UI_COLORS, type ThemeMode } from '../theme';

const STORAGE_KEY = 'gittensor:theme-mode';
const DEFAULT_MODE: ThemeMode = 'dark';

interface ThemeModeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(
  undefined,
);

const readInitialMode = (): ThemeMode => {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to default.
  }
  return DEFAULT_MODE;
};

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<ThemeMode>(readInitialMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore persistence failures
    }
  }, [mode]);

  // Keep CSS variables, the body bootstrap inline style, and the html
  // data-attribute in sync. The body inline style mirrors the no-flash
  // bootstrap in index.html so toggling stays consistent without a reload.
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.style.setProperty('--gt-scroll-thumb', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty(
        '--gt-scroll-thumb-hover',
        'rgba(255, 255, 255, 0.2)',
      );
      document.body.style.backgroundColor = UI_COLORS.black;
    } else {
      root.style.setProperty('--gt-scroll-thumb', UI_COLORS.lightScrollThumb);
      root.style.setProperty(
        '--gt-scroll-thumb-hover',
        UI_COLORS.lightScrollThumbHover,
      );
      document.body.style.backgroundColor = UI_COLORS.white;
    }
    root.dataset.themeMode = mode;
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const value = useMemo<ThemeModeContextValue>(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = (): ThemeModeContextValue => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return ctx;
};

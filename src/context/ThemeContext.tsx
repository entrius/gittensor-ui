import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { type PaletteMode, CssBaseline } from '@mui/material';
import { getTheme, THEME_STORAGE_KEY } from '../theme';

interface ThemeModeContextValue {
  mode: PaletteMode;
  toggleTheme: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(
  undefined,
);

const getStoredMode = (): PaletteMode | null => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage may be unavailable (SSR, privacy mode, etc.)
  }
  return null;
};

const storeMode = (mode: PaletteMode): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Silently ignore storage errors
  }
};

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const stored = getStoredMode();
    if (stored) return stored;
    return 'dark';
  });

  const toggleTheme = useCallback(() => {
    // Disable all transitions during theme switch to prevent fade animation
    const css = document.createElement('style');
    css.textContent = '*, *::before, *::after { transition: none !important; }';
    document.head.appendChild(css);

    setMode((prev: PaletteMode) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      storeMode(next);
      return next;
    });

    // Re-enable transitions after the theme repaint completes
    setTimeout(() => {
      document.head.removeChild(css);
    }, 50);
  }, []);

  const theme = useMemo(() => getTheme(mode), [mode]);

  // Sync body inline background-color (index.html sets it for flash prevention,
  // but inline styles override CssBaseline so we must update it on toggle)
  useEffect(() => {
    document.body.style.backgroundColor =
      mode === 'dark' ? '#000000' : '#f5f6fa';
  }, [mode]);

  const value = useMemo(() => ({ mode, toggleTheme }), [mode, toggleTheme]);

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
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return context;
};

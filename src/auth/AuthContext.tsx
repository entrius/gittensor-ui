/**
 * GitHub-OAuth session state for the das-gittensor API.
 *
 * Flow (matches das AuthController):
 *  1. login() sends the browser to `{API}/auth/github`; das bounces through
 *     GitHub and redirects back to this app with `#token=<jwt>` in the fragment.
 *  2. On mount we capture that fragment, persist the JWT (see token.ts), and
 *     strip it from the URL so it isn't left in history / shared links.
 *  3. With a token present we call `GET /auth/me` to hydrate the user (and learn
 *     whether they're an admin). A 401 (expired/invalid) clears the session.
 *
 * The token is attached to API requests by the apiClient interceptor in
 * ApiUtils; this context only owns identity + login/logout.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '../api/ApiUtils';
import { clearAuthToken, getAuthToken, setAuthToken } from './token';

export type AuthUser = {
  githubId: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** True while the initial /auth/me hydration is in flight. */
  loading: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Pull `#token=...` out of the post-login redirect fragment, if present. */
function consumeTokenFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('token');
  if (!token) return null;
  // Remove the fragment without adding a history entry.
  const { pathname, search } = window.location;
  window.history.replaceState(null, '', `${pathname}${search}`);
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fromHash = consumeTokenFromHash();
    if (fromHash) {
      setAuthToken(fromHash);
    }

    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    apiClient
      .get<AuthUser>('/auth/me')
      .then(({ data }) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        // Expired or invalid session — drop it so the UI shows logged-out.
        clearAuthToken();
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    const base = import.meta.env.VITE_REACT_APP_BASE_URL ?? '';
    window.location.href = `${base}/auth/github`;
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.isAdmin ?? false,
      loading,
      login,
      logout,
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

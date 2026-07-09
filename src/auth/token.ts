/**
 * Session-token storage for the das-gittensor API.
 *
 * The token is an 8h JWT handed back by das after GitHub OAuth (delivered in the
 * post-login redirect fragment, see AuthContext). It is read here by both the
 * axios request interceptor (to attach `Authorization: Bearer`) and AuthContext.
 * localStorage access is wrapped so SSR / privacy-mode failures degrade to
 * "logged out" rather than throwing.
 */
const TOKEN_KEY = 'gittensor.authToken';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable — token stays in-memory only for this page load */
  }
};

export const clearAuthToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to do */
  }
};

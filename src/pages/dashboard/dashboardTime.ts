const HOUR_MS = 60 * 60 * 1000;

export const DASHBOARD_HOUR_MS = HOUR_MS;
export const DASHBOARD_DAY_MS = 24 * HOUR_MS;
export const DASHBOARD_WEEK_MS = 7 * DASHBOARD_DAY_MS;

export type WindowBounds = {
  startMs: number;
  endMs: number;
};

export const toTimestamp = (value?: string | null): number | null => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const isWithinWindow = (
  timestamp: number | null,
  window: WindowBounds,
) =>
  timestamp !== null && timestamp >= window.startMs && timestamp < window.endMs;

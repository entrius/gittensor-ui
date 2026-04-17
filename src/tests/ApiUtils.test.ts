import { describe, expect, it } from 'vitest';
import { type AxiosError } from 'axios';

import { MAX_RETRIES, getRetryDelay, shouldRetry } from '../api/ApiUtils';

const makeError = (status?: number): AxiosError =>
  ({
    response: status !== undefined ? { status } : undefined,
  }) as AxiosError;

// ─── shouldRetry ────────────────────────────────────────────────────────────

describe('shouldRetry', () => {
  describe('retryable status codes', () => {
    it('retries on 429 Too Many Requests', () => {
      expect(shouldRetry(0, makeError(429))).toBe(true);
    });

    it('retries on 500 Internal Server Error', () => {
      expect(shouldRetry(0, makeError(500))).toBe(true);
    });

    it('retries on 502 Bad Gateway', () => {
      expect(shouldRetry(0, makeError(502))).toBe(true);
    });

    it('retries on 503 Service Unavailable', () => {
      expect(shouldRetry(0, makeError(503))).toBe(true);
    });

    it('retries on 504 Gateway Timeout', () => {
      expect(shouldRetry(0, makeError(504))).toBe(true);
    });

    it('retries when there is no HTTP response (network error / timeout)', () => {
      expect(shouldRetry(0, makeError(undefined))).toBe(true);
    });
  });

  describe('non-retryable status codes', () => {
    it('does not retry on 400 Bad Request', () => {
      expect(shouldRetry(0, makeError(400))).toBe(false);
    });

    it('does not retry on 401 Unauthorized', () => {
      expect(shouldRetry(0, makeError(401))).toBe(false);
    });

    it('does not retry on 403 Forbidden', () => {
      expect(shouldRetry(0, makeError(403))).toBe(false);
    });

    it('does not retry on 404 Not Found', () => {
      expect(shouldRetry(0, makeError(404))).toBe(false);
    });

    it('does not retry on 422 Unprocessable Entity', () => {
      expect(shouldRetry(0, makeError(422))).toBe(false);
    });
  });

  describe('max retries enforcement', () => {
    it('stops retrying once MAX_RETRIES is reached on a 5xx', () => {
      expect(shouldRetry(MAX_RETRIES, makeError(500))).toBe(false);
    });

    it('stops retrying once MAX_RETRIES is reached on a 429', () => {
      expect(shouldRetry(MAX_RETRIES, makeError(429))).toBe(false);
    });

    it('stops retrying once MAX_RETRIES is reached on a network error', () => {
      expect(shouldRetry(MAX_RETRIES, makeError(undefined))).toBe(false);
    });

    it('still retries one attempt before the limit', () => {
      expect(shouldRetry(MAX_RETRIES - 1, makeError(500))).toBe(true);
    });
  });
});

// ─── getRetryDelay ──────────────────────────────────────────────────────────

describe('getRetryDelay', () => {
  it('returns 1 s on first retry (attempt 0)', () => {
    expect(getRetryDelay(0)).toBe(1_000);
  });

  it('returns 2 s on second retry (attempt 1)', () => {
    expect(getRetryDelay(1)).toBe(2_000);
  });

  it('returns 4 s on third retry (attempt 2)', () => {
    expect(getRetryDelay(2)).toBe(4_000);
  });

  it('caps delay at 30 s for large attempt numbers', () => {
    expect(getRetryDelay(10)).toBe(30_000);
    expect(getRetryDelay(100)).toBe(30_000);
  });

  it('delay grows exponentially between attempts', () => {
    const d0 = getRetryDelay(0);
    const d1 = getRetryDelay(1);
    const d2 = getRetryDelay(2);
    expect(d1).toBe(d0 * 2);
    expect(d2).toBe(d1 * 2);
  });
});

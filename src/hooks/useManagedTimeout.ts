import { useCallback, useEffect, useRef } from 'react';

type TimeoutId = number;

/**
 * Manages timeout lifecycles for components that schedule delayed state updates.
 * All pending timers are cleared on unmount to prevent setState-on-unmounted warnings.
 */
export const useManagedTimeout = () => {
  const timeoutIdsRef = useRef<Set<TimeoutId>>(new Set());

  const clear = useCallback((id: TimeoutId | null | undefined) => {
    if (id == null) return;
    window.clearTimeout(id);
    timeoutIdsRef.current.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current.clear();
  }, []);

  const schedule = useCallback(
    (callback: () => void, delayMs: number): TimeoutId => {
      const id = window.setTimeout(() => {
        timeoutIdsRef.current.delete(id);
        callback();
      }, delayMs);
      timeoutIdsRef.current.add(id);
      return id;
    },
    [],
  );

  useEffect(() => clearAll, [clearAll]);

  return { schedule, clear, clearAll };
};

export default useManagedTimeout;

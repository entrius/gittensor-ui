import { DependencyList, useEffect } from 'react';
import axios from 'axios';

/** True when an error came from an aborted request (axios CanceledError). */
export const isAbortError = (err: unknown): boolean => axios.isCancel(err);

/**
 * Like useEffect, but passes an AbortSignal to the effect and aborts it when
 * deps change or the component unmounts. Use the signal to cancel in-flight
 * requests so late responses cannot overwrite state from the current render.
 */
export function useAbortableEffect(
  effect: (signal: AbortSignal) => void | Promise<void>,
  deps: DependencyList,
): void {
  useEffect(() => {
    const controller = new AbortController();
    void effect(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

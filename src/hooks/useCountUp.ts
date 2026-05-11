import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to `target` over `durationMs`.
 * Uses easeOutExpo for a satisfying deceleration curve.
 * Returns the current interpolated value (integer).
 */
const useCountUp = (target: number, durationMs = 1800, startDelayMs = 0) => {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }

    const from = prevTarget.current;
    prevTarget.current = target;

    let startTs: number | null = null;
    let raf: number;

    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      const elapsed = ts - startTs - startDelayMs;
      if (elapsed < 0) {
        raf = requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutExpo(progress);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, startDelayMs]);

  return value;
};

export default useCountUp;

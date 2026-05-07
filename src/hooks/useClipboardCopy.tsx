import React, { useCallback, useEffect, useRef, useState } from 'react';

// The Clipboard API is unavailable on non-secure contexts (plain http://),
// inside restricted iframes, or when permission has been denied. `copied`
// only flips to true when the write actually succeeded, so the source text
// stays selectable as a manual fallback.

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
};

interface Options {
  resetMs?: number;
  // Message announced by a dedicated live region when the copy succeeds.
  // Icon-only buttons rely on this because `aria-label` changes are not
  // announced reliably across screen readers. Omit when the button's visible
  // text already reflects the state change (then skip rendering `liveRegion`).
  copiedMessage?: string;
}

export const useClipboardCopy = ({
  resetMs = 2000,
  copiedMessage = 'Copied to clipboard',
}: Options = {}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        if (!navigator.clipboard?.writeText) return false;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          setCopied(false);
          timerRef.current = null;
        }, resetMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetMs],
  );

  const liveRegion = (
    <span role="status" aria-live="polite" aria-atomic="true" style={srOnly}>
      {copied ? copiedMessage : ''}
    </span>
  );

  return { copied, copy, liveRegion };
};

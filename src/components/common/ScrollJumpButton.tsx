import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Fab, Zoom } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface ScrollJumpButtonProps {
  /** Ref to an element inside the scrollable area (e.g. a TableContainer).
   *  The component automatically finds the nearest scrollable ancestor. */
  targetRef: React.RefObject<HTMLElement | null>;
  /**
   * Minimum scrollable overflow (in px) before the button appears.
   * @default 200
   */
  threshold?: number;
}

type Direction = 'down' | 'up' | null;

/** Walk up the DOM to find the nearest ancestor that actually scrolls vertically. */
const getScrollParent = (el: HTMLElement): HTMLElement => {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement;
};

/**
 * Floating action button for long scrollable areas.
 * - Near the top → shows "jump to bottom" (arrow down)
 * - Near the bottom → shows "jump to top" (arrow up)
 * - Short content (no overflow) → hidden
 *
 * Automatically finds the nearest scrollable ancestor of targetRef,
 * so it works even when the TableContainer itself doesn't scroll
 * (e.g. the page's <main> element is the actual scroll container).
 */
const ScrollJumpButton: React.FC<ScrollJumpButtonProps> = ({
  targetRef,
  threshold = 200,
}) => {
  const [direction, setDirection] = useState<Direction>(null);
  const scrollElRef = useRef<HTMLElement | null>(null);

  const evaluate = useCallback(() => {
    const el = scrollElRef.current;
    if (!el) {
      setDirection(null);
      return;
    }

    const maxScroll = el.scrollHeight - el.clientHeight;

    if (maxScroll < threshold) {
      setDirection(null);
      return;
    }

    // Bottom 60px zone → offer "jump to top"
    if (el.scrollTop >= maxScroll - 60) {
      setDirection('up');
      return;
    }

    // Otherwise → offer "jump to bottom"
    setDirection('down');
  }, [threshold]);

  useEffect(() => {
    const anchor = targetRef.current;
    if (!anchor) return;

    const scrollEl = getScrollParent(anchor);
    scrollElRef.current = scrollEl;

    evaluate();

    scrollEl.addEventListener('scroll', evaluate, { passive: true });
    const observer = new ResizeObserver(evaluate);
    observer.observe(scrollEl);

    return () => {
      scrollEl.removeEventListener('scroll', evaluate);
      observer.disconnect();
      scrollElRef.current = null;
    };
  }, [targetRef, evaluate]);

  const handleClick = () => {
    const el = scrollElRef.current;
    if (!el) return;

    if (direction === 'down') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Zoom in={direction !== null}>
      <Fab
        size="small"
        onClick={handleClick}
        aria-label={
          direction === 'down' ? 'Jump to bottom' : 'Jump to top'
        }
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          backgroundColor: 'rgba(255,255,255,0.08)',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'border.light',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.15)',
          },
        }}
      >
        {direction === 'down' ? (
          <KeyboardArrowDownIcon />
        ) : (
          <KeyboardArrowUpIcon />
        )}
      </Fab>
    </Zoom>
  );
};

export default ScrollJumpButton;

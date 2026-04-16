import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { scrollbarSx } from '../../theme';

interface TopScrollbarProps {
  /** Ref to the scrollable container whose horizontal scroll this mirrors. */
  targetRef: React.RefObject<HTMLElement | null>;
}

/**
 * Renders a thin horizontal scrollbar above a wide table/container.
 * Scroll position is synced bidirectionally with the target container
 * so either scrollbar can drive horizontal navigation.
 *
 * Hides itself when the target doesn't overflow horizontally.
 */
const TopScrollbar: React.FC<TopScrollbarProps> = ({ targetRef }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const syncingRef = useRef(false);

  // Track the target's scrollWidth and clientWidth via ResizeObserver.
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const measure = () => {
      setScrollWidth(target.scrollWidth);
      setClientWidth(target.clientWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);

    // Also observe children (the <table> inside may resize independently).
    const firstChild = target.firstElementChild;
    if (firstChild) observer.observe(firstChild);

    return () => observer.disconnect();
  }, [targetRef]);

  // Bidirectional scroll sync.
  const handleTopScroll = useCallback(() => {
    const top = scrollRef.current;
    const bottom = targetRef.current;
    if (!top || !bottom || syncingRef.current) return;
    syncingRef.current = true;
    bottom.scrollLeft = top.scrollLeft;
    syncingRef.current = false;
  }, [targetRef]);

  const handleBottomScroll = useCallback(() => {
    const top = scrollRef.current;
    const bottom = targetRef.current;
    if (!top || !bottom || syncingRef.current) return;
    syncingRef.current = true;
    top.scrollLeft = bottom.scrollLeft;
    syncingRef.current = false;
  }, [targetRef]);

  useEffect(() => {
    const top = scrollRef.current;
    const bottom = targetRef.current;
    if (!top || !bottom) return;

    top.addEventListener('scroll', handleTopScroll);
    bottom.addEventListener('scroll', handleBottomScroll);

    return () => {
      top.removeEventListener('scroll', handleTopScroll);
      bottom.removeEventListener('scroll', handleBottomScroll);
    };
  }, [targetRef, handleTopScroll, handleBottomScroll]);

  // Don't render when the table fits without overflow.
  if (scrollWidth <= clientWidth) return null;

  return (
    <Box
      ref={scrollRef}
      sx={{
        overflowX: 'auto',
        overflowY: 'hidden',
        ...scrollbarSx,
      }}
    >
      <Box sx={{ width: scrollWidth, height: '1px' }} />
    </Box>
  );
};

export default TopScrollbar;

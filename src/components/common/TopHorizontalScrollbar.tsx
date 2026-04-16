import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { scrollbarSx } from '../../theme';

type Props = {
  targetRef: React.RefObject<HTMLElement | null>;
  ariaLabel?: string;
  sx?: SxProps<Theme>;
};

export const TopHorizontalScrollbar: React.FC<Props> = ({
  targetRef,
  ariaLabel = 'Horizontal table scroll',
  sx,
}) => {
  const topRef = React.useRef<HTMLDivElement | null>(null);
  const spacerRef = React.useRef<HTMLDivElement | null>(null);

  const [isOverflowing, setIsOverflowing] = React.useState(false);

  const update = React.useCallback(() => {
    const target = targetRef.current;
    const spacer = spacerRef.current;
    if (!target || !spacer) return;

    const scrollWidth = target.scrollWidth;
    spacer.style.width = `${scrollWidth}px`;
    setIsOverflowing(scrollWidth > target.clientWidth + 1);
  }, [targetRef]);

  React.useEffect(() => {
    const target = targetRef.current;
    const top = topRef.current;
    if (!target || !top) return;

    let isSyncingFromTop = false;
    let isSyncingFromTarget = false;

    const onTopScroll = () => {
      if (isSyncingFromTarget) return;
      isSyncingFromTop = true;
      target.scrollLeft = top.scrollLeft;
      isSyncingFromTop = false;
    };

    const onTargetScroll = () => {
      if (isSyncingFromTop) return;
      isSyncingFromTarget = true;
      top.scrollLeft = target.scrollLeft;
      isSyncingFromTarget = false;
    };

    top.addEventListener('scroll', onTopScroll, { passive: true });
    target.addEventListener('scroll', onTargetScroll, { passive: true });

    // Align immediately in case target already scrolled.
    top.scrollLeft = target.scrollLeft;

    return () => {
      top.removeEventListener('scroll', onTopScroll);
      target.removeEventListener('scroll', onTargetScroll);
    };
  }, [targetRef]);

  React.useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    update();

    const observed: Element[] = [target];
    if (target.firstElementChild) observed.push(target.firstElementChild);

    const ro = new ResizeObserver(() => update());
    observed.forEach((el) => ro.observe(el));

    const onWindowResize = () => update();
    window.addEventListener('resize', onWindowResize, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWindowResize);
    };
  }, [targetRef, update]);

  return (
    <Box
      ref={topRef}
      aria-label={ariaLabel}
      role="region"
      tabIndex={0}
      sx={[
        (theme) => ({
          // Keep mounted so we can measure overflow and sync scrollLeft,
          // but collapse when not needed.
          height: isOverflowing ? 20 : 0,
          opacity: isOverflowing ? 1 : 0,
          pointerEvents: isOverflowing ? 'auto' : 'none',
          overflowX: 'auto',
          overflowY: 'hidden',
          // Make the scroll area visually discoverable even when OS/browser uses overlay scrollbars.
          backgroundColor: theme.palette.surface.subtle,
          ...scrollbarSx,
          '&::-webkit-scrollbar': { height: 10 },
          borderBottom: isOverflowing
            ? `1px solid ${theme.palette.border.light}`
            : 'none',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box ref={spacerRef} sx={{ height: 1 }} />
    </Box>
  );
};


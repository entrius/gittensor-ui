import React, { useMemo, useRef, useState } from 'react';
import { Avatar, Box, Popover, type AvatarProps } from '@mui/material';
import { useAllMiners } from '../../api';
import MinerHoverCard from './MinerHoverCard';
import { type MinerEvaluation } from '../../api/models/Dashboard';

interface MinerAvatarWithPreviewProps extends Omit<AvatarProps, 'children'> {
  /** Numeric GitHub ID, primary key into the `useAllMiners` cache. */
  githubId?: string;
  /** Display name fallback when the miner isn't in the cache. */
  username?: string;
  /** Hover delay in ms before the popover opens. */
  enterDelayMs?: number;
}

/**
 * Wraps `<Avatar>` with a hover / focus popover that previews the miner's
 * headline stats. Read-only: clicking the "View full profile" link inside
 * the popover navigates; the Avatar itself stays inert (parent surfaces
 * already own the row-level click target).
 *
 * Reads the cached `useAllMiners` result via a memoized id-to-miner map so
 * no extra network calls are made. If the miner isn't in the cache, the
 * popover renders a minimal fallback.
 */
const MinerAvatarWithPreview: React.FC<MinerAvatarWithPreviewProps> = ({
  githubId,
  username,
  enterDelayMs = 500,
  ...avatarProps
}) => {
  const { data: miners } = useAllMiners();
  const minerById = useMemo(() => {
    const map = new Map<string, MinerEvaluation>();
    if (Array.isArray(miners)) {
      for (const m of miners) {
        if (m.githubId) map.set(m.githubId, m);
      }
    }
    return map;
  }, [miners]);

  const rankById = useMemo(() => {
    if (!Array.isArray(miners)) return new Map<string, number>();
    return new Map(
      [...miners]
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
        .map((m, i) => [m.githubId, i + 1] as const),
    );
  }, [miners]);

  const miner = githubId ? minerById.get(githubId) : undefined;
  const rank = githubId ? rankById.get(githubId) : undefined;

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const openTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  const clearTimers = () => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = window.setTimeout(() => {
      setOpen(true);
      openTimer.current = null;
    }, enterDelayMs);
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, 120);
  };

  // Open immediately on keyboard focus (no hover delay).
  const handleFocus = () => {
    clearTimers();
    setOpen(true);
  };

  return (
    <>
      <Box
        ref={anchorRef}
        component="span"
        tabIndex={0}
        aria-describedby={open ? 'miner-hover-card' : undefined}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={handleFocus}
        onBlur={scheduleClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            clearTimers();
            setOpen(false);
          }
        }}
        sx={{
          display: 'inline-flex',
          borderRadius: '50%',
          '&:focus-visible': {
            outline: (t) => `2px solid ${t.palette.primary.main}`,
            outlineOffset: '2px',
          },
        }}
      >
        <Avatar {...avatarProps} />
      </Box>
      <Popover
        id="miner-hover-card"
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        // Reduced-motion users skip the slide/fade.
        transitionDuration={{
          appear: 0,
          enter:
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 0
              : 150,
          exit: 0,
        }}
        slotProps={{
          paper: {
            onMouseEnter: clearTimers,
            onMouseLeave: scheduleClose,
            elevation: 8,
            sx: {
              mt: 0.5,
              border: '1px solid',
              borderColor: 'border.medium',
              backgroundColor: 'background.paper',
            },
          },
        }}
        disableRestoreFocus={false}
      >
        <MinerHoverCard
          miner={miner}
          rank={rank}
          fallbackGithubId={githubId}
          fallbackUsername={username}
        />
      </Popover>
    </>
  );
};

export default MinerAvatarWithPreview;

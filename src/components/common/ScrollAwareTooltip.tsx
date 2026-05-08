import React, { useEffect, useState } from 'react';
import { Tooltip } from '@mui/material';

/** Tooltip that auto-closes on any scroll so it can't float over scrolled-away anchors (e.g. under a sticky page header). */
export const ScrollAwareTooltip: React.FC<
  React.ComponentProps<typeof Tooltip>
> = ({ children, ...props }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [open]);
  return (
    <Tooltip
      {...props}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
    >
      {children}
    </Tooltip>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Fade, IconButton, Tooltip } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

function getMainScrollContainer(): HTMLElement | null {
  return document.querySelector('main');
}

interface ScrollToTopButtonProps {
  threshold?: number;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  threshold = 300,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = getMainScrollContainer();
    if (!el) return;

    const onScroll = () => {
      setVisible(el.scrollTop > threshold);
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    getMainScrollContainer()?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <Fade in={visible} unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 24, md: 32 },
          right: { xs: 16, md: 32 },
          zIndex: 1000,
        }}
      >
        <Tooltip title="Scroll to top" placement="left" arrow>
          <IconButton
            onClick={scrollToTop}
            aria-label="Scroll to top"
            disableRipple
            sx={(theme) => ({
              width: 48,
              height: 48,
              borderRadius: '8px',
              color: theme.palette.text.secondary,
              backgroundColor: theme.palette.background.default,
              border: `1px solid ${theme.palette.border.light}`,
              transition: 'all 0.18s ease',
              '&:hover': {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.surface.subtle,
                borderColor: theme.palette.border.medium,
                transform: 'translateY(-2px)',
              },
            })}
          >
            <KeyboardArrowUpIcon sx={{ fontSize: '1.75rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Fade>
  );
};

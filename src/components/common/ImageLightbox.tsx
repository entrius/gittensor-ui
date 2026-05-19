import React, { useCallback, useEffect } from 'react';
import { Box, Fade, IconButton, Modal, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export interface ImageLightboxProps {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

/**
 * Full-screen image preview — opened when a markdown/issue screenshot is clicked.
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  open,
  src,
  alt,
  onClose,
}) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      aria-labelledby="image-lightbox-title"
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.92)',
          backdropFilter: 'blur(4px)',
        },
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: (theme) => theme.zIndex.modal + 2,
      }}
    >
      <Fade in={open}>
        <Box
          role="dialog"
          aria-modal="true"
          onClick={onClose}
          sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, sm: 3 },
            outline: 'none',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: { xs: 12, sm: 20 },
              right: { xs: 12, sm: 20 },
              display: 'flex',
              gap: 1,
              zIndex: 1,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <IconButton
              component="a"
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open image in new tab"
              sx={{
                color: 'common.white',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
              }}
            >
              <OpenInNewIcon />
            </IconButton>
            <IconButton
              onClick={onClose}
              aria-label="Close image preview"
              sx={{
                color: 'common.white',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            onClick={(event) => event.stopPropagation()}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <Box
              component="img"
              id="image-lightbox-title"
              src={src}
              alt={alt ?? 'Enlarged screenshot'}
              sx={{
                display: 'block',
                maxWidth: 'min(96vw, 1600px)',
                maxHeight: 'calc(92vh - 48px)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 1,
                boxShadow: '0 24px 80px rgba(0, 0, 0, 0.55)',
              }}
            />
            {alt ? (
              <Typography
                variant="body2"
                sx={{
                  mt: 1.5,
                  color: 'rgba(255, 255, 255, 0.72)',
                  textAlign: 'center',
                  maxWidth: 'min(96vw, 720px)',
                }}
              >
                {alt}
              </Typography>
            ) : (
              <Typography
                variant="caption"
                sx={{
                  mt: 1.5,
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                Press Esc or click outside to close
              </Typography>
            )}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

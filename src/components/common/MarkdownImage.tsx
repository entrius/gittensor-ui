import React, { useState } from 'react';
import { Box, Dialog, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type MarkdownImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

/**
 * Renders markdown/HTML images with preserved aspect ratio and a click-to-zoom lightbox.
 */
export const MarkdownImage: React.FC<MarkdownImageProps> = ({
  src,
  alt,
  style: _inlineStyle,
  width: _width,
  height: _height,
  ...rest
}) => {
  const [open, setOpen] = useState(false);

  if (!src) {
    return null;
  }

  return (
    <>
      <Box
        component="img"
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={alt ? `View image: ${alt}` : 'View image'}
        sx={{
          display: 'block',
          maxWidth: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          borderRadius: '6px',
          my: 2,
          cursor: 'zoom-in',
          backgroundColor: 'transparent',
        }}
        {...rest}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        BackdropProps={{
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.88)' },
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
            maxWidth: 'min(96vw, 1400px)',
            maxHeight: '96vh',
            m: 1,
            position: 'relative',
          },
        }}
      >
        <IconButton
          onClick={() => setOpen(false)}
          aria-label="Close image preview"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'common.white',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.65)' },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={src}
          alt={alt ?? ''}
          onClick={() => setOpen(false)}
          sx={{
            display: 'block',
            maxWidth: 'min(96vw, 1400px)',
            maxHeight: '92vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: 1,
          }}
        />
      </Dialog>
    </>
  );
};

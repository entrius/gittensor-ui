import React, { useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { ImageLightbox } from './ImageLightbox';

type MarkdownImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const openLightboxFromEvent = (
  event: React.MouseEvent | React.KeyboardEvent,
  open: () => void,
) => {
  event.preventDefault();
  event.stopPropagation();
  open();
};

/**
 * Renders markdown/HTML images with preserved aspect ratio and a click-to-zoom lightbox.
 */
export const MarkdownImage: React.FC<MarkdownImageProps> = ({
  src,
  alt,
  style: _inlineStyle,
  width: _width,
  height: _height,
  onClick: _onClick,
  ...rest
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!src) {
    return null;
  }

  const openLightbox = () => setLightboxOpen(true);

  return (
    <>
      <Box
        sx={{
          display: 'inline-block',
          maxWidth: '100%',
          my: 2,
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={(event) => openLightboxFromEvent(event, openLightbox)}
          aria-label={alt ? `Enlarge image: ${alt}` : 'Enlarge image'}
          sx={{
            display: 'block',
            p: 0,
            m: 0,
            border: 'none',
            background: 'none',
            cursor: 'zoom-in',
            maxWidth: '100%',
            borderRadius: '6px',
            overflow: 'hidden',
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          <Box
            component="img"
            src={src}
            alt={alt ?? ''}
            loading="lazy"
            decoding="async"
            draggable={false}
            sx={{
              display: 'block',
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              pointerEvents: 'none',
            }}
            {...rest}
          />
        </Box>
        <Typography
          variant="caption"
          sx={(theme) => ({
            display: 'block',
            mt: 0.5,
            color: alpha(theme.palette.text.secondary, 0.85),
            fontSize: '0.7rem',
            letterSpacing: '0.02em',
          })}
        >
          Click to enlarge
        </Typography>
      </Box>

      <ImageLightbox
        open={lightboxOpen}
        src={src}
        alt={alt}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

/** GitHub often wraps screenshots in `<a><img /></a>` — unwrap so the lightbox receives clicks. */
export const isImageOnlyLinkChild = (children: React.ReactNode): boolean => {
  const nodes = React.Children.toArray(children);
  if (nodes.length !== 1 || !React.isValidElement(nodes[0])) {
    return false;
  }
  const child = nodes[0];
  if (child.type === MarkdownImage) {
    return true;
  }
  if (child.type === 'img' || (child.props as { src?: string }).src) {
    return true;
  }
  return false;
};

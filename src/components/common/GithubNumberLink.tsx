import React from 'react';
import { Link, type LinkProps } from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { STATUS_COLORS } from '../../theme';

interface GithubNumberLinkProps extends Omit<LinkProps, 'children' | 'href'> {
  href: string;
  number: number | string;
}

export const GithubNumberLink: React.FC<GithubNumberLinkProps> = ({
  href,
  number,
  onClick,
  sx,
  ...rest
}) => (
  <Link
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => {
      e.stopPropagation();
      onClick?.(e);
    }}
    sx={[
      {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontSize: '0.75rem',
        color: 'text.secondary',
        textDecoration: 'none',
        '&:hover': {
          color: STATUS_COLORS.info,
          textDecoration: 'underline',
        },
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
    {...rest}
  >
    #{number}
    <OpenInNewIcon sx={{ fontSize: 12, opacity: 0.5 }} />
  </Link>
);

import React, { type CSSProperties, type ReactNode } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface RowLinkProps {
  href: string;
  state?: unknown;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

const isModifiedClick = (e: React.MouseEvent) =>
  e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

export const RowLink: React.FC<RowLinkProps> = ({
  href,
  state,
  onClick,
  children,
  sx,
  className,
  style,
  'aria-label': ariaLabel,
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || isModifiedClick(e)) return;
    e.preventDefault();
    navigate(href, state ? { state } : undefined);
  };

  return (
    <Box
      component="a"
      href={href}
      onClick={handleClick}
      className={className}
      style={style}
      aria-label={ariaLabel}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

import { forwardRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TableRow,
  type BoxProps,
  type TableRowProps,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

type LinkState = Record<string, unknown> | undefined;

const isModifiedEvent = (e: React.MouseEvent): boolean =>
  e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

/** Sx reset so an element rendered as `<a>` inherits color/decoration. */
export const linkResetSx = { textDecoration: 'none', color: 'inherit' };

/**
 * Gives any MUI element rendered with `component="a"` real `<a href>`
 * semantics — middle-click, Cmd/Ctrl-click, and right-click "Open in
 * new tab" work natively, while plain left-click stays a React Router
 * SPA navigation.
 */
export const useLinkBehavior = <E extends Element = HTMLElement>(
  href: string,
  options: {
    state?: LinkState;
    onClick?: (e: React.MouseEvent<E>) => void;
  } = {},
) => {
  const navigate = useNavigate();
  const { state, onClick } = options;

  const handleClick = useCallback(
    (e: React.MouseEvent<E>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (isModifiedEvent(e)) return;
      e.preventDefault();
      navigate(href, { state });
    },
    [href, state, navigate, onClick],
  );

  return { href, onClick: handleClick } as const;
};

const mergeSx = (base: SxProps<Theme>, extra: SxProps<Theme> | undefined) =>
  (extra === undefined
    ? base
    : Array.isArray(extra)
      ? [base, ...extra]
      : [base, extra]) as SxProps<Theme>;

type LinkProps = {
  href: string;
  linkState?: LinkState;
};

/**
 * A `Box` that renders as `<a href>` with SPA + native new-tab behavior.
 * Drop-in replacement for any `<Box onClick={() => navigate(...)}>` row.
 */
export const LinkBox = forwardRef<HTMLAnchorElement, BoxProps & LinkProps>(
  ({ href, linkState, sx, ...rest }, ref) => {
    const linkProps = useLinkBehavior<HTMLAnchorElement>(href, {
      state: linkState,
    });
    return (
      <Box
        component="a"
        ref={ref}
        {...linkProps}
        sx={mergeSx(linkResetSx, sx)}
        {...rest}
      />
    );
  },
);
LinkBox.displayName = 'LinkBox';

/**
 * A keyboard-accessible `TableRow` with SPA navigation behavior.
 * Keeps valid table semantics (`tbody > tr > td`) while still acting like a link.
 */
export const LinkTableRow = forwardRef<
  HTMLTableRowElement,
  TableRowProps & LinkProps
>(
  (
    { href, linkState, sx, onClick, onKeyDown, onAuxClick, ...rest },
    ref,
  ) => {
    const navigate = useNavigate();
    const openInNewTab = useCallback(() => {
      window.open(href, '_blank', 'noopener,noreferrer');
    }, [href]);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLTableRowElement>) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (isModifiedEvent(e)) {
          openInNewTab();
          return;
        }
        navigate(href, { state: linkState });
      },
      [href, linkState, navigate, onClick, openInNewTab],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTableRowElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(href, { state: linkState });
        }
      },
      [href, linkState, navigate, onKeyDown],
    );

    const handleAuxClick = useCallback(
      (e: React.MouseEvent<HTMLTableRowElement>) => {
        onAuxClick?.(e);
        if (e.defaultPrevented) return;
        if (e.button === 1) {
          e.preventDefault();
          openInNewTab();
        }
      },
      [onAuxClick, openInNewTab],
    );

    return (
      <TableRow
        component="tr"
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onAuxClick={handleAuxClick}
        role="link"
        tabIndex={0}
        sx={mergeSx(linkResetSx, sx)}
        {...rest}
      />
    );
  },
);
LinkTableRow.displayName = 'LinkTableRow';

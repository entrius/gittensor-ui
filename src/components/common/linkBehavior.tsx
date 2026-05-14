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
    replace?: boolean;
    onClick?: (e: React.MouseEvent<E>) => void;
    target?: string;
  } = {},
) => {
  const navigate = useNavigate();
  const { state, replace, onClick, target } = options;
  const isExternal = target === '_blank' || /^https?:\/\//i.test(href);

  const handleClick = useCallback(
    (e: React.MouseEvent<E>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (isModifiedEvent(e)) return;
      if (isExternal) return; // let the native <a> open in new tab
      e.preventDefault();
      navigate(href, { state, replace });
    },
    [href, state, replace, navigate, onClick, isExternal],
  );

  return {
    href,
    onClick: handleClick,
    ...(isExternal
      ? { target: target ?? '_blank', rel: 'noopener noreferrer' }
      : {}),
  } as const;
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
  /** When true, navigation replaces the current history entry instead of pushing. */
  replace?: boolean;
};

/**
 * A `Box` that renders as `<a href>` with SPA + native new-tab behavior.
 * Drop-in replacement for any `<Box onClick={() => navigate(...)}>` row.
 */
export const LinkBox = forwardRef<HTMLAnchorElement, BoxProps & LinkProps>(
  ({ href, linkState, replace, sx, ...rest }, ref) => {
    const linkProps = useLinkBehavior<HTMLAnchorElement>(href, {
      state: linkState,
      replace,
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
 * A `TableRow` that navigates via React Router on click. Renders as a native
 * `<tr>` (valid HTML inside `<tbody>`), with ``role="link"`` and keyboard
 * support for accessibility. Drop-in replacement for any
 * `<TableRow onClick={() => navigate(...)}>` row.
 */
export const LinkTableRow = forwardRef<
  HTMLTableRowElement,
  TableRowProps & LinkProps
>(({ href, linkState, sx, ...rest }, ref) => {
  const navigate = useNavigate();
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>) => {
      if (isModifiedEvent(e)) return;
      e.preventDefault();
      navigate(href, { state: linkState });
    },
    [href, linkState, navigate],
  );

  return (
    <TableRow
      ref={ref}
      onClick={handleClick}
      sx={mergeSx(
        { cursor: 'pointer', textDecoration: 'none', color: 'inherit' },
        sx,
      )}
      tabIndex={0}
      role="link"
      {...rest}
    />
  );
});
LinkTableRow.displayName = 'LinkTableRow';

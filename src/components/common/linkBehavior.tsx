import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TableCell,
  TableRow,
  type BoxProps,
  type TableCellProps,
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
 * A `TableCell` that renders as a stretched `<a>` fill the cell area.
 * Used inside a `LinkTableRow` so the row stays a valid `<tr>` while
 * each cell provides native `<a>` behavior (middle-click, status bar).
 */
export const LinkTd = forwardRef<HTMLAnchorElement, TableCellProps & LinkProps>(
  ({ href, sx, children, ...rest }, ref) => {
    const linkProps = useLinkBehavior<HTMLAnchorElement>(href, {});
    return (
      <TableCell
        sx={[{ position: 'relative' }, ...(Array.isArray(sx) ? sx : [sx])]}
        {...rest}
      >
        <Box
          component="a"
          ref={ref}
          {...linkProps}
          sx={mergeSx(linkResetSx, {
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            px: 2,
          })}
        />
        {children}
      </TableCell>
    );
  },
);
LinkTd.displayName = 'LinkTd';

/**
 * A `TableRow` that renders as a native `<tr>` (valid inside `<tbody>`).
 * Each `TableCell` child is replaced with a `LinkTd` so the row stays
 * valid HTML while cells retain native `<a>` behavior (middle-click,
 * open in new tab, status bar URL preview).
 */
export const LinkTableRow = forwardRef<
  HTMLTableRowElement,
  TableRowProps & LinkProps
>(({ href, linkState, children, sx, ...rest }, ref) => {
  const linkProps = useLinkBehavior<HTMLAnchorElement>(href, {
    state: linkState,
  });
  return (
    <TableRow ref={ref} sx={mergeSx({ cursor: 'pointer' }, sx)} {...rest}>
      {Children.map(children, (child) =>
        isValidElement(child) && child.type === TableCell
          ? cloneElement(child, {
              ...linkProps,
              sx: [
                { position: 'relative' },
                ...(Array.isArray((child.props as TableCellProps).sx)
                  ? (child.props as TableCellProps).sx
                  : [(child.props as TableCellProps).sx].filter(Boolean)),
              ] as SxProps<Theme>,
              children: (
                <>
                  <Box
                    component="a"
                    {...linkProps}
                    sx={mergeSx(linkResetSx, {
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      px: 2,
                    })}
                  />
                  {(child.props as { children?: React.ReactNode }).children}
                </>
              ),
            } as TableCellProps)
          : child,
      )}
    </TableRow>
  );
});
LinkTableRow.displayName = 'LinkTableRow';

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  type ReactElement,
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

const cellLinkOverlaySx: SxProps<Theme> = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  ...linkResetSx,
};

/** Content above the stretch `<a>`; pointer hits pass through to the anchor except on controls. */
const cellLinkContentSx: SxProps<Theme> = {
  position: 'relative',
  zIndex: 2,
  display: 'block',
  height: '100%',
  pointerEvents: 'none',
  '& a, & button, & input, & select, & textarea, & [role="button"]': {
    pointerEvents: 'auto',
  },
};

/**
 * A normal `<tr>` with a real `<a href>` stretched over each cell. That keeps
 * the table DOM valid, restores the browser status URL on hover, and keeps
 * native middle-click / context-menu link behavior. Cells must not nest
 * another `<a>` when this row is used.
 */
export const LinkTableRow = forwardRef<
  HTMLTableRowElement,
  TableRowProps & LinkProps
>(({ href, linkState, replace, sx, children, ...rest }, ref) => {
  const linkProps = useLinkBehavior<HTMLAnchorElement>(href, {
    state: linkState,
    replace,
  });

  const enhancedCells = Children.map(children, (child, index) => {
    if (!isValidElement(child) || child.type !== TableCell) {
      return child;
    }
    const cell = child as ReactElement<TableCellProps>;
    const prevSx = cell.props.sx;
    const mergedCellSx: SxProps<Theme> = [
      { position: 'relative' },
      ...(prevSx === undefined
        ? []
        : Array.isArray(prevSx)
          ? prevSx
          : [prevSx]),
    ];

    return cloneElement(cell, {
      sx: mergedCellSx,
      children: (
        <>
          <Box
            component="a"
            {...linkProps}
            tabIndex={index === 0 ? 0 : -1}
            aria-hidden={index === 0 ? undefined : true}
            sx={cellLinkOverlaySx}
          />
          <Box component="span" sx={cellLinkContentSx}>
            {cell.props.children}
          </Box>
        </>
      ),
    });
  });

  return (
    <TableRow ref={ref} {...rest} sx={sx}>
      {enhancedCells}
    </TableRow>
  );
});
LinkTableRow.displayName = 'LinkTableRow';

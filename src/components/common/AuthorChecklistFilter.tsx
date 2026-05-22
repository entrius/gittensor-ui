import React, { useCallback, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Popover,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { TEXT_OPACITY, scrollbarSx } from '../../theme';

export type AuthorChecklistOption = {
  id: string;
  label: string;
  count: number;
};

interface AuthorChecklistFilterProps {
  options: AuthorChecklistOption[];
  selected: readonly string[];
  onChange: (next: readonly string[]) => void;
}

export const AuthorChecklistFilter: React.FC<AuthorChecklistFilterProps> = ({
  options,
  selected,
  onChange,
}) => {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const isOpen = Boolean(anchor);

  const open = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget);
  }, []);

  const close = useCallback(() => setAnchor(null), []);

  if (options.length <= 1) return null;

  const isFiltering = selected.length > 0;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const triggerLabel = (() => {
    if (!isFiltering) return 'Author';
    if (selected.length === 1) return selected[0];
    return `${selected.length} authors`;
  })();

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={open}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        sx={(t) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 1,
          px: 1.25,
          py: 0.75,
          minHeight: 34,
          borderRadius: 2,
          border: `1px solid ${isFiltering ? t.palette.border.medium : t.palette.border.light}`,
          backgroundColor: isFiltering
            ? t.palette.surface.light
            : t.palette.surface.subtle,
          color: isFiltering ? 'text.primary' : 'text.tertiary',
          cursor: 'pointer',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.78rem',
          textAlign: 'left',
          '&:hover': {
            borderColor: t.palette.border.medium,
            backgroundColor: t.palette.surface.light,
          },
        })}
      >
        <Box
          component="span"
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {triggerLabel}
        </Box>
        <Stack direction="row" alignItems="center" spacing={0.25}>
          {isFiltering ? (
            <IconButton
              size="small"
              aria-label="Clear author filter"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              sx={{
                p: 0.25,
                color: 'text.tertiary',
                '&:hover': { color: 'text.primary' },
              }}
            >
              <CloseIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          ) : null}
          <ArrowDropDownIcon
            sx={{
              fontSize: '1.1rem',
              color: 'text.secondary',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          />
        </Stack>
      </Box>

      <Popover
        open={isOpen}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: (t) => ({
              mt: 0.5,
              width: anchor?.offsetWidth ?? 280,
              minWidth: 240,
              maxWidth: 320,
              borderRadius: 2,
              border: `1px solid ${t.palette.border.medium}`,
              backgroundColor: t.palette.surface.elevated,
              backgroundImage: 'none',
              boxShadow: `0 12px 32px ${alpha(t.palette.common.black, 0.55)}`,
              overflow: 'hidden',
            }),
          },
        }}
      >
        {isFiltering ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              px: 1,
              pt: 1,
              pb: 0.25,
              borderBottom: '1px solid',
              borderColor: 'border.light',
            }}
          >
            <Button
              size="small"
              onClick={() => onChange([])}
              sx={{
                minWidth: 0,
                px: 0.5,
                py: 0,
                fontSize: '0.68rem',
                textTransform: 'none',
                color: 'text.tertiary',
                '&:hover': {
                  color: 'text.primary',
                  backgroundColor: 'action.hover',
                },
              }}
            >
              Clear all
            </Button>
          </Box>
        ) : null}
        <Box
          role="listbox"
          aria-multiselectable="true"
          sx={{
            maxHeight: 280,
            overflowY: 'auto',
            py: 0.5,
            ...scrollbarSx,
          }}
        >
          {options.map(({ id, label, count }) => (
            <FormControlLabel
              key={id}
              control={
                <Checkbox
                  size="small"
                  checked={selectedSet.has(id)}
                  onChange={() => toggle(id)}
                  sx={{ py: 0.25 }}
                />
              }
              label={
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.75}
                  sx={{ flex: 1, minWidth: 0 }}
                >
                  <Avatar
                    src={getRepositoryOwnerAvatarSrc(label)}
                    alt={label}
                    sx={{ width: 18, height: 18 }}
                  />
                  <Typography
                    sx={{
                      flex: 1,
                      fontSize: '0.78rem',
                      fontFamily: '"JetBrains Mono", monospace',
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={(t) => ({
                      fontSize: '0.72rem',
                      fontFamily: '"JetBrains Mono", monospace',
                      color: alpha(
                        t.palette.text.primary,
                        TEXT_OPACITY.tertiary,
                      ),
                    })}
                  >
                    {count}
                  </Typography>
                </Stack>
              }
              sx={{
                mx: 0,
                px: 1.5,
                width: '100%',
                alignItems: 'center',
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'surface.light',
                },
                '& .MuiFormControlLabel-label': { flex: 1, minWidth: 0 },
              }}
            />
          ))}
        </Box>
      </Popover>
    </>
  );
};

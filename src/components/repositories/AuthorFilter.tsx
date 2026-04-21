import React, { useCallback, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Popover,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useAllMiners } from '../../api';
import { TEXT_OPACITY, scrollbarSx } from '../../theme';

export const AUTHOR_FILTER_ALL = 'all';

type AuthorStatus = 'eligible' | 'ineligible';

interface AuthorOption {
  author: string;
  count: number;
  status: AuthorStatus;
}

export interface AuthorFilterProps<T> {
  items: T[];
  getAuthor: (item: T) => string | null | undefined;
  getGithubId: (item: T) => string | null | undefined;
  value: string;
  onChange: (nextAuthor: string) => void;
}

export const AuthorFilter = <T,>({
  items,
  getAuthor,
  getGithubId,
  value,
  onChange,
}: AuthorFilterProps<T>): React.ReactElement | null => {
  const { data: allMiners } = useAllMiners();

  const eligibilityByGithubId = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const m of allMiners ?? []) {
      if (m.githubId) map.set(m.githubId, Boolean(m.isEligible));
    }
    return map;
  }, [allMiners]);

  const authorOptions = useMemo<AuthorOption[]>(() => {
    const meta = new Map<string, { count: number; githubId: string | null }>();
    for (const item of items) {
      const author = getAuthor(item);
      if (!author) continue;
      const existing = meta.get(author);
      meta.set(author, {
        count: (existing?.count ?? 0) + 1,
        githubId: existing?.githubId ?? getGithubId(item) ?? null,
      });
    }
    return Array.from(meta.entries())
      .map(([author, { count, githubId }]) => {
        const eligible = githubId
          ? eligibilityByGithubId.get(githubId)
          : undefined;
        if (eligible === undefined) return null;
        return {
          author,
          count,
          status: eligible ? 'eligible' : 'ineligible',
        } satisfies AuthorOption;
      })
      .filter((option): option is AuthorOption => option !== null)
      .sort((a, b) => b.count - a.count || a.author.localeCompare(b.author));
  }, [items, getAuthor, getGithubId, eligibilityByGithubId]);

  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const isOpen = Boolean(anchor);

  const open = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget);
  }, []);

  const close = useCallback(() => {
    setAnchor(null);
    setSearch('');
  }, []);

  const pick = useCallback(
    (nextAuthor: string) => {
      onChange(nextAuthor);
      close();
    },
    [onChange, close],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const visibleOptions = useMemo(
    () =>
      normalizedSearch
        ? authorOptions.filter(({ author }) =>
            author.toLowerCase().includes(normalizedSearch),
          )
        : authorOptions,
    [authorOptions, normalizedSearch],
  );

  if (authorOptions.length <= 1) return null;

  const isFiltering = value !== AUTHOR_FILTER_ALL;

  return (
    <>
      <Button
        size="small"
        onClick={open}
        aria-haspopup="true"
        aria-expanded={isOpen}
        endIcon={<ArrowDropDownIcon sx={{ fontSize: '1rem' }} />}
        sx={{
          color: isFiltering ? 'text.primary' : 'text.tertiary',
          backgroundColor: isFiltering ? 'border.subtle' : 'transparent',
          borderRadius: '6px',
          px: 2,
          minWidth: 'auto',
          textTransform: 'none',
          fontSize: '0.8rem',
          border: '1px solid',
          borderColor: isFiltering ? 'border.light' : 'transparent',
          '&:hover': { backgroundColor: 'border.light' },
        }}
      >
        {!isFiltering ? (
          'Author'
        ) : (
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Avatar
              src={`https://avatars.githubusercontent.com/${value}`}
              alt={value}
              sx={{ width: 16, height: 16 }}
            />
            <Box
              component="span"
              sx={{
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {value}
            </Box>
            <Box
              component="span"
              role="button"
              aria-label="Clear author filter"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                pick(AUTHOR_FILTER_ALL);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation();
                  event.preventDefault();
                  pick(AUTHOR_FILTER_ALL);
                }
              }}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                color: 'text.tertiary',
                cursor: 'pointer',
                '&:hover': { color: 'text.primary' },
              }}
            >
              <CloseIcon sx={{ fontSize: '0.85rem' }} />
            </Box>
          </Stack>
        )}
      </Button>
      <Popover
        open={isOpen}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: {
              mt: 0.5,
              width: 280,
              backgroundColor: 'background.default',
              backgroundImage: 'none',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'border.light',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.secondary',
              }}
            >
              Filter by author
            </Typography>
            {isFiltering && (
              <IconButton
                size="small"
                aria-label="Clear author filter"
                onClick={() => pick(AUTHOR_FILTER_ALL)}
                sx={{
                  p: 0.25,
                  color: 'text.tertiary',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <CloseIcon sx={{ fontSize: '0.95rem' }} />
              </IconButton>
            )}
          </Stack>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="Filter users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ fontSize: '0.95rem', color: 'text.tertiary' }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.8rem',
                color: 'text.primary',
                backgroundColor: 'transparent',
                height: 30,
                borderRadius: 1.5,
                '& fieldset': { borderColor: 'border.light' },
                '&:hover fieldset': { borderColor: 'border.medium' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
            }}
          />
        </Box>
        <List
          dense
          disablePadding
          sx={{
            maxHeight: 280,
            overflowY: 'auto',
            ...scrollbarSx,
          }}
        >
          {visibleOptions.length === 0 ? (
            <Box sx={{ px: 1.5, py: 1.5 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.tertiary' }}>
                No authors match &ldquo;{search}&rdquo;
              </Typography>
            </Box>
          ) : (
            visibleOptions.map(({ author, count, status }) => (
              <AuthorRow
                key={author}
                author={author}
                count={count}
                isSelected={value === author}
                isDisabled={status === 'ineligible'}
                onClick={() => pick(author)}
              />
            ))
          )}
        </List>
      </Popover>
    </>
  );
};

interface AuthorRowProps {
  author: string;
  count: number;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

const AuthorRow: React.FC<AuthorRowProps> = ({
  author,
  count,
  isSelected,
  isDisabled,
  onClick,
}) => (
  <ListItemButton
    onClick={onClick}
    selected={isSelected}
    disabled={isDisabled}
    sx={{ py: 0.5, px: 1.5, gap: 1, minHeight: 32 }}
  >
    <CheckIcon
      sx={{
        fontSize: '0.95rem',
        color: isSelected ? 'text.primary' : 'transparent',
      }}
    />
    <Avatar
      src={`https://avatars.githubusercontent.com/${author}`}
      alt={author}
      sx={{ width: 18, height: 18 }}
    />
    <Typography
      sx={{
        fontSize: '0.8rem',
        flex: 1,
        color: 'text.primary',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {author}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.72rem',
        color: (t) => alpha(t.palette.text.primary, TEXT_OPACITY.tertiary),
      }}
    >
      {count}
    </Typography>
  </ListItemButton>
);

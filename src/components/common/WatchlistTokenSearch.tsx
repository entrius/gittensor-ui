import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Chip,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ClearSearchAdornment } from './ClearSearchAdornment';
import { joinSearchTerms } from '../../utils/watchlistSearch';

type WatchlistTokenSearchFieldProps = {
  onQueryChange: (query: string) => void;
  placeholder?: string;
};

/**
 * Watchlist PR/Issues search: filters live while typing; press Enter to pin the
 * current word as a chip below the field. Multiple chips combine with AND.
 */
export function WatchlistTokenSearchField({
  onQueryChange,
  placeholder = 'Search…',
}: WatchlistTokenSearchFieldProps) {
  const [terms, setTerms] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filterQuery = joinSearchTerms(terms, draft);

  useEffect(() => {
    onQueryChange(filterQuery);
  }, [filterQuery, onQueryChange]);

  const commitDraft = useCallback(() => {
    const raw = inputRef.current?.value ?? draft;
    const term = raw.trim();
    if (!term) return;
    setTerms((current) =>
      current.some((t) => t.toLowerCase() === term.toLowerCase())
        ? current
        : [...current, term],
    );
    setDraft('');
  }, [draft]);

  const handleFormSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      event.stopPropagation();
      commitDraft();
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [commitDraft],
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        commitDraft();
        return;
      }

      if (event.key === 'Backspace' && !draft && terms.length > 0) {
        event.preventDefault();
        setTerms((current) => current.slice(0, -1));
      }
    },
    [commitDraft, draft, terms.length],
  );

  const handleClearAll = useCallback(() => {
    setTerms([]);
    setDraft('');
  }, []);

  const handleRemoveTerm = useCallback((term: string) => {
    setTerms((current) => current.filter((t) => t !== term));
  }, []);

  const showClear = terms.length > 0 || Boolean(draft.trim());

  return (
    <Box component="form" onSubmit={handleFormSubmit} sx={{ width: '100%' }}>
      <TextField
        inputRef={inputRef}
        placeholder={placeholder}
        size="small"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.tertiary', fontSize: '1rem' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <ClearSearchAdornment
              visible={showClear}
              onClear={handleClearAll}
            />
          ),
        }}
        inputProps={{
          onKeyDown: handleInputKeyDown,
        }}
        sx={{
          width: '100%',
          '& .MuiOutlinedInput-root': {
            color: 'text.primary',
            backgroundColor: 'background.default',
            fontSize: '0.8rem',
            height: '34px',
            borderRadius: 2,
            '& fieldset': { borderColor: 'border.light' },
            '&:hover fieldset': { borderColor: 'border.medium' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
          },
        }}
      />

      {terms.length > 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
            mt: 1,
          }}
        >
          {terms.map((term) => (
            <Chip
              key={term}
              label={term}
              variant="filter"
              size="small"
              onDelete={() => handleRemoveTerm(term)}
              sx={(t) => ({
                fontFamily: t.typography.mono.fontFamily,
                fontSize: '0.68rem',
              })}
            />
          ))}
        </Box>
      ) : null}

      {terms.length > 0 ? (
        <Typography
          component="button"
          type="button"
          onClick={handleClearAll}
          sx={(t) => ({
            mt: 0.75,
            border: 0,
            p: 0,
            background: 'none',
            cursor: 'pointer',
            fontFamily: t.typography.mono.fontFamily,
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'status.info',
            '&:hover': { textDecoration: 'underline' },
          })}
        >
          Clear all search terms
        </Typography>
      ) : null}
    </Box>
  );
}

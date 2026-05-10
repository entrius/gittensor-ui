import { useState } from 'react';
import {
  IconButton,
  InputAdornment,
  TextField,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import theme from '../../theme';

export interface ToolbarSearchOptions {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  openButtonLabel: string;
}

export const TOOLBAR_SEARCH_FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    color: 'text.primary',
    backgroundColor: 'background.default',
    fontSize: '0.8rem',
    height: '36px',
    borderRadius: 2,
    '& fieldset': { borderColor: 'border.light' },
    '&:hover fieldset': { borderColor: 'border.medium' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
} as const;

export const TOOLBAR_MOBILE_SEARCH_BUTTON_SX = {
  color: 'text.tertiary',
  border: '1px solid',
  borderColor: 'border.light',
  borderRadius: 2,
  width: 36,
  height: 36,
  '&:hover': {
    backgroundColor: 'surface.light',
    borderColor: 'border.medium',
  },
} as const;

/**
 * Responsive search control for inline toolbars on narrow screens.
 *
 * On `xs`: collapses to an icon button until tapped (or until search has a value).
 * On `sm` and up: always shows the full search input.
 *
 * Returns `searchControl` (JSX) for the toolbar slot, and `trailingControlSx`
 * for the trailing-controls row that should reflow when search expands on mobile.
 *
 * Originally introduced in PR #891 as `useWatchlistToolbarSearch`. Kept here as
 * a shared utility so any inline-toolbar table can adopt the responsive-search
 * UX. WatchlistPage itself now uses `WatchlistPortal` (added in #929) and does
 * not call this hook directly, but Miner / Repository tables with inline
 * toolbars can.
 */
export const useToolbarSearch = ({
  value,
  onChange,
  placeholder,
  openButtonLabel,
}: ToolbarSearchOptions) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const trimmedSearch = value.trim();
  const isMobileSearchVisible =
    isMobile && (isMobileSearchOpen || !!trimmedSearch);

  const searchInput = (
    <TextField
      placeholder={placeholder}
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (isMobile && !trimmedSearch) {
          setIsMobileSearchOpen(false);
        }
      }}
      autoFocus={isMobileSearchOpen}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: 'text.tertiary', fontSize: '1rem' }} />
          </InputAdornment>
        ),
      }}
      sx={{
        width: '220px',
        ...(isMobileSearchVisible
          ? {
              width: '100%',
              flexBasis: { xs: '100%', sm: 'auto' },
              order: { xs: 10, sm: 'initial' },
            }
          : {}),
        ...TOOLBAR_SEARCH_FIELD_SX,
      }}
    />
  );

  return {
    searchControl: isMobileSearchVisible ? (
      searchInput
    ) : isMobile ? (
      <IconButton
        size="small"
        aria-label={openButtonLabel}
        onClick={() => setIsMobileSearchOpen(true)}
        sx={TOOLBAR_MOBILE_SEARCH_BUTTON_SX}
      >
        <SearchIcon sx={{ fontSize: '1rem' }} />
      </IconButton>
    ) : (
      searchInput
    ),
    trailingControlSx: {
      ml: 'auto',
      width: isMobileSearchVisible ? { xs: '100%', sm: 'auto' } : 'auto',
      display: 'flex',
      justifyContent: isMobileSearchVisible
        ? { xs: 'flex-end', sm: 'flex-start' }
        : 'flex-start',
    } as const,
  };
};

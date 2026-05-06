import React, { useEffect, useState } from 'react';
import {
  Box,
  Collapse,
  Divider,
  InputAdornment,
  Popover,
  Portal,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import theme from '../../theme';

/** Section header inside tabs-options sidebar / popover. */
export const TabsOptionsLabel: React.FC<{
  children: React.ReactNode;
  /** When false, omits bottom margin (e.g. paired headings on one line). */
  gutterBottom?: boolean;
}> = ({ children, gutterBottom = true }) => (
  <Typography
    sx={(t) => ({
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.72rem',
      fontWeight: 600,
      color: alpha(t.palette.text.secondary, 0.95),
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      mb: gutterBottom ? 1.25 : 0,
      lineHeight: 1.3,
    })}
  >
    {children}
  </Typography>
);

export interface TabsOptionsPortalProps {
  filterContent: React.ReactNode;
  extraContent?: React.ReactNode;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (v: string) => void;
  viewMode: string;
  onViewModeChange: (v: any) => void;
  viewModeToggle: React.ReactNode;
  hasActiveFilter: boolean;
  /**
   * When true, skip the built-in “View” heading — pass headings + controls inside `viewModeToggle`
   * (e.g. View | Chart titles on one line with controls below).
   */
  viewSlotIncludesHeading?: boolean;
}

/** Sidebar panel on xl (`#tabs-options-portal`); compact Options popover otherwise. */
export const TabsOptionsPortal: React.FC<TabsOptionsPortalProps> = (props) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));

  useEffect(() => {
    setTarget(document.getElementById('tabs-options-portal'));
  }, []);

  if (target && isLargeScreen) {
    return (
      <Portal container={target}>
        <TabsOptionsSidebarPanel {...props} />
      </Portal>
    );
  }

  return (
    <Box
      sx={{
        p: 1.5,
        display: 'flex',
        justifyContent: 'flex-end',
        borderBottom: '1px solid',
        borderColor: 'border.light',
      }}
    >
      <TabsOptionsPopoverButton {...props} />
    </Box>
  );
};

const TabsOptionsSidebarPanel: React.FC<TabsOptionsPortalProps> = (props) => {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        sx={(t) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: 0,
          background: 'none',
          cursor: 'pointer',
          p: 0,
          color: t.palette.text.primary,
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <TuneOutlinedIcon
            sx={{ fontSize: '1rem', color: 'text.secondary' }}
          />
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Filters
          </Typography>
          {props.hasActiveFilter && (
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'status.info',
              }}
            />
          )}
        </Box>
        <KeyboardArrowDownIcon
          sx={{
            fontSize: '1.1rem',
            color: 'text.secondary',
            transform: open ? 'rotate(-180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </Box>
      <Collapse in={open}>
        <Box sx={{ pt: 2 }}>
          <TabsOptionsSidebarPanelContent {...props} />
        </Box>
      </Collapse>
    </Box>
  );
};

const tabsOptionsDivider = (
  <Divider
    sx={{
      borderColor: 'border.subtle',
      opacity: 1,
    }}
  />
);

const TabsOptionsSidebarPanelContent: React.FC<TabsOptionsPortalProps> = ({
  filterContent,
  extraContent,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  viewModeToggle,
  viewSlotIncludesHeading = false,
}) => (
  <Stack spacing={2.25} divider={tabsOptionsDivider} sx={{ width: '100%' }}>
    <Box>
      <TabsOptionsLabel>Filter</TabsOptionsLabel>
      {filterContent}
    </Box>

    <Box>
      <TabsOptionsLabel>Search</TabsOptionsLabel>
      <TextField
        placeholder={searchPlaceholder}
        size="small"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.tertiary', fontSize: '1rem' }} />
            </InputAdornment>
          ),
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
    </Box>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {!viewSlotIncludesHeading ? (
        <TabsOptionsLabel>View</TabsOptionsLabel>
      ) : null}
      {viewModeToggle}
    </Box>

    {extraContent != null ? (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {extraContent}
      </Box>
    ) : null}
  </Stack>
);

const TabsOptionsPopoverButton: React.FC<TabsOptionsPortalProps> = (props) => {
  const { hasActiveFilter } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Options" arrow>
        <Box
          component="button"
          type="button"
          onClick={(e) =>
            setAnchorEl((prev) => (prev ? null : e.currentTarget))
          }
          sx={(t) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            minHeight: 32,
            borderRadius: 2,
            border: `1px solid ${t.palette.border.light}`,
            backgroundColor: open
              ? alpha(t.palette.text.primary, 0.06)
              : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              backgroundColor: alpha(t.palette.text.primary, 0.04),
              borderColor: t.palette.border.medium,
            },
          })}
        >
          <TuneOutlinedIcon
            sx={{ fontSize: '1rem', color: 'text.secondary' }}
          />
          <Typography
            component="span"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'text.secondary',
            }}
          >
            Options
          </Typography>
          {hasActiveFilter && (
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'status.info',
              }}
            />
          )}
        </Box>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: (t) => ({
              mt: 1,
              p: 2.5,
              minWidth: 300,
              borderRadius: 3,
              border: `1px solid ${t.palette.border.light}`,
              backgroundColor: t.palette.background.default,
              backgroundImage: 'none',
            }),
          },
        }}
      >
        <TabsOptionsSidebarPanelContent {...props} />
      </Popover>
    </>
  );
};

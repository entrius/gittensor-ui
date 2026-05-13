import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

export const TABS_OPTIONS_PORTAL_ID = 'tabs-options-portal';

interface TabsOptionsPortalProps {
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export const TabsOptionsPortal: React.FC<TabsOptionsPortalProps> = ({
  children,
  sx,
}) => (
  <Box
    id={TABS_OPTIONS_PORTAL_ID}
    sx={[
      {
        display: 'none',
        '@media (min-width: 1536px)': {
          display: 'flex',
          flexDirection: 'column',
          p: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'background.default',
        },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

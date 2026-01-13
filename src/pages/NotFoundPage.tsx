import React from 'react';
import { FaceFrownIcon } from '@heroicons/react/24/outline';
import { Stack, Typography } from '@mui/material';

const NotFoundPage: React.FC = () => (
    <Stack
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
      }}
      direction="row"
      gap={2}
    >
      <Typography variant="h4">404 Not Found</Typography>
      <FaceFrownIcon
        style={{
          height: 32,
          width: 32,
          backgroundColor: 'primary.main',
        }}
      />
    </Stack>
  );

export default NotFoundPage;

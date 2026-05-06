import React from 'react';
import {
  Card,
  Box,
  Typography,
  CardContent,
  Grid,
  type SxProps,
  type Theme,
} from '@mui/material';

export const SectionCard: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  title?: string;
  action?: React.ReactNode;
  centerContent?: React.ReactNode;
}> = ({ children, sx, title, action, centerContent }) => {
  const hasAction = !!action;
  const hasCenter = !!centerContent;

  return (
    <Card
      sx={(theme) => ({
        borderRadius: 3,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        backgroundColor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        ...(sx as Record<string, unknown>),
      })}
      elevation={0}
    >
      {/* Header with Grid Layout for better scaling */}
      {(title || action || centerContent) && (
        <Grid
          container
          sx={{
            p: 2,
            pb: 1,
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Title Section */}
          {title && (
            <Grid
              item
              xs={12}
              sm={hasAction ? 6 : 12}
              lg={hasCenter ? 3 : hasAction ? 6 : 12}
              order={{ xs: 1, lg: 1 }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                }}
              >
                {title}
              </Typography>
            </Grid>
          )}

          {/* Center Content (Sort Buttons) */}
          {hasCenter && (
            <Grid
              item
              xs={12}
              lg={6}
              order={{ xs: 3, lg: 2 }}
              sx={{
                display: 'flex',
                justifyContent: { xs: 'flex-start', lg: 'center' },
                mt: { xs: 2, lg: 0 }, // Add margin on mobile when stacked
              }}
            >
              {centerContent}
            </Grid>
          )}

          {/* Action Section (Search) */}
          {hasAction && (
            <Grid
              item
              xs={12}
              sm={6}
              lg={hasCenter ? 3 : 6}
              order={{ xs: 2, lg: 3 }}
              sx={{
                display: 'flex',
                justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                mt: { xs: 1, sm: 0 },
              }}
            >
              <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>{action}</Box>
            </Grid>
          )}
        </Grid>
      )}

      <CardContent
        sx={{
          p: 0,
          '&:last-child': { pb: 0 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
};

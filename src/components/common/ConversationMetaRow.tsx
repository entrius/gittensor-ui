import React from 'react';
import { Box, Chip, Link, Typography } from '@mui/material';
import { STATUS_COLORS } from '../../theme';

interface ConversationMetaRowProps {
  login: string | null;
  htmlUrl: string;
  createdAt: string;
  authorAssociation?: string;
  isDescription?: boolean;
  colors: {
    fgDefault: string;
    fgMuted: string;
    borderDefault: string;
  };
}

export const ConversationMetaRow: React.FC<ConversationMetaRowProps> = ({
  login,
  htmlUrl,
  createdAt,
  authorAssociation,
  isDescription = false,
  colors,
}) => (
  <>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Link
        href={htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          color: colors.fgDefault,
          fontWeight: 600,
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
            color: STATUS_COLORS.info,
          },
        }}
      >
        {login}
      </Link>
      <Typography component="span" sx={{ fontSize: 'inherit', color: 'inherit' }}>
        commented
      </Typography>
      <Typography component="span" sx={{ fontSize: 'inherit', color: 'inherit' }}>
        {new Date(createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </Typography>
    </Box>

    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {authorAssociation && authorAssociation !== 'NONE' && (
        <Chip
          variant="status"
          label={authorAssociation.toLowerCase().replace('_', ' ')}
          sx={{
            color: colors.fgMuted,
            borderColor: colors.borderDefault,
            textTransform: 'capitalize',
          }}
        />
      )}
      {isDescription && (
        <Chip
          variant="status"
          label="Description"
          sx={{
            color: STATUS_COLORS.info,
            borderColor: 'rgba(56, 139, 253, 0.4)',
          }}
        />
      )}
    </Box>
  </>
);

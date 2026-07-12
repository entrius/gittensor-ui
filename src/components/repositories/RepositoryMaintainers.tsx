import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Tooltip,
  Link,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material';
import { useRepositoryMaintainers } from '../../api';
import { type RepositoryMaintainer } from '../../api/models';
import { STATUS_COLORS } from '../../theme';

interface RepositoryMaintainersProps {
  repositoryFullName: string;
}

// When the API lists no maintainers (or the request fails), fall back to the
// repo owner so the section never disappears from the sidebar.
const ownerFallback = (repositoryFullName: string): RepositoryMaintainer[] => {
  const owner = repositoryFullName.split('/')[0];
  if (!owner) return [];
  return [
    {
      login: owner,
      avatarUrl: `https://github.com/${owner}.png?size=80`,
      htmlUrl: `https://github.com/${owner}`,
      type: 'User',
    },
  ];
};

const RepositoryMaintainers: React.FC<RepositoryMaintainersProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const { data: maintainers, isLoading } =
    useRepositoryMaintainers(repositoryFullName);

  if (isLoading) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: 'text.secondary',
            mb: 2,
          }}
        >
          Maintainers
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="circular" width={40} height={40} />
        </Box>
      </Box>
    );
  }

  const displayMaintainers =
    maintainers && maintainers.length > 0
      ? maintainers
      : ownerFallback(repositoryFullName);

  if (displayMaintainers.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="subtitle2"
        sx={{
          color: 'text.secondary',
          mb: 2,
        }}
      >
        Maintainers{' '}
        <Typography
          component="span"
          sx={{ color: STATUS_COLORS.open, fontSize: '0.8em' }}
        >
          ({displayMaintainers.length})
        </Typography>
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {displayMaintainers.map((maintainer) => (
          <Tooltip key={maintainer.login} title={maintainer.login} arrow>
            <Link
              href={maintainer.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textDecoration: 'none' }}
            >
              <Avatar
                src={maintainer.avatarUrl}
                alt={maintainer.login}
                sx={{
                  width: 40,
                  height: 40,
                  border: '2px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    borderColor: 'primary.main',
                    boxShadow: `0 0 8px ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                }}
              />
            </Link>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
};

export default RepositoryMaintainers;

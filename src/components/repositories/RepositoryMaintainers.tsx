import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Tooltip,
  Link,
  Skeleton,
} from '@mui/material';
import { useRepositoryMaintainers } from '../../api';
import { STATUS_COLORS } from '../../theme';

interface RepositoryMaintainersProps {
  repositoryFullName: string;
}

const RepositoryMaintainers: React.FC<RepositoryMaintainersProps> = ({
  repositoryFullName,
}) => {
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

  if (!maintainers || maintainers.length === 0) {
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
          ({maintainers.length})
        </Typography>
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {maintainers.map((maintainer) => (
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
                    boxShadow: '0 0 8px rgba(247, 129, 102, 0.4)',
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

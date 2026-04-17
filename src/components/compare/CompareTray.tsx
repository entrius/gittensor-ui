import React from 'react';
import {
  Box,
  Avatar,
  Typography,
  Button,
  Tooltip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePulseBoard } from '../../hooks/usePulseBoard';
import { useMinerGithubData } from '../../api';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';

interface AvatarChipProps {
  githubId: string;
  onRemove: () => void;
}

const AvatarChip: React.FC<AvatarChipProps> = ({ githubId, onRemove }) => {
  const navigate = useNavigate();
  const { data: githubData } = useMinerGithubData(githubId);
  const username = githubData?.login || githubId;
  const avatarSrc = githubData?.avatarUrl || getGithubAvatarSrc(username);

  return (
    <Tooltip title={username} placement="top" arrow>
      <Box
        sx={{
          position: 'relative',
          cursor: 'pointer',
          '&:hover .remove-btn': { opacity: 1 },
        }}
      >
        <Avatar
          src={avatarSrc}
          onClick={() =>
            navigate(`/miners/details?githubId=${encodeURIComponent(githubId)}`)
          }
          sx={{
            width: 28,
            height: 28,
            border: '2px solid',
            borderColor: 'border.medium',
            transition: 'border-color 0.15s',
            '&:hover': { borderColor: 'primary.main' },
          }}
        />
        <IconButton
          className="remove-btn"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Unpin ${username}`}
          sx={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 16,
            height: 16,
            backgroundColor: 'background.default',
            border: '1px solid',
            borderColor: 'border.light',
            opacity: 0,
            transition: 'opacity 0.15s',
            '&:hover': { backgroundColor: 'error.dark' },
          }}
        >
          <CloseIcon sx={{ fontSize: 10 }} />
        </IconButton>
      </Box>
    </Tooltip>
  );
};

export const CompareTray: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { pinned, pinnedCount, unpin } = usePulseBoard();
  const isOnComparePage = location.pathname === '/compare';

  if (pinnedCount === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 3,
        backgroundColor: alpha(theme.palette.background.default, 0.92),
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${theme.palette.border.light}`,
        boxShadow: `0 -2px 12px ${alpha(theme.palette.common.black, 0.3)}`,
      }}
      role="toolbar"
      aria-label="Pulse Board tray"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {pinned.map((id) => (
          <AvatarChip key={id} githubId={id} onRemove={() => unpin(id)} />
        ))}
      </Box>

      <Typography
        sx={{
          fontSize: '0.72rem',
          fontFamily: '"JetBrains Mono", monospace',
          color: 'text.secondary',
          mx: 1,
        }}
      >
        {pinnedCount} {pinnedCount === 1 ? 'miner' : 'miners'} pinned
      </Typography>

      {!isOnComparePage && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<CompareArrowsIcon sx={{ fontSize: '1rem !important' }} />}
          onClick={() => navigate('/compare')}
          sx={{
            textTransform: 'none',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.75rem',
            borderColor: 'border.medium',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          View Board
        </Button>
      )}
    </Box>
  );
};

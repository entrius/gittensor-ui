import React from 'react';
import { Box } from '@mui/material';
import LiveCommitLog from './LiveCommitLog';

interface LiveSidebarProps {
  showSidebarRight: boolean;
  sidebarWidth: string;
}

const LiveSidebar: React.FC<LiveSidebarProps> = ({
  showSidebarRight,
  sidebarWidth,
}) => {
  // When docked right, the sidebar stretches to the height of the main
  // column without contributing height of its own: the row's stretch sets
  // the outer Box height, and the feed absolutely fills it.
  if (showSidebarRight) {
    return (
      <Box
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          position: 'relative',
          alignSelf: 'stretch',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <LiveCommitLog />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '700px',
        maxHeight: '700px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <LiveCommitLog />
    </Box>
  );
};

export default LiveSidebar;

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
  return (
    <Box
      sx={{
        width: showSidebarRight ? sidebarWidth : '100%',
        height: showSidebarRight ? '100%' : '700px',
        maxHeight: showSidebarRight ? '100%' : '700px',
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

import React from 'react';
import { scrollbarSx } from '../../theme';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import useAbortableFetch from '../../hooks/useAbortableFetch';

interface CodeViewerProps {
  repositoryFullName: string;
  filePath: string | null;
  defaultBranch?: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({
  repositoryFullName,
  filePath,
  defaultBranch = 'main',
}) => {
  const extension = filePath?.split('.').pop()?.toLowerCase();
  const isImage =
    extension &&
    ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(extension);
  const rawUrl = filePath
    ? `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${defaultBranch}/${filePath}`
    : '';

  const { data: content, loading, error } = useAbortableFetch<string>(
    async (signal) => {
      if (!filePath || isImage) return null;
      const response = await axios.get(rawUrl, {
        transformResponse: [(data) => data],
        signal,
      });
      return response.data as string;
    },
    [repositoryFullName, filePath, defaultBranch, isImage, rawUrl],
    {
      initialLoading: false,
      errorMessage: 'Could not load file content. It might be binary or too large.',
    },
  );

  if (!filePath) {
    return (
      <Box
        sx={{
          p: 4,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: 'text.secondary',
        }}
      >
        <Typography>Select a file to view code</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (isImage) {
    return (
      <Box
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0d1117',
          p: 4,
        }}
      >
        <Box
          component="img"
          src={rawUrl}
          alt={filePath}
          sx={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            border: '1px solid #30363d',
            borderRadius: '6px',
            backgroundColor: '#161b22', // slight background to see transparent pngs better
          }}
        />
      </Box>
    );
  }

  // Special rendering for markdown
  if (extension === 'md') {
    return (
      <Box
        sx={{
          p: 3,
          height: '100%',
          overflow: 'auto',
          ...scrollbarSx,
          '& img': { maxWidth: '100%' },
          '& pre': {
            backgroundColor: '#1e1e1e',
            p: 2,
            borderRadius: 1,
            overflowX: 'auto',
          },
          '& code': {
            fontFamily: 'monospace',
            backgroundColor: 'rgba(255,255,255,0.1)',
            px: 0.5,
            borderRadius: 0.5,
          },
          '& h1, & h2, & h3': {
            color: '#fff',
            borderBottom: '1px solid #30363d',
            pb: 1,
          },
          color: '#c9d1d9',
          lineHeight: 1.6,
        }}
      >
        <ReactMarkdown>{content || ''}</ReactMarkdown>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
        fontSize: '14px',
        '& pre': {
          ...scrollbarSx,
        },
      }}
    >
      <SyntaxHighlighter
        language={extension || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          minHeight: '100%',
          backgroundColor: 'transparent',
        }}
        showLineNumbers={true}
      >
        {content || ''}
      </SyntaxHighlighter>
    </Box>
  );
};

export default CodeViewer;

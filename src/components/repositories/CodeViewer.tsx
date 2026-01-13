import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';

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
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const extension = filePath?.split('.').pop()?.toLowerCase();
  const isImage =
    extension &&
    ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(extension);
  const rawUrl = filePath
    ? `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${defaultBranch}/${filePath}`
    : '';

  useEffect(() => {
    const fetchContent = async () => {
      if (!filePath || isImage) {
        // Don't fetch text content for images or if no file selected
        setContent(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Use raw.githubusercontent.com
        const response = await axios.get(rawUrl, {
          transformResponse: [(data) => data],
        }); // Force text
        setContent(response.data);
      } catch (err) {
        console.error('Failed to fetch file content', err);
        setError(
          'Could not load file content. It might be binary or too large.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [repositoryFullName, filePath, defaultBranch, isImage, rawUrl]);

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
        overflow: 'auto',
        backgroundColor: '#1e1e1e',
        fontSize: '14px',
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

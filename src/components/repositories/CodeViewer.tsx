import React from 'react';
import { scrollbarSx } from '../../theme';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import { githubErrorMessage, useGithubQuery } from '../../api';

interface CodeViewerProps {
  repositoryFullName: string;
  filePath: string | null;
  defaultBranch?: string;
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'ico',
]);

const CodeViewer: React.FC<CodeViewerProps> = ({
  repositoryFullName,
  filePath,
  defaultBranch = 'main',
}) => {
  const theme = useTheme();

  const extension = filePath?.split('.').pop()?.toLowerCase();
  const isImage = !!extension && IMAGE_EXTENSIONS.has(extension);
  const rawUrl = filePath
    ? `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${defaultBranch}/${filePath}`
    : '';

  // Images render directly in an <img>; only fetch text content here.
  const {
    data: content,
    error,
    isLoading,
  } = useGithubQuery<string>(!filePath || isImage ? null : rawUrl, {
    responseType: 'text',
    enabled: !!filePath && !isImage,
  });

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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {githubErrorMessage(
          error,
          'Could not load file content. It might be binary or too large.',
        )}
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
          backgroundColor: theme.palette.background.default,
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
            border: `1px solid ${theme.palette.border.light}`,
            borderRadius: '6px',
            backgroundColor: theme.palette.surface.elevated,
          }}
        />
      </Box>
    );
  }

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
            backgroundColor: theme.palette.surface.tooltip,
            p: 2,
            borderRadius: 1,
            overflowX: 'auto',
          },
          '& code': {
            fontFamily: 'monospace',
            backgroundColor: alpha(theme.palette.common.white, 0.1),
            px: 0.5,
            borderRadius: 0.5,
          },
          '& h1, & h2, & h3': {
            color: theme.palette.text.primary,
            borderBottom: `1px solid ${theme.palette.border.light}`,
            pb: 1,
          },
          color: theme.palette.text.tertiary,
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
        backgroundColor: theme.palette.surface.tooltip,
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

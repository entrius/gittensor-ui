import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import axios from 'axios';
import { SafeMarkdown } from '../common';
import { resolveRelativeUrl } from './MarkdownRenderers';
import { markdownDocumentPaperSx } from '../../theme';

interface ReadmeViewerProps {
  repositoryFullName: string; // e.g., "opentensor/bittensor"
}

const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ repositoryFullName }) => {
  const theme = useTheme();
  const [content, setContent] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchReadme = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try 'main' branch first
        try {
          const response = await axios.get(
            `https://cdn.jsdelivr.net/gh/${repositoryFullName}@main/README.md`,
            { signal: controller.signal },
          );
          if (controller.signal.aborted) return;
          setContent(response.data);
          setDefaultBranch('main');
        } catch (err) {
          if (axios.isCancel(err) || controller.signal.aborted) return;
          // Fallback to 'master' branch
          const response = await axios.get(
            `https://cdn.jsdelivr.net/gh/${repositoryFullName}@master/README.md`,
            { signal: controller.signal },
          );
          if (controller.signal.aborted) return;
          setContent(response.data);
          setDefaultBranch('master');
        }
      } catch (err) {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        console.error('Failed to fetch README', err);
        setError('Could not load README.md');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (repositoryFullName) fetchReadme();
    return () => controller.abort();
  }, [repositoryFullName]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="warning"
        sx={{
          backgroundColor: alpha(theme.palette.warning.main, 0.1),
          color: theme.palette.warning.main,
        }}
      >
        {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={0} sx={markdownDocumentPaperSx(theme)}>
      <SafeMarkdown
        components={{
          a: ({
            href,
            children,
            ...rest
          }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
            <a
              href={resolveRelativeUrl(href, repositoryFullName, defaultBranch)}
              target="_blank"
              rel="noopener noreferrer"
              {...rest}
            >
              {children}
            </a>
          ),
          img: ({
            src,
            alt,
            ...rest
          }: React.ImgHTMLAttributes<HTMLImageElement>) => (
            <img
              src={resolveRelativeUrl(
                src,
                repositoryFullName,
                defaultBranch,
                'cdn',
              )}
              alt={alt}
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '6px',
                margin: '16px 0',
              }}
              {...rest}
            />
          ),
        }}
      >
        {content || ''}
      </SafeMarkdown>
    </Paper>
  );
};

export default ReadmeViewer;

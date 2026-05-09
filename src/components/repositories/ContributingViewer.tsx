import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import { resolveRelativeUrl, getImageSizeHint } from './MarkdownRenderers';
import { markdownDocumentPaperSx } from '../../theme';

interface ContributingViewerProps {
  repositoryFullName: string; // e.g., "opentensor/bittensor"
}

const ContributingViewer: React.FC<ContributingViewerProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const [content, setContent] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchContributing = async () => {
      setLoading(true);
      setError(null);

      const branches = ['main', 'master'];
      const paths = [
        'CONTRIBUTING.md',
        '.github/CONTRIBUTING.md',
        'docs/CONTRIBUTING.md',
      ];

      for (const branch of branches) {
        for (const path of paths) {
          if (controller.signal.aborted) return;
          try {
            const response = await axios.get(
              `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${branch}/${path}`,
              { signal: controller.signal },
            );
            if (controller.signal.aborted) return;
            if (response.status === 200 && response.data) {
              setContent(response.data);
              setDefaultBranch(branch);
              setLoading(false);
              return;
            }
          } catch (err) {
            if (axios.isCancel(err) || controller.signal.aborted) return;
            // Continue to next combination
          }
        }
      }

      if (controller.signal.aborted) return;
      // If we get here, nothing was found
      setError('No contributing guidelines found for this repository.');
      setLoading(false);
    };

    if (repositoryFullName) fetchContributing();
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
        severity="info"
        sx={{
          backgroundColor: alpha(theme.palette.info.main, 0.1),
          color: theme.palette.info.main,
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}
      >
        {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={0} sx={markdownDocumentPaperSx(theme)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
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
          }: React.ImgHTMLAttributes<HTMLImageElement>) => {
            const sizeHint = getImageSizeHint(src);
            return (
              <img
                src={resolveRelativeUrl(
                  src,
                  repositoryFullName,
                  defaultBranch,
                  'cdn',
                )}
                alt={alt}
                {...(sizeHint ? { width: sizeHint, height: sizeHint } : {})}
                style={
                  sizeHint
                    ? {
                        width: sizeHint,
                        height: sizeHint,
                        borderRadius: '6px',
                      }
                    : {
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '6px',
                        margin: '16px 0',
                      }
                }
                {...rest}
              />
            );
          },
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </Paper>
  );
};

export default ContributingViewer;

import React, { useState, useEffect } from 'react';
import { Box, Paper, CircularProgress, Alert } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import { STATUS_COLORS } from '../../theme';
import { resolveRelativeUrl } from './MarkdownRenderers';

interface ContributingViewerProps {
  repositoryFullName: string; // e.g., "opentensor/bittensor"
}

const ContributingViewer: React.FC<ContributingViewerProps> = ({
  repositoryFullName,
}) => {
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
          backgroundColor: 'rgba(2, 136, 209, 0.1)',
          color: '#0288d1',
          border: '1px solid rgba(2, 136, 209, 0.2)',
        }}
      >
        {error}
      </Alert>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 5 },
        pt: { xs: 2, md: 0 },
        maxWidth: '900px',
        mx: 'auto',
        backgroundColor: 'transparent',
        color: '#c9d1d9',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        lineHeight: 1.6,
        '& h1': {
          fontSize: '2em',
          borderBottom: '1px solid #30363d',
          pb: 0.3,
          mb: 3,
          mt: 1,
          fontWeight: 600,
          color: '#ffffff',
        },
        '& h2': {
          fontSize: '1.5em',
          borderBottom: '1px solid #30363d',
          pb: 0.3,
          mb: 3,
          mt: 2,
          fontWeight: 600,
          color: '#ffffff',
        },
        '& h3': {
          fontSize: '1.25em',
          mb: 2,
          mt: 3,
          fontWeight: 600,
          color: '#ffffff',
        },
        '& p': { marginBottom: '16px', fontSize: '16px' },
        '& a': {
          color: STATUS_COLORS.info,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        },
        '& ul, & ol': { marginBottom: '16px', paddingLeft: '2em' },
        '& li': { marginBottom: '4px' },
        '& blockquote': {
          borderLeft: '4px solid #30363d',
          padding: '0 1em',
          color: STATUS_COLORS.open,
          marginLeft: 0,
          marginBottom: '16px',
        },
        '& code': {
          backgroundColor: 'rgba(110, 118, 129, 0.4)',
          padding: '0.2em 0.4em',
          borderRadius: '6px',
          fontSize: '85%',
        },
        '& pre': {
          backgroundColor: '#161b22',
          padding: '16px',
          overflow: 'auto',
          borderRadius: '6px',
          marginBottom: '16px',
          '& code': {
            backgroundColor: 'transparent',
            padding: 0,
            fontSize: '100%',
            color: '#c9d1d9',
          },
        },
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
          marginBottom: '16px',
          display: 'block',
          overflowX: 'auto',
        },
        '& th': {
          fontWeight: 600,
          border: '1px solid #30363d',
          padding: '6px 13px',
          textAlign: 'left',
        },
        '& td': { border: '1px solid #30363d', padding: '6px 13px' },
        '& tr:nth-of-type(2n)': { backgroundColor: '#161b22' },
        '& img': { backgroundColor: 'transparent' },
      }}
    >
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
      </ReactMarkdown>
    </Paper>
  );
};

export default ContributingViewer;

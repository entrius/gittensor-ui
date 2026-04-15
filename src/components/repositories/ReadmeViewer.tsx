import React from 'react';
import { Box, CircularProgress, Alert, Paper } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import { STATUS_COLORS } from '../../theme';
import { resolveRelativeUrl } from './MarkdownRenderers';
import { useAbortableFetch } from '../../hooks/useAbortableFetch';

interface ReadmeViewerProps {
  repositoryFullName: string; // e.g., "opentensor/bittensor"
}

type ReadmeData = { content: string; branch: string };

const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ repositoryFullName }) => {
  const { data, loading, error } = useAbortableFetch<ReadmeData>(
    async (signal) => {
      try {
        const response = await axios.get(
          `https://cdn.jsdelivr.net/gh/${repositoryFullName}@main/README.md`,
          { signal },
        );
        return { content: response.data, branch: 'main' };
      } catch (err) {
        if (axios.isCancel(err)) throw err;
        const response = await axios.get(
          `https://cdn.jsdelivr.net/gh/${repositoryFullName}@master/README.md`,
          { signal },
        );
        return { content: response.data, branch: 'master' };
      }
    },
    [repositoryFullName],
    { enabled: !!repositoryFullName },
  );

  const content = data?.content ?? null;
  const defaultBranch = data?.branch ?? 'main';

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
        sx={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' }}
      >
        Could not load README.md
      </Alert>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 5 },
        pt: { xs: 2, md: 0 }, // Reduce top padding
        maxWidth: '900px',
        mx: 'auto',
        backgroundColor: 'transparent', // Seamless look
        color: '#c9d1d9', // GitHub Dark Text
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
        '& p': {
          marginBottom: '16px',
          fontSize: '16px',
        },
        '& a': {
          color: STATUS_COLORS.info,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        },
        '& ul, & ol': {
          marginBottom: '16px',
          paddingLeft: '2em',
        },
        '& li': {
          marginBottom: '4px',
        },
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
          fontFamily: '"JetBrains Mono", monospace',
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
        '& td': {
          border: '1px solid #30363d',
          padding: '6px 13px',
        },
        '& tr:nth-of-type(2n)': {
          backgroundColor: '#161b22',
        },
        '& img': {
          backgroundColor: 'transparent',
        },
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

export default ReadmeViewer;

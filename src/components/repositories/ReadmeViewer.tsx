import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Paper } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import { STATUS_COLORS } from '../../theme';

interface ReadmeViewerProps {
  repositoryFullName: string; // e.g., "opentensor/bittensor"
}

const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ repositoryFullName }) => {
  const [content, setContent] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReadme = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try 'main' branch first
        try {
          const response = await axios.get(
            `https://cdn.jsdelivr.net/gh/${repositoryFullName}@main/README.md`,
          );
          setContent(response.data);
          setDefaultBranch('main');
        } catch {
          // Fallback to 'master' branch
          const response = await axios.get(
            `https://cdn.jsdelivr.net/gh/${repositoryFullName}@master/README.md`,
          );
          setContent(response.data);
          setDefaultBranch('master');
        }
      } catch (err) {
        console.error('Failed to fetch README', err);
        setError('Could not load README.md');
      } finally {
        setLoading(false);
      }
    };

    if (repositoryFullName) {
      fetchReadme();
    }
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
        sx={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' }}
      >
        {error}
      </Alert>
    );
  }

  // Custom renderer for links to handle relative paths
  const LinkRenderer = (props: any) => {
    const { href, children, ...rest } = props;
    let finalHref = href;

    if (
      href &&
      !href.startsWith('http') &&
      !href.startsWith('//') &&
      !href.startsWith('#') &&
      !href.startsWith('mailto:')
    ) {
      const cleanPath = href.startsWith('./')
        ? href.slice(2)
        : href.startsWith('/')
          ? href.slice(1)
          : href;
      // Use /tree/ for directories (no extension or ends with /), /blob/ for files
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(cleanPath.replace(/\/$/, ''));
      const isDirectory = cleanPath.endsWith('/') || !hasExtension;
      const type = isDirectory ? 'tree' : 'blob';
      const normalizedPath = cleanPath.replace(/\/$/, '');
      finalHref = `https://github.com/${repositoryFullName}/${type}/${defaultBranch}/${normalizedPath}`;
    }

    return (
      <a href={finalHref} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  };

  // Custom renderer for images to handle relative paths
  const ImageRenderer = (props: any) => {
    const { src, alt, ...rest } = props;
    let finalSrc = src;

    if (src && !src.startsWith('http') && !src.startsWith('//')) {
      // Convert relative path to absolute GitHub user content path
      // e.g. ./assets/img.png -> https://raw.githubusercontent.com/user/repo/branch/assets/img.png
      const cleanPath = src.startsWith('./')
        ? src.slice(2)
        : src.startsWith('/')
          ? src.slice(1)
          : src;
      finalSrc = `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${defaultBranch}/${cleanPath}`;
    }

    return (
      <img
        src={finalSrc}
        alt={alt}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '6px',
          margin: '16px 0',
        }}
        {...rest}
      />
    );
  };

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
          mt: 1, // Reduced from 4
          fontWeight: 600,
          color: '#ffffff',
        },
        '& h2': {
          fontSize: '1.5em',
          borderBottom: '1px solid #30363d',
          pb: 0.3,
          mb: 3,
          mt: 2, // Reduced from 4
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
          a: LinkRenderer,
          img: ImageRenderer,
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </Paper>
  );
};

export default ReadmeViewer;

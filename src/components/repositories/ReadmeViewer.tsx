import React from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import { resolveRelativeUrl } from './MarkdownRenderers';
import { markdownDocumentPaperSx } from '../../theme';
import {
  RateLimitError,
  githubErrorMessage,
  githubFetch,
  useGithubQuery,
} from '../../api';

interface ReadmeViewerProps {
  repositoryFullName: string; // e.g., "opentensor/bittensor"
}

interface ReadmeResult {
  content: string;
  branch: string;
}

const README_BRANCHES = ['main', 'master'] as const;

const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ repositoryFullName }) => {
  const theme = useTheme();

  const { data, error, isLoading } = useGithubQuery<ReadmeResult>(null, {
    queryKey: ['readme', repositoryFullName],
    enabled: !!repositoryFullName,
    queryFn: async ({ signal }) => {
      for (const branch of README_BRANCHES) {
        try {
          const content = await githubFetch<string>(
            `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${branch}/README.md`,
            { signal, responseType: 'text' },
          );
          return { content, branch };
        } catch (err) {
          if (axios.isCancel(err) || err instanceof RateLimitError) throw err;
        }
      }
      throw new Error('Could not load README.md');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Alert
        severity="warning"
        sx={{
          backgroundColor: alpha(theme.palette.warning.main, 0.1),
          color: theme.palette.warning.main,
        }}
      >
        {githubErrorMessage(error, 'Could not load README.md')}
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
              href={resolveRelativeUrl(href, repositoryFullName, data.branch)}
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
                data.branch,
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
        {data.content}
      </ReactMarkdown>
    </Paper>
  );
};

export default ReadmeViewer;

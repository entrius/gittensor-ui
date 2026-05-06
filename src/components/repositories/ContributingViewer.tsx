import React from 'react';
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
import { resolveRelativeUrl } from './MarkdownRenderers';
import { markdownDocumentPaperSx } from '../../theme';
import {
  RateLimitError,
  githubErrorMessage,
  githubFetch,
  useGithubQuery,
} from '../../api';

interface ContributingViewerProps {
  repositoryFullName: string; // e.g., "opentensor/bittensor"
}

interface ContributingResult {
  content: string;
  branch: string;
}

const CONTRIBUTING_BRANCHES = ['main', 'master'] as const;
const CONTRIBUTING_PATHS = [
  'CONTRIBUTING.md',
  '.github/CONTRIBUTING.md',
  'docs/CONTRIBUTING.md',
] as const;

const ContributingViewer: React.FC<ContributingViewerProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();

  const { data, error, isLoading } = useGithubQuery<ContributingResult>(null, {
    queryKey: ['contributing', repositoryFullName],
    enabled: !!repositoryFullName,
    queryFn: async ({ signal }) => {
      for (const branch of CONTRIBUTING_BRANCHES) {
        for (const path of CONTRIBUTING_PATHS) {
          try {
            const content = await githubFetch<string>(
              `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${branch}/${path}`,
              { signal, responseType: 'text' },
            );
            if (content) return { content, branch };
          } catch (err) {
            if (axios.isCancel(err) || err instanceof RateLimitError) throw err;
          }
        }
      }
      throw new Error('No contributing guidelines found for this repository.');
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
        severity="info"
        sx={{
          backgroundColor: alpha(theme.palette.info.main, 0.1),
          color: theme.palette.info.main,
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}
      >
        {githubErrorMessage(
          error,
          'No contributing guidelines found for this repository.',
        )}
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

export default ContributingViewer;

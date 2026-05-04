import React, { useState, useEffect } from 'react';
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

interface ReadmeViewerProps {
  repositoryFullName: string; // e.g., "opentensor/bittensor"
}

type ReadmeFormat = 'markdown' | 'html' | 'plain';

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdown', 'mkd', 'mkdn']);

const detectFormat = (filename: string): ReadmeFormat => {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot + 1) : '';
  if (MARKDOWN_EXTENSIONS.has(ext)) return 'markdown';
  if (!ext || ext === 'txt' || ext === 'text') return 'plain';
  // .rst, .adoc, .asciidoc, .mediawiki, .wiki, .org, .pod, .rdoc, .creole, ...
  return 'html';
};

const branchFromDownloadUrl = (url?: string): string | undefined =>
  url?.match(/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/([^/]+)\//)?.[1];

const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ repositoryFullName }) => {
  const theme = useTheme();
  const [content, setContent] = useState<string | null>(null);
  const [format, setFormat] = useState<ReadmeFormat>('markdown');
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchReadme = async () => {
      setLoading(true);
      setError(null);

      // Fast path: README.md via jsdelivr (no GitHub API rate limit).
      // Covers the overwhelming majority of repositories.
      for (const branch of ['main', 'master']) {
        if (controller.signal.aborted) return;
        try {
          const response = await axios.get(
            `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${branch}/README.md`,
            { signal: controller.signal },
          );
          if (controller.signal.aborted) return;
          setContent(response.data);
          setFormat('markdown');
          setDefaultBranch(branch);
          setLoading(false);
          return;
        } catch (err) {
          if (axios.isCancel(err) || controller.signal.aborted) return;
        }
      }

      // Fallback: ask GitHub for the actual README. Handles non-Markdown
      // formats (.rst, .adoc, .mediawiki, ...) and unusual filenames/branches.
      try {
        const metaResponse = await axios.get(
          `https://api.github.com/repos/${repositoryFullName}/readme`,
          {
            headers: { Accept: 'application/vnd.github+json' },
            signal: controller.signal,
          },
        );
        if (controller.signal.aborted) return;

        const filename: string = metaResponse.data?.name ?? 'README';
        const downloadUrl: string | undefined = metaResponse.data?.download_url;
        const branch = branchFromDownloadUrl(downloadUrl) ?? 'main';
        const detected = detectFormat(filename);

        if (detected === 'markdown' || detected === 'plain') {
          const raw = await axios.get(
            downloadUrl ??
              `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${branch}/${filename}`,
            {
              signal: controller.signal,
              transformResponse: [(data) => data], // keep as string
            },
          );
          if (controller.signal.aborted) return;
          setContent(
            typeof raw.data === 'string' ? raw.data : String(raw.data),
          );
          setFormat(detected);
        } else {
          // Ask GitHub to render the README to HTML — this is how GitHub
          // itself displays .rst, .adoc, .mediawiki, etc.
          const htmlResponse = await axios.get(
            `https://api.github.com/repos/${repositoryFullName}/readme`,
            {
              headers: { Accept: 'application/vnd.github.html' },
              signal: controller.signal,
              transformResponse: [(data) => data],
            },
          );
          if (controller.signal.aborted) return;
          setContent(
            typeof htmlResponse.data === 'string'
              ? htmlResponse.data
              : String(htmlResponse.data),
          );
          setFormat('html');
        }
        setDefaultBranch(branch);
      } catch (err) {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        console.error('Failed to fetch README', err);
        setError('Could not load README.');
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
      {format === 'markdown' && (
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
                href={resolveRelativeUrl(
                  href,
                  repositoryFullName,
                  defaultBranch,
                )}
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
      )}
      {format === 'html' && (
        <Box
          sx={{
            '& img': {
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '6px',
              margin: '16px 0',
            },
            '& a': { wordBreak: 'break-word' },
          }}
          // GitHub's HTML rendering pipeline sanitizes output server-side.
          dangerouslySetInnerHTML={{ __html: content || '' }}
        />
      )}
      {format === 'plain' && (
        <Box
          component="pre"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '14px',
          }}
        >
          {content || ''}
        </Box>
      )}
    </Paper>
  );
};

export default ReadmeViewer;

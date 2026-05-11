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
import DOMPurify from 'dompurify';
import { resolveRelativeUrl, getImageSizeHint } from './MarkdownRenderers';
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

/**
 * What rendering pipeline produced `content`. `markdown` content goes through
 * `react-markdown` (the historical fast path used for `README.md`). `html`
 * content is GitHub's server-rendered output for non-Markdown READMEs
 * (`.rst`, `.adoc`, `.mediawiki`, `.org`, etc.) and must be inserted as raw
 * HTML — that's the whole point of the fallback (#852).
 */
export type ReadmeRenderMode = 'markdown' | 'html';

/**
 * GitHub's "get the README" REST endpoint accepts a plain `Accept` header to
 * choose the response format. `application/vnd.github.html` returns the
 * server-rendered HTML for any README format the repo has — including the
 * three formats reported in #852 (`.rst`, `.adoc`, `.mediawiki`) plus the
 * less common `.org`, `.textile`, etc. Centralised so the test pins the URL.
 */
export function githubReadmeHtmlUrl(repositoryFullName: string): string {
  return `https://api.github.com/repos/${repositoryFullName}/readme`;
}

/**
 * jsDelivr serves the raw `.md` file directly off GitHub via CDN — no API
 * quota. Kept as the fast path for the common case (Markdown READMEs) so the
 * fallback only fires when jsDelivr 404s, which means the repo's README is
 * not `.md` or doesn't exist on the requested branch.
 */
export function jsdelivrReadmeMdUrl(
  repositoryFullName: string,
  branch: string,
): string {
  return `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${branch}/README.md`;
}

type ReadmeResult =
  | { renderMode: 'markdown'; content: string; branch: string }
  | { renderMode: 'html'; content: string };

const README_BRANCHES = ['main', 'master'] as const;

const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ repositoryFullName }) => {
  const theme = useTheme();

  const { data, error, isLoading } = useGithubQuery<ReadmeResult>(null, {
    queryKey: ['readme', repositoryFullName],
    enabled: !!repositoryFullName,
    queryFn: async ({ signal }) => {
      // Fast path: jsDelivr CDN for Markdown READMEs (most repos).
      for (const branch of README_BRANCHES) {
        try {
          const content = await githubFetch<string>(
            jsdelivrReadmeMdUrl(repositoryFullName, branch),
            { signal, responseType: 'text' },
          );
          return { renderMode: 'markdown', content, branch };
        } catch (err) {
          if (axios.isCancel(err) || err instanceof RateLimitError) throw err;
          // jsDelivr 404 — try next branch, then fall through to GitHub.
        }
      }

      // Fallback path: GitHub's `/readme` endpoint with the
      // `application/vnd.github.html` media type returns server-rendered HTML
      // for any README format the repo has — fixes #852 for `.rst`, `.adoc`,
      // `.mediawiki`, plus `.org` and other less-common formats.
      const html = await githubFetch<string>(
        githubReadmeHtmlUrl(repositoryFullName),
        {
          signal,
          headers: { Accept: 'application/vnd.github.html' },
          responseType: 'text',
        },
      );
      return { renderMode: 'html', content: html };
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
        {githubErrorMessage(error, 'Could not load README')}
      </Alert>
    );
  }

  if (data.renderMode === 'html') {
    // GitHub's `application/vnd.github.html` payload is already sanitized by
    // the same renderer github.com itself uses. DOMPurify runs on top as
    // defense in depth — this is the codebase's first dangerouslySetInnerHTML
    // call site, so a client-side sanitizer keeps any future regression in the
    // upstream pipeline (e.g. a relaxed Accept header, or a transport that
    // bypasses GitHub's renderer) from becoming an XSS surface in the UI.
    return (
      <Paper elevation={0} sx={markdownDocumentPaperSx(theme)}>
        <Box
          className="readme-html"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(data.content),
          }}
        />
      </Paper>
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
          }: React.ImgHTMLAttributes<HTMLImageElement>) => {
            const sizeHint = getImageSizeHint(src);
            return (
              <img
                src={resolveRelativeUrl(
                  src,
                  repositoryFullName,
                  data.branch,
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
        {data.content}
      </ReactMarkdown>
    </Paper>
  );
};

export default ReadmeViewer;

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

const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ repositoryFullName }) => {
  const theme = useTheme();
  const [content, setContent] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<ReadmeRenderMode>('markdown');
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchReadme = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fast path: jsDelivr CDN for Markdown READMEs (most repos).
        for (const branch of ['main', 'master']) {
          try {
            const response = await axios.get(
              jsdelivrReadmeMdUrl(repositoryFullName, branch),
              { signal: controller.signal },
            );
            if (controller.signal.aborted) return;
            setContent(response.data);
            setRenderMode('markdown');
            setDefaultBranch(branch);
            return;
          } catch (err) {
            if (axios.isCancel(err) || controller.signal.aborted) return;
            // jsDelivr 404 — try next branch, then fall through to GitHub.
          }
        }

        // Fallback path: GitHub's `/readme` endpoint with the
        // `application/vnd.github.html` media type returns server-rendered
        // HTML for any README format the repo has — fixes #852 for `.rst`,
        // `.adoc`, `.mediawiki`, plus `.org` and other less-common formats.
        const response = await axios.get(
          githubReadmeHtmlUrl(repositoryFullName),
          {
            signal: controller.signal,
            headers: { Accept: 'application/vnd.github.html' },
            responseType: 'text',
            transformResponse: (data) => data,
          },
        );
        if (controller.signal.aborted) return;
        setContent(response.data);
        setRenderMode('html');
      } catch (err) {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        console.error('Failed to fetch README', err);
        setError('Could not load README');
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

  if (renderMode === 'html') {
    // GitHub's `application/vnd.github.html` payload is already sanitized by
    // the same renderer github.com itself uses. We trust it the same way the
    // markdown branch trusts `rehypeRaw` for embedded HTML in third-party
    // READMEs — the source is the same upstream, just rendered server-side.
    return (
      <Paper elevation={0} sx={markdownDocumentPaperSx(theme)}>
        <Box
          className="readme-html"
          dangerouslySetInnerHTML={{ __html: content || '' }}
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

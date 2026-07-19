import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LanguageIcon from '@mui/icons-material/Language';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TelegramIcon from '@mui/icons-material/Telegram';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { githubFetch } from '../../api';
import { STATUS_COLORS } from '../../theme';

interface RepositorySocialLinksProps {
  repositoryFullName: string;
}

interface GithubRepositoryMeta {
  homepage?: string | null;
  html_url?: string;
}

interface LinkCandidate {
  url: string;
  label?: string;
  source: 'homepage' | 'readme';
}

interface RepositoryLink {
  url: string;
  label: string;
  kind: LinkKind;
}

type LinkKind =
  | 'website'
  | 'twitter'
  | 'discord'
  | 'telegram'
  | 'linkedin'
  | 'youtube';

const SOCIAL_HOSTS: Array<{
  kind: LinkKind;
  label: string;
  hosts: readonly string[];
}> = [
  { kind: 'twitter', label: 'X / Twitter', hosts: ['x.com', 'twitter.com'] },
  {
    kind: 'discord',
    label: 'Discord',
    hosts: ['discord.gg', 'discord.com'],
  },
  { kind: 'telegram', label: 'Telegram', hosts: ['t.me', 'telegram.me'] },
  { kind: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com'] },
  {
    kind: 'youtube',
    label: 'YouTube',
    hosts: ['youtube.com', 'youtu.be'],
  },
];

const BLOCKED_HOSTS = [
  'img.shields.io',
  'shields.io',
  'cdn.jsdelivr.net',
  'raw.githubusercontent.com',
  'githubusercontent.com',
  'localhost',
  '127.0.0.1',
];

const BLOCKED_EXTENSIONS =
  /\.(?:png|jpe?g|gif|svg|webp|avif|ico|pdf)(?:$|[?#])/i;

const LINK_ORDER: Record<LinkKind, number> = {
  website: 0,
  twitter: 1,
  discord: 2,
  telegram: 3,
  linkedin: 4,
  youtube: 5,
};

// Manual pins for repos whose README doesn't surface a link the auto-parser
// can pick up. Only fills in a kind the live scan didn't already find.
const FALLBACK_LINKS: Record<string, RepositoryLink[]> = {
  'DPBG/Engram.AI': [
    {
      url: 'https://discord.com/channels/1504942454258798684/1523702741782888579',
      label: 'Discord',
      kind: 'discord',
    },
  ],
};

const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)[^)]*\)/g;
const htmlAnchorPattern =
  /<a\b[^>]*\bhref=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gis;
const bareUrlPattern = /https?:\/\/[^\s<>"')]+/g;

const jsdelivrReadmeUrl = (repositoryFullName: string, branch: string) =>
  `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${branch}/README.md`;

const githubReadmeRawUrl = (repositoryFullName: string) =>
  `https://api.github.com/repos/${repositoryFullName}/readme`;

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeUrl = (rawUrl: string): string | null => {
  const trimmed = rawUrl.trim().replace(/[),.;]+$/g, '');
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

const hostMatches = (host: string, candidates: readonly string[]): boolean =>
  candidates.some(
    (candidate) => host === candidate || host.endsWith(`.${candidate}`),
  );

const classifyLink = (
  url: string,
): { kind: LinkKind; label: string } | null => {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

  if (
    BLOCKED_HOSTS.some(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`),
    )
  ) {
    return null;
  }
  if (BLOCKED_EXTENSIONS.test(parsed.pathname)) return null;

  for (const social of SOCIAL_HOSTS) {
    if (hostMatches(host, social.hosts)) {
      return { kind: social.kind, label: social.label };
    }
  }

  if (hostMatches(host, ['github.com'])) return null;

  return { kind: 'website', label: 'Website' };
};

const compactIdentity = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

const isReadmeWebsiteCandidate = (
  candidate: LinkCandidate,
  url: string,
  repositoryFullName: string,
): boolean => {
  const label = candidate.label?.toLowerCase() ?? '';
  if (/\b(?:website|homepage|site|docs|documentation)\b/.test(label)) {
    return true;
  }

  const parsed = new URL(url);
  const host = compactIdentity(parsed.hostname.replace(/^www\./, ''));
  const [owner = '', name = ''] = repositoryFullName.split('/');
  return [owner, name]
    .map(compactIdentity)
    .filter((part) => part.length >= 4)
    .some((part) => host.includes(part));
};

const extractReadmeLinks = (readme: string): LinkCandidate[] => {
  const links: LinkCandidate[] = [];

  for (const match of readme.matchAll(markdownLinkPattern)) {
    links.push({ label: stripHtml(match[1]), url: match[2], source: 'readme' });
  }

  for (const match of readme.matchAll(htmlAnchorPattern)) {
    links.push({ label: stripHtml(match[2]), url: match[1], source: 'readme' });
  }

  for (const match of readme.matchAll(bareUrlPattern)) {
    links.push({ url: match[0], source: 'readme' });
  }

  return links;
};

const buildRepositoryLinks = (
  repositoryFullName: string,
  readme: string,
  meta?: GithubRepositoryMeta,
): RepositoryLink[] => {
  const candidates: LinkCandidate[] = [];
  if (meta?.homepage) {
    candidates.push({
      url: meta.homepage,
      label: 'Website',
      source: 'homepage',
    });
  }
  candidates.push(...extractReadmeLinks(readme));

  const seen = new Set<string>();
  const links: RepositoryLink[] = [];
  let hasWebsite = false;

  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate.url);
    if (!normalized || seen.has(normalized)) continue;
    const classified = classifyLink(normalized);
    if (!classified) continue;
    if (classified.kind === 'website') {
      if (hasWebsite) continue;
      if (
        candidate.source === 'readme' &&
        !isReadmeWebsiteCandidate(candidate, normalized, repositoryFullName)
      ) {
        continue;
      }
      hasWebsite = true;
    }

    seen.add(normalized);
    links.push({
      url: normalized,
      label: candidate.source === 'homepage' ? 'Website' : classified.label,
      kind: classified.kind,
    });
  }

  return links
    .sort((a, b) => LINK_ORDER[a.kind] - LINK_ORDER[b.kind])
    .slice(0, 8);
};

const fetchRepositoryReadme = async (
  repositoryFullName: string,
): Promise<string> => {
  for (const branch of ['main', 'master']) {
    try {
      const { data } = await axios.get<string>(
        jsdelivrReadmeUrl(repositoryFullName, branch),
      );
      return data;
    } catch {
      // Try the next branch, then GitHub's README endpoint.
    }
  }

  const { data } = await axios.get<string>(
    githubReadmeRawUrl(repositoryFullName),
    {
      headers: { Accept: 'application/vnd.github.raw' },
      responseType: 'text',
      transformResponse: (value) => value,
    },
  );
  return data;
};

const getIcon = (kind: LinkKind): React.ReactNode => {
  switch (kind) {
    case 'twitter':
      return <TwitterIcon fontSize="small" />;
    case 'discord':
      return <ChatBubbleOutlineIcon fontSize="small" />;
    case 'telegram':
      return <TelegramIcon fontSize="small" />;
    case 'linkedin':
      return <LinkedInIcon fontSize="small" />;
    case 'youtube':
      return <YouTubeIcon fontSize="small" />;
    case 'website':
    default:
      return <LanguageIcon fontSize="small" />;
  }
};

const useRepositoryLinks = (repositoryFullName: string) => {
  const metaQuery = useQuery({
    queryKey: ['repository-meta', repositoryFullName],
    queryFn: () =>
      githubFetch<GithubRepositoryMeta>(
        `https://api.github.com/repos/${repositoryFullName}`,
      ),
    enabled: !!repositoryFullName,
    retry: false,
  });

  const readmeQuery = useQuery({
    queryKey: ['repository-readme-links', repositoryFullName],
    queryFn: () => fetchRepositoryReadme(repositoryFullName),
    enabled: !!repositoryFullName,
    retry: false,
  });

  const links = useMemo(() => {
    const detected = buildRepositoryLinks(
      repositoryFullName,
      readmeQuery.data ?? '',
      metaQuery.data,
    );
    const fallback = (FALLBACK_LINKS[repositoryFullName] ?? []).filter(
      (link) => !detected.some((found) => found.kind === link.kind),
    );
    return [...detected, ...fallback].sort(
      (a, b) => LINK_ORDER[a.kind] - LINK_ORDER[b.kind],
    );
  }, [metaQuery.data, readmeQuery.data, repositoryFullName]);

  return {
    links,
    isLoading: metaQuery.isLoading || readmeQuery.isLoading,
  };
};

export const RepositorySocialLinksInline: React.FC<
  RepositorySocialLinksProps
> = ({ repositoryFullName }) => {
  const theme = useTheme();
  const { links, isLoading } = useRepositoryLinks(repositoryFullName);

  if (isLoading || links.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        flex: '0 0 auto',
        minWidth: 'max-content',
        overflow: 'visible',
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {links.slice(0, 4).map((link) => (
        <Tooltip key={link.url} title={link.label} placement="top" arrow>
          <Button
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            aria-label={link.label}
            sx={{
              minWidth: 0,
              width: 24,
              height: 24,
              p: 0,
              border: `1px solid ${theme.palette.border.light}`,
              borderRadius: 1,
              color: STATUS_COLORS.open,
              backgroundColor: alpha(theme.palette.text.primary, 0.02),
              flexShrink: 0,
              '& svg': { fontSize: 14 },
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: 'text.primary',
              },
            }}
          >
            {getIcon(link.kind)}
          </Button>
        </Tooltip>
      ))}
    </Box>
  );
};

const RepositorySocialLinks: React.FC<RepositorySocialLinksProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const { links, isLoading } = useRepositoryLinks(repositoryFullName);

  if (isLoading) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            mb: 2,
            fontSize: '14px',
          }}
        >
          Links
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
          <CircularProgress size={18} />
        </Box>
      </Box>
    );
  }

  if (links.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="subtitle2"
        sx={{ color: 'text.primary', fontWeight: 600, mb: 2, fontSize: '14px' }}
      >
        Links
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {links.map((link) => (
          <Button
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            startIcon={getIcon(link.kind)}
            endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            sx={{
              justifyContent: 'flex-start',
              minWidth: 0,
              maxWidth: '100%',
              border: `1px solid ${theme.palette.border.light}`,
              borderRadius: 1,
              color: 'text.primary',
              backgroundColor: alpha(theme.palette.text.primary, 0.02),
              fontSize: '12px',
              textTransform: 'none',
              '& .MuiButton-startIcon': {
                color: STATUS_COLORS.open,
                mr: 0.75,
              },
              '& .MuiButton-endIcon': {
                color: 'text.tertiary',
                ml: 0.75,
              },
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <Box
              component="span"
              sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {link.label}
            </Box>
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default RepositorySocialLinks;

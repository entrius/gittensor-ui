import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Link,
  Chip,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { formatDate } from '../../utils/format';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
import { STATUS_COLORS, scrollbarSx } from '../../theme';

import 'github-markdown-css/github-markdown-dark.css';

/** A comment or the body rendered in the conversation timeline. */
export type ConversationItem = {
  id: string;
  user: {
    login: string | null;
    avatarUrl: string;
    htmlUrl: string;
  };
  body: string;
  createdAt: string;
  authorAssociation: string;
  isDescription?: boolean;
};

/** Shape shared by GitHub's REST issue / PR / comment payloads. */
export type GithubIssueOrComment = {
  id: number;
  body: string | null;
  created_at: string;
  author_association?: string | null;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
};

export const EMPTY_BODY_PLACEHOLDER = '<em>No description provided.</em>';

export const githubProfileUrl = (login: string | null | undefined): string =>
  login ? `https://github.com/${login}` : 'https://github.com';

/** Map a raw GitHub issue/PR/comment payload to a ConversationItem. */
export const toConversationItem = (
  data: GithubIssueOrComment,
  opts: { idPrefix: string; isDescription?: boolean },
): ConversationItem => ({
  id: `${opts.idPrefix}-${data.id}`,
  user: {
    login: data.user?.login ?? null,
    avatarUrl: data.user?.avatar_url ?? getGithubAvatarSrc(data.user?.login),
    htmlUrl: data.user?.html_url ?? githubProfileUrl(data.user?.login),
  },
  body: data.body || EMPTY_BODY_PLACEHOLDER,
  createdAt: data.created_at,
  authorAssociation: data.author_association || 'NONE',
  isDescription: opts.isDescription,
});

interface ConversationTimelineProps {
  items: ConversationItem[];
}

const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  items,
}) => {
  const theme = useTheme();
  const colors = {
    canvas: {
      box: theme.palette.background.paper,
      subtle: theme.palette.surface.elevated,
    },
    border: {
      default: theme.palette.border.medium,
      muted: theme.palette.border.light,
    },
    fg: {
      default: theme.palette.text.primary,
      muted: STATUS_COLORS.open,
    },
    accent: {
      fg: STATUS_COLORS.info,
    },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        pt: 2,
        maxWidth: '960px',
        mx: 'auto',
        position: 'relative',
      }}
    >
      {items.map((item, index) => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            gap: { xs: 1.25, sm: 2 },
            position: 'relative',
            zIndex: 1,
            '&::before': {
              content: index !== items.length - 1 ? '""' : 'none',
              position: 'absolute',
              top: { xs: '32px', sm: '40px' },
              bottom: { xs: '-16px', sm: '-24px' },
              left: { xs: '15px', sm: '20px' },
              width: '2px',
              backgroundColor: colors.border.default,
              zIndex: 0,
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
            <Link
              href={item.user.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Avatar
                src={item.user.avatarUrl}
                alt={item.user.login ?? undefined}
                sx={{
                  width: { xs: 32, sm: 40 },
                  height: { xs: 32, sm: 40 },
                  border: `1px solid ${colors.border.muted}`,
                  backgroundColor: colors.canvas.box,
                }}
              />
            </Link>
          </Box>

          <Paper
            elevation={0}
            sx={{
              flex: 1,
              minWidth: 0,
              backgroundColor: colors.canvas.box,
              border: `1px solid ${colors.border.default}`,
              borderRadius: '6px',
              position: 'relative',
              '&::after': {
                content: { xs: 'none', sm: '""' },
                position: 'absolute',
                top: '11px',
                right: '100%',
                left: '-8px',
                width: '16px',
                height: '16px',
                backgroundColor: colors.canvas.subtle,
                borderBottom: `1px solid ${colors.border.default}`,
                borderLeft: `1px solid ${colors.border.default}`,
                transform: 'rotate(45deg)',
              },
            }}
          >
            <Box
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1, sm: 1.5 },
                backgroundColor: colors.canvas.subtle,
                borderBottom: `1px solid ${colors.border.default}`,
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                flexWrap: 'wrap',
                color: colors.fg.muted,
                fontSize: { xs: '13px', sm: '14px' },
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                  minWidth: 0,
                }}
              >
                <Link
                  href={item.user.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: colors.fg.default,
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                      color: colors.accent.fg,
                    },
                  }}
                >
                  {item.user.login}
                </Link>
                <Typography
                  component="span"
                  sx={{ fontSize: 'inherit', color: 'inherit' }}
                >
                  {item.isDescription ? 'opened this' : 'commented'}
                </Typography>
                <Typography
                  component="span"
                  sx={{ fontSize: 'inherit', color: 'inherit' }}
                >
                  {formatDate(item.createdAt)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {item.authorAssociation &&
                  item.authorAssociation !== 'NONE' && (
                    <Chip
                      variant="status"
                      label={item.authorAssociation
                        .toLowerCase()
                        .replace(/_/g, ' ')}
                      sx={{
                        color: colors.fg.muted,
                        borderColor: colors.border.default,
                        textTransform: 'capitalize',
                      }}
                    />
                  )}
                {item.isDescription && (
                  <Chip
                    variant="status"
                    label="Description"
                    sx={{
                      color: STATUS_COLORS.info,
                      borderColor: alpha(STATUS_COLORS.info, 0.4),
                    }}
                  />
                )}
              </Box>
            </Box>

            <Box
              sx={{
                p: { xs: 1.5, sm: 2, md: 3 },
                color: colors.fg.default,
                fontSize: { xs: '13px', sm: '14px' },
                lineHeight: 1.6,
                fontFamily:
                  '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
                overflowX: 'auto',
                ...scrollbarSx,
                '& > *:first-of-type': { mt: 0 },
                '& > *:last-child': { mb: 0 },
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  mt: 3,
                  mb: 2,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: colors.fg.default,
                  borderBottom: `1px solid ${colors.border.muted}`,
                  pb: 0.3,
                },
                '& h1': { fontSize: '2em' },
                '& h2': { fontSize: '1.5em' },
                '& h3': { fontSize: '1.25em' },
                '& p': { mb: 2, mt: 0 },
                '& a': { color: colors.accent.fg, textDecoration: 'none' },
                '& a:hover': { textDecoration: 'underline' },
                '& ul': { pl: '2em', mb: 2, listStyleType: 'disc' },
                '& ol': { pl: '2em', mb: 2, listStyleType: 'decimal' },
                '& li': { mb: 0.5 },
                '& li + li': { mt: '0.25em' },
                '& blockquote': {
                  padding: '0 1em',
                  color: colors.fg.muted,
                  borderLeft: `0.25em solid ${colors.border.default}`,
                  my: 2,
                  mx: 0,
                },
                '& input[type="checkbox"]': {
                  mr: 0.5,
                  verticalAlign: 'middle',
                },
                '& code': {
                  padding: '0.2em 0.4em',
                  margin: 0,
                  fontSize: '85%',
                  backgroundColor: alpha(STATUS_COLORS.neutral, 0.4),
                  borderRadius: '6px',
                },
                '& pre': {
                  mt: 2,
                  mb: 2,
                  p: 2,
                  borderRadius: '6px',
                  overflow: 'auto',
                  backgroundColor: theme.palette.surface.elevated,
                  border: `1px solid ${colors.border.default}`,
                  '& code': {
                    backgroundColor: 'transparent',
                    p: 0,
                    fontSize: '100%',
                  },
                },
                '& table': {
                  borderCollapse: 'collapse',
                  width: '100%',
                  mb: 2,
                  overflowX: 'auto',
                },
                '& th, & td': {
                  border: `1px solid ${colors.border.default}`,
                  padding: '6px 13px',
                },
                '& th': { fontWeight: 600 },
                '& tr:nth-of-type(2n)': {
                  backgroundColor: theme.palette.surface.elevated,
                },
                '& hr': {
                  height: '0.25em',
                  my: 3,
                  backgroundColor: colors.border.default,
                  border: 0,
                },
                '& img': {
                  maxWidth: '100%',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                },
              }}
            >
              <div className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {item.body}
                </ReactMarkdown>
              </div>
            </Box>
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

export default ConversationTimeline;

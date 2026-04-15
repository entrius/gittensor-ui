import React from 'react';
import { Box, Typography, Avatar, Paper, Link, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type IssueDetails } from '../../api/models/Issues';
import { STATUS_COLORS } from '../../theme';

import 'github-markdown-css/github-markdown-dark.css';

/** An issue comment or the issue body rendered in the conversation timeline. */
type ConversationItem = {
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

interface IssueConversationProps {
  issue: IssueDetails;
}

const IssueConversation: React.FC<IssueConversationProps> = ({ issue }) => {
  const theme = useTheme();
  const allItems: ConversationItem[] = [
    {
      id: 'issue-description',
      user: {
        login: issue.authorLogin,
        avatarUrl: `https://avatars.githubusercontent.com/${issue.authorLogin}`,
        htmlUrl: `https://github.com/${issue.authorLogin}`,
      },
      body: issue.body || '<em>No description provided.</em>',
      createdAt: issue.createdAt,
      authorAssociation: 'OWNER', // Assuming creator is owner for display purposes, or fetch actual association if available
      isDescription: true,
    },
  ];

  const colors = {
    canvas: {
      default: theme.palette.background.paper,
      subtle: theme.palette.surface.elevated,
      box: theme.palette.background.paper,
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
    timeline: {
      line: theme.palette.border.medium,
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
      {allItems.map((item, index) => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            gap: 2,
            position: 'relative',
            zIndex: 1,
            '&::before': {
              content: index !== allItems.length - 1 ? '""' : 'none',
              position: 'absolute',
              top: '40px',
              bottom: '-24px',
              left: '20px',
              width: '2px',
              backgroundColor: colors.timeline.line,
              zIndex: 0,
            },
          }}
        >
          {/* Avatar Area */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Link
              href={item.user.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Avatar
                src={item.user.avatarUrl}
                alt={item.user.login ?? undefined}
                sx={{
                  width: 40,
                  height: 40,
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: theme.palette.background.paper, // Avoid transparency issues over the line
                }}
              />
            </Link>
          </Box>

          {/* Comment Bubble */}
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
                content: '""',
                position: 'absolute',
                top: '11px',
                right: '100%',
                left: '-8px',
                width: '16px',
                height: '16px',
                backgroundColor: colors.canvas.subtle, // Match the header background
                borderBottom: `1px solid ${colors.border.default}`, // Only bottom and left create the visible arrow borders
                borderLeft: `1px solid ${colors.border.default}`,
                transform: 'rotate(45deg)',
              },
            }}
          >
            {/* Header */}
            <Box
              sx={{
                px: 2,
                py: 1.5, // Slightly more vertical padding
                backgroundColor: colors.canvas.subtle,
                borderBottom: `1px solid ${colors.border.default}`,
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: colors.fg.muted,
                fontSize: '14px',
                position: 'relative',
                zIndex: 1, // Ensure above the arrow pseudo-element's main body
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
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
                  commented
                </Typography>
                <Typography
                  component="span"
                  sx={{ fontSize: 'inherit', color: 'inherit' }}
                >
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Author Association Badge */}
                {item.authorAssociation &&
                  item.authorAssociation !== 'NONE' && (
                    <Chip
                      variant="status"
                      label={item.authorAssociation
                        .toLowerCase()
                        .replace('_', ' ')}
                      sx={{
                        color: colors.fg.muted,
                        borderColor: colors.border.default,
                        textTransform: 'capitalize',
                      }}
                    />
                  )}
                {/* Description Badge - Special styling */}
                {item.isDescription && (
                  <Chip
                    variant="status"
                    label="Description"
                    sx={{
                      color: STATUS_COLORS.info,
                      borderColor: 'rgba(56, 139, 253, 0.4)',
                    }}
                  />
                )}
              </Box>
            </Box>

            {/* Markdown Content */}
            <Box
              sx={{
                p: { xs: 2, md: 3 }, // More padding on larger screens
                color: colors.fg.default,
                fontSize: '14px',
                lineHeight: 1.6,
                fontFamily:
                  '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"', // GitHub's exact font stack
                overflowX: 'auto',
                // Typography refinements
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
                '& ul, & ol': {
                  pl: '2em',
                  mb: 2,
                  listStyleType: 'disc',
                },
                '& ol': { listStyleType: 'decimal' },
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
                  backgroundColor: 'rgba(110, 118, 129, 0.4)',
                  borderRadius: '6px',
                  fontFamily: '"JetBrains Mono", monospace',
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
                '& .markdown-body': {
                  backgroundColor: 'transparent',
                  color: colors.fg.default,
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  lineHeight: 1.6,
                },
              }}
            >
              <div className="markdown-body" style={{ fontSize: '14px' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
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

export default IssueConversation;

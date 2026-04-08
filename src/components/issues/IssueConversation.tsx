import React from 'react';
import { Box, Typography, Avatar, Paper, Link, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { type IssueDetails } from '../../api/models/Issues';
import { STATUS_COLORS } from '../../theme';
import { getMarkdownContentSx } from '../../utils';
import 'github-markdown-css/github-markdown-dark.css';

interface IssueConversationProps {
  issue: IssueDetails;
}

const IssueConversation: React.FC<IssueConversationProps> = ({ issue }) => {
  const theme = useTheme();
  const allItems = [
    {
      id: 'issue-description',
      user: {
        login: issue.authorLogin,
        avatarUrl: `https://avatars.githubusercontent.com/${issue.authorLogin}`,
        htmlUrl: `https://github.com/${issue.authorLogin}`,
      },
      body: issue.body || '<em>No description provided.</em>',
      createdAt: issue.createdAt,
      authorAssociation: 'OWNER',
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
        position: 'relative',
      }}
    >
      {allItems.map((item: any, index: number) => (
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
                alt={item.user.login}
                sx={{
                  width: 40,
                  height: 40,
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: theme.palette.background.paper,
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
                backgroundColor: colors.canvas.subtle,
                borderBottom: `1px solid ${colors.border.default}`,
                borderLeft: `1px solid ${colors.border.default}`,
                transform: 'rotate(45deg)',
              },
            }}
          >
            {/* Header */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
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
                zIndex: 1,
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
              className="markdown-body"
              sx={getMarkdownContentSx(theme, colors)}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {item.body}
              </ReactMarkdown>
            </Box>
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

export default IssueConversation;

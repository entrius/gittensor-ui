import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Link,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { usePullRequestComments } from '../../api';
import { type PullRequestDetails } from '../../api/models/Dashboard';
import { STATUS_COLORS } from '../../theme';
import { getMarkdownContentSx } from '../../utils';
import 'github-markdown-css/github-markdown-dark.css';

interface PRCommentsProps {
  repository: string;
  pullRequestNumber: number;
  prDetails: PullRequestDetails;
}

const PRComments: React.FC<PRCommentsProps> = ({
  repository,
  pullRequestNumber,
  prDetails,
}) => {
  const theme = useTheme();
  const {
    data: comments,
    isLoading,
    error,
  } = usePullRequestComments(repository, pullRequestNumber);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={30} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !comments) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">
          Failed to load comments. Please try again later.
        </Typography>
      </Box>
    );
  }

  const allItems = [
    {
      id: 'pr-description',
      user: {
        login: prDetails.authorLogin,
        avatarUrl: `https://avatars.githubusercontent.com/${prDetails.authorLogin}`,
        htmlUrl: `https://github.com/${prDetails.authorLogin}`,
      },
      body: prDetails.description || '<em>No description provided.</em>',
      createdAt: prDetails.createdAt,
      authorAssociation: 'OWNER',
      isDescription: true,
    },
    ...comments,
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
        maxWidth: '960px', // Widen slightly for better code block readability
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

export default PRComments;

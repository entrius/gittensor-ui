import React from "react";
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Link,
  CircularProgress,
  Chip,
} from "@mui/material";
import { usePullRequestComments } from "../../api";
import { PullRequestDetails } from "../../api/models/Dashboard";
import "github-markdown-css/github-markdown-dark.css"; // Import standard GitHub Dark styles

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
  const {
    data: comments,
    isLoading,
    error,
  } = usePullRequestComments(repository, pullRequestNumber);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress size={30} sx={{ color: "primary.main" }} />
      </Box>
    );
  }

  if (error || !comments) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error">
          Failed to load comments. Please try again later.
        </Typography>
      </Box>
    );
  }

  const allItems = [
    {
      id: "pr-description",
      user: {
        login: prDetails.authorLogin,
        avatarUrl: `https://avatars.githubusercontent.com/${prDetails.authorLogin}`,
        htmlUrl: `https://github.com/${prDetails.authorLogin}`,
      },
      body: prDetails.description || "*No description provided.*",
      createdAt: prDetails.createdAt,
      authorAssociation: "OWNER",
      isDescription: true,
    },
    ...comments,
  ];

  // Premium Dark Theme Colors
  const colors = {
    canvas: {
      default: "#0d1117",
      subtle: "#161b22",
      box: "#0d1117",
    },
    border: {
      default: "#30363d",
      muted: "#21262d",
    },
    fg: {
      default: "#c9d1d9",
      muted: "#8b949e",
    },
    accent: {
      fg: "#58a6ff",
    },
    timeline: {
      line: "#30363d",
    },
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        pt: 2,
        maxWidth: "960px", // Widen slightly for better code block readability
        mx: "auto",
        position: "relative",
      }}
    >
      {allItems.map((item: any, index: number) => (
        <Box
          key={item.id}
          sx={{
            display: "flex",
            gap: 2,
            position: "relative",
            zIndex: 1,
            "&::before": {
              content: index !== allItems.length - 1 ? '""' : "none",
              position: "absolute",
              top: "40px",
              bottom: "-24px",
              left: "20px",
              width: "2px",
              backgroundColor: colors.timeline.line,
              zIndex: 0,
            },
          }}
        >
          {/* Avatar Area */}
          <Box sx={{ position: "relative", zIndex: 1 }}>
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
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "#0d1117", // Avoid transparency issues over the line
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
              borderRadius: "6px",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                top: "11px",
                right: "100%",
                left: "-8px",
                width: "16px",
                height: "16px",
                backgroundColor: colors.canvas.subtle, // Match the header background
                borderBottom: `1px solid ${colors.border.default}`, // Only bottom and left create the visible arrow borders
                borderLeft: `1px solid ${colors.border.default}`,
                transform: "rotate(45deg)",
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
                borderTopLeftRadius: "6px",
                borderTopRightRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: colors.fg.muted,
                fontSize: "14px",
                position: "relative",
                zIndex: 1, // Ensure above the arrow pseudo-element's main body
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={item.user.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: colors.fg.default,
                    fontWeight: 600,
                    textDecoration: "none",
                    "&:hover": {
                      textDecoration: "underline",
                      color: colors.accent.fg,
                    },
                  }}
                >
                  {item.user.login}
                </Link>
                <Typography
                  component="span"
                  sx={{ fontSize: "inherit", color: "inherit" }}
                >
                  commented
                </Typography>
                <Typography
                  component="span"
                  sx={{ fontSize: "inherit", color: "inherit" }}
                >
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {/* Author Association Badge */}
                {item.authorAssociation &&
                  item.authorAssociation !== "NONE" && (
                    <Chip
                      label={item.authorAssociation
                        .toLowerCase()
                        .replace("_", " ")}
                      size="small"
                      sx={{
                        height: "20px",
                        fontSize: "11px",
                        fontWeight: 500,
                        backgroundColor: "transparent",
                        color: colors.fg.muted,
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: "10px",
                        textTransform: "capitalize",
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  )}
                {/* Description Badge - Special styling */}
                {item.isDescription && (
                  <Chip
                    label="Description"
                    size="small"
                    sx={{
                      height: "20px",
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: "rgba(56, 139, 253, 0.15)", // Premium Blue Tint
                      color: "#58a6ff",
                      border: "1px solid rgba(56, 139, 253, 0.4)",
                      borderRadius: "10px",
                      "& .MuiChip-label": { px: 1 },
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
                fontSize: "14px",
                lineHeight: 1.6,
                fontFamily:
                  '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"', // GitHub's exact font stack
                overflowX: "auto",
                // Typography refinements
                "& > *:first-of-type": { mt: 0 },
                "& > *:last-child": { mb: 0 },
                "& h1, & h2, & h3, & h4, & h5, & h6": {
                  mt: 3,
                  mb: 2,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: colors.fg.default,
                  borderBottom: `1px solid ${colors.border.muted}`,
                  pb: 0.3,
                },
                "& h1": { fontSize: "2em" },
                "& h2": { fontSize: "1.5em" },
                "& a": { color: colors.accent.fg, textDecoration: "none" },
                "& a:hover": { textDecoration: "underline" },
                "& blockquote": {
                  padding: "0 1em",
                  color: colors.fg.muted,
                  borderLeft: `0.25em solid ${colors.border.default}`,
                  my: 2,
                },
                // Updated Code Block Styling
                "& code": {
                  padding: "0.2em 0.4em",
                  margin: 0,
                  fontSize: "85%",
                  backgroundColor: "rgba(110, 118, 129, 0.4)",
                  borderRadius: "6px",
                  fontFamily: '"JetBrains Mono", monospace',
                },
                "& pre": {
                  mt: 2,
                  mb: 2,
                  borderRadius: "6px",
                  overflow: "hidden", // Let SyntaxHighlighter handle scroll
                },
                "& img": {
                  maxWidth: "100%",
                  borderRadius: "6px",
                  backgroundColor: "transparent",
                },
                "& .markdown-body": {
                  backgroundColor: "transparent",
                  color: colors.fg.default,
                  fontFamily: "inherit",
                  fontSize: "14px",
                  lineHeight: 1.6,
                },
                "& .markdown-body pre": {
                  backgroundColor: "#161b22", // Distinct code block background
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: "6px",
                },
                "& .markdown-body code": {
                  fontFamily: '"JetBrains Mono", monospace',
                },
              }}
            >
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: item.body }}
                style={{ fontSize: "14px" }}
              />
            </Box>
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

export default PRComments;

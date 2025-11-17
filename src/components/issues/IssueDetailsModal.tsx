import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Button,
  Link,
  Stack,
  Skeleton,
  Grid,
} from "@mui/material";
import {
  Close,
  OpenInNew,
  CheckCircle,
  Schedule,
  GitHub,
  AccountBalanceWallet,
  CalendarToday,
  Code,
} from "@mui/icons-material";
import { useIssue } from "../../api/IssuesApi";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface IssueDetailsModalProps {
  issueId: string | null;
  open: boolean;
  onClose: () => void;
}

export const IssueDetailsModal: React.FC<IssueDetailsModalProps> = ({
  issueId,
  open,
  onClose,
}) => {
  const { data: issue, isLoading } = useIssue(issueId || "");

  const formatCurrency = (value: number | undefined) => {
    if (!value || isNaN(value)) return "$0";
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTaostatsUrl = (address: string) => {
    return `https://taostats.io/account/${address}`;
  };

  const getStatusChip = (status: string) => {
    if (status === "SOLVED") {
      return (
        <Chip
          icon={<CheckCircle sx={{ fontSize: 16 }} />}
          label="Solved"
          size="small"
          sx={{
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            color: "success.main",
            fontWeight: 600,
            height: "28px",
          }}
        />
      );
    }
    if (status === "IN_PROGRESS") {
      return (
        <Chip
          icon={<Code sx={{ fontSize: 16 }} />}
          label="In Progress"
          size="small"
          sx={{
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            color: "info.main",
            fontWeight: 600,
            height: "28px",
          }}
        />
      );
    }
    return (
      <Chip
        icon={<Schedule sx={{ fontSize: 16 }} />}
        label="Open"
        size="small"
        sx={{
          backgroundColor: "rgba(255, 243, 13, 0.1)",
          color: "secondary.main",
          fontWeight: 600,
          height: "28px",
        }}
      />
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "rgba(10, 15, 31, 0.98)",
          backgroundImage: "none",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          p: 3,
          pb: 2,
        }}
      >
        <Box sx={{ flex: 1, pr: 2 }}>
          {isLoading ? (
            <Skeleton variant="text" width="80%" height={40} />
          ) : (
            <>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: '"CY Grotesk Grand", "Inter", sans-serif',
                  fontWeight: 700,
                  mb: 1,
                  lineHeight: 1.3,
                }}
              >
                {issue?.title}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {issue && getStatusChip(issue.status)}
                {issue?.language && (
                  <Chip
                    label={issue.language}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: "text.secondary",
                      height: "24px",
                    }}
                  />
                )}
              </Box>
            </>
          )}
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: "text.secondary",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 2 }}>
        {isLoading ? (
          <Box>
            <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={60} />
          </Box>
        ) : issue ? (
          <Stack spacing={3}>
            {/* Bounty Information - Most Prominent */}
            <Box
              sx={{
                p: 3,
                borderLeft: "4px solid",
                borderColor: "primary.main",
                borderRadius: 1,
                backgroundColor: "rgba(29, 55, 252, 0.05)",
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
                  >
                    Current Bounty
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      color: "primary.main",
                      fontWeight: 700,
                    }}
                  >
                    {formatCurrency(issue.bountyUsd)}
                  </Typography>
                </Grid>
                {issue.initialBountyAmount &&
                  issue.initialBountyAmount !== issue.bountyUsd && (
                    <Grid item xs={12} sm={6}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          display: "block",
                          mb: 0.5,
                        }}
                      >
                        Initial Deposit
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          color: "text.primary",
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(issue.initialBountyAmount)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "success.main" }}>
                        {formatCurrency(
                          issue.bountyUsd - issue.initialBountyAmount
                        )}{" "}
                        from contributions
                      </Typography>
                    </Grid>
                  )}
              </Grid>
            </Box>

            {/* Issue Description */}
            {issue.description && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1.5, fontWeight: 600 }}
                >
                  Description
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.primary",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {issue.description}
                </Typography>
              </Box>
            )}

            {/* Repository & Links */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <GitHub sx={{ color: "text.secondary", fontSize: 20 }} />
                <Link
                  href={`https://github.com/${issue.repositoryOwner}/${issue.repositoryName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: "primary.main",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  {issue.repositoryOwner}/{issue.repositoryName}
                </Link>
              </Box>
              <Button
                variant="outlined"
                endIcon={<OpenInNew />}
                href={issue.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  py: 1.5,
                  fontWeight: 600,
                  "&:hover": {
                    borderColor: "primary.main",
                    backgroundColor: "rgba(29, 55, 252, 0.05)",
                  },
                }}
              >
                View Issue on GitHub
              </Button>
            </Box>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.05)" }} />

            {/* Key Details Grid */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ color: "text.secondary", mb: 2, fontWeight: 600 }}
              >
                Details
              </Typography>
              <Stack spacing={2}>
                {/* Registered By */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <AccountBalanceWallet
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block" }}
                    >
                      Registered By
                    </Typography>
                    <Link
                      href={getTaostatsUrl(issue.depositorAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.85rem",
                        color: "primary.main",
                        textDecoration: "none",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      {formatAddress(issue.depositorAddress)}
                    </Link>
                  </Box>
                </Box>

                {/* Issue Created (GitHub) */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <CalendarToday
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block" }}
                    >
                      Issue Created
                    </Typography>
                    <Typography variant="body2">
                      {dayjs(issue.issueCreatedTimestamp).format("MMM D, YYYY")} •{" "}
                      {dayjs(issue.issueCreatedTimestamp).fromNow()}
                    </Typography>
                  </Box>
                </Box>

                {/* Registered on Gittensor */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <CalendarToday
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block" }}
                    >
                      Registered on Gittensor
                    </Typography>
                    <Typography variant="body2">
                      {dayjs(issue.registrationTimestamp).format("MMM D, YYYY")} •{" "}
                      {dayjs(issue.registrationTimestamp).fromNow()}
                    </Typography>
                  </Box>
                </Box>

                {/* Solution Required By */}
                {issue.solutionRequiredBy && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Schedule sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block" }}
                      >
                        Deadline
                      </Typography>
                      <Typography variant="body2">
                        {dayjs(issue.solutionRequiredBy).format("MMM D, YYYY")} •{" "}
                        {dayjs(issue.solutionRequiredBy).fromNow()}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Solved By (if solved) */}
                {issue.status === "SOLVED" && issue.solverAddress && (
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <CheckCircle sx={{ fontSize: 18, color: "success.main" }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{ color: "success.main", display: "block" }}
                        >
                          Solved By
                        </Typography>
                        <Link
                          href={getTaostatsUrl(issue.solverAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.85rem",
                            color: "success.main",
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {formatAddress(issue.solverAddress)}
                        </Link>
                        {issue.currentSolutionAmount && (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", display: "block" }}
                          >
                            Earned {formatCurrency(issue.currentSolutionAmount)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {issue.solutionPrUrl && issue.solutionPrNumber && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Code sx={{ fontSize: 18, color: "success.main" }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", display: "block" }}
                          >
                            Solution
                          </Typography>
                          <Link
                            href={issue.solutionPrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: "0.85rem",
                              color: "primary.main",
                              textDecoration: "none",
                              fontWeight: 600,
                              "&:hover": {
                                textDecoration: "underline",
                              },
                            }}
                          >
                            PR-{issue.solutionPrNumber}
                          </Link>
                        </Box>
                      </Box>
                    )}
                  </>
                )}
              </Stack>
            </Box>

            {/* Open Pull Requests */}
            {issue.openPullRequests && issue.openPullRequests.length > 0 && (
              <>
                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.05)" }} />
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "text.secondary", mb: 2, fontWeight: 600 }}
                  >
                    Open PRs Attempting to Solve This Issue ({issue.openPullRequests.length})
                  </Typography>
                  <Stack spacing={1.5}>
                    {issue.openPullRequests.map((pr) => (
                      <Box
                        key={pr.number}
                        sx={{
                          p: 2,
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: 2,
                          backgroundColor: "rgba(255, 255, 255, 0.01)",
                          transition: "all 0.2s",
                          "&:hover": {
                            borderColor: "rgba(255, 255, 255, 0.2)",
                            backgroundColor: "rgba(255, 255, 255, 0.02)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 2,
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Link
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                color: "primary.main",
                                textDecoration: "none",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                "&:hover": {
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              #{pr.number} {pr.title}
                            </Link>
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: "text.secondary",
                                mt: 0.5,
                              }}
                            >
                              by {pr.author} • opened{" "}
                              {dayjs(pr.createdAt).fromNow()}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            href={pr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              color: "text.secondary",
                              "&:hover": {
                                color: "primary.main",
                              },
                            }}
                          >
                            <OpenInNew sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </>
            )}

            {/* Labels */}
            {issue.labels && issue.labels.length > 0 && (
              <>
                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.05)" }} />
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "text.secondary", mb: 1.5 }}
                  >
                    Labels
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {issue.labels.map((label) => (
                      <Chip
                        key={label}
                        label={label}
                        size="small"
                        sx={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          color: "text.secondary",
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            )}
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

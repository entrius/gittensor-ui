import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Pagination,
} from "@mui/material";
import { Search, GitHub, CheckCircle, Schedule } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { Page } from "../components/layout";
import { IssueRegistrationModal, IssueDetailsModal } from "../components/issues";
import { useIssues, useIssueStats } from "../api/IssuesApi";
import { IssueListItem } from "../api/models/Issues";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export type CurrencyDisplay = "usd" | "alpha";
type StatusFilter = "OPEN" | "SOLVED" | "ALL";
type SortField = "bountyUsd" | "registrationTimestamp";

const IssuesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyDisplay>("usd");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("bountyUsd");
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  // Fetch all issues (we filter client-side for simplicity)
  const { data: openIssues, isLoading: loadingOpen } = useIssues("OPEN");
  const { data: solvedIssues, isLoading: loadingSolved } = useIssues("SOLVED");
  const { data: stats, isLoading: loadingStats } = useIssueStats();

  const isLoading = loadingOpen || loadingSolved || loadingStats;

  // Combine and filter issues
  const filteredIssues = useMemo(() => {
    let issues: IssueListItem[] = [];

    if (statusFilter === "ALL") {
      issues = [...(openIssues || []), ...(solvedIssues || [])];
    } else if (statusFilter === "OPEN") {
      issues = openIssues || [];
    } else {
      issues = solvedIssues || [];
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      issues = issues.filter(
        (issue) =>
          issue.title.toLowerCase().includes(query) ||
          issue.repositoryName.toLowerCase().includes(query) ||
          issue.repositoryOwner.toLowerCase().includes(query)
      );
    }

    // Sort
    issues = [...issues].sort((a, b) => {
      if (sortField === "bountyUsd") {
        return (b.bountyUsd ?? 0) - (a.bountyUsd ?? 0);
      }
      return (b.registrationTimestamp ?? 0) - (a.registrationTimestamp ?? 0);
    });

    return issues;
  }, [openIssues, solvedIssues, statusFilter, searchQuery, sortField]);

  // Pagination
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const paginatedIssues = filteredIssues.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Handle ?issue=ID query parameter for shareable links
  useEffect(() => {
    const issueId = searchParams.get("issue");
    if (issueId) {
      setSelectedIssueId(issueId);
      setDetailsModalOpen(true);
    }
  }, [searchParams]);

  const handleIssueClick = (issueId: string) => {
    setSelectedIssueId(issueId);
    setDetailsModalOpen(true);
    setSearchParams({ issue: issueId });
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedIssueId(null);
    setSearchParams({});
  };

  const formatBounty = (issue: IssueListItem) => {
    if (currencyDisplay === "alpha") {
      const val = issue.bountyAlpha || 0;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K ل`;
      return `${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} ل`;
    }
    const val = issue.bountyUsd || 0;
    return `$${val.toFixed(2)}`;
  };

  const formatStatValue = (usdValue: number | undefined, alphaValue: number | undefined) => {
    if (currencyDisplay === "alpha") {
      const val = alphaValue || 0;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K ل`;
      return `${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} ل`;
    }
    const val = usdValue || 0;
    return `$${val.toFixed(2)}`;
  };

  return (
    <Page title="Issues">
      <Box sx={{ width: "100%", height: "100%", py: { xs: 2, md: 3 }, px: { xs: 2, md: 4 } }}>
        {/* Compact Header */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 3,
          }}
        >
          {/* Stats Row */}
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Bounty Pool</Typography>
              <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: "primary.main" }}>
                {formatStatValue(stats?.totalBountyPoolUsd, stats?.totalBountyPoolAlpha)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Active</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {stats?.activeIssuesCount ?? 0}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Solved</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {stats?.solvedIssuesCount ?? 0}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Paid Out</Typography>
              <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "success.main" }}>
                {formatStatValue(stats?.totalPaidOutUsd, stats?.totalPaidOutAlpha)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Success</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {stats?.successRate ?? 0}%
              </Typography>
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
            <ToggleButtonGroup
              value={currencyDisplay}
              exclusive
              onChange={(_, v) => v && setCurrencyDisplay(v)}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  px: 1.5,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "text.secondary",
                  "&.Mui-selected": { backgroundColor: "primary.main", color: "white" },
                },
              }}
            >
              <ToggleButton value="usd">USD</ToggleButton>
              <ToggleButton value="alpha">ل</ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              onClick={() => setModalOpen(true)}
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600, px: 3 }}
            >
              Register Issue
            </Button>
          </Box>
        </Box>

        {/* Search & Filters */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            mb: 3,
            alignItems: { sm: "center" },
          }}
        >
          <TextField
            placeholder="Search issues by title, repository..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              maxWidth: { sm: 400 },
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
              },
            }}
          />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_, v) => {
                if (v) {
                  setStatusFilter(v);
                  setPage(1);
                }
              }}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  px: 2,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "text.secondary",
                  "&.Mui-selected": { backgroundColor: "rgba(255, 255, 255, 0.1)", color: "text.primary" },
                },
              }}
            >
              <ToggleButton value="OPEN">Open</ToggleButton>
              <ToggleButton value="SOLVED">Solved</ToggleButton>
              <ToggleButton value="ALL">All</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
              value={sortField}
              exclusive
              onChange={(_, v) => v && setSortField(v)}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  px: 2,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "text.secondary",
                  "&.Mui-selected": { backgroundColor: "rgba(255, 255, 255, 0.1)", color: "text.primary" },
                },
              }}
            >
              <ToggleButton value="bountyUsd">Bounty ↓</ToggleButton>
              <ToggleButton value="registrationTimestamp">Recent ↓</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Issue Cards */}
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : paginatedIssues.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography color="text.secondary">
              {searchQuery ? "No issues found matching your search" : "No issues yet"}
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              {paginatedIssues.map((issue) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={issue.id}>
                  <Card
                    onClick={() => handleIssueClick(issue.id)}
                    sx={{
                      cursor: "pointer",
                      height: "100%",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "primary.main",
                        backgroundColor: "rgba(29, 55, 252, 0.05)",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2 }}>
                      {/* Bounty */}
                      <Typography
                        variant="h5"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          color: "primary.main",
                          fontWeight: 700,
                          mb: 1,
                        }}
                      >
                        {formatBounty(issue)}
                      </Typography>

                      {/* Title */}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          mb: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: 1.4,
                          minHeight: "2.8em",
                        }}
                      >
                        {issue.title}
                      </Typography>

                      {/* Repository */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                        <GitHub sx={{ fontSize: 14, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {issue.repositoryOwner}/{issue.repositoryName}
                        </Typography>
                      </Box>

                      {/* Labels */}
                      {(issue.labels || []).length > 0 && (
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 1 }}>
                          {(issue.labels || []).slice(0, 2).map((label) => (
                            <Chip
                              key={label}
                              label={label}
                              size="small"
                              sx={{
                                height: "18px",
                                fontSize: "0.65rem",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                color: "text.secondary",
                              }}
                            />
                          ))}
                        </Box>
                      )}

                      {/* Status and Time */}
                      <Box sx={{ mt: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {issue.status === "SOLVED" ? (
                          <Chip
                            icon={<CheckCircle sx={{ fontSize: 14 }} />}
                            label="Solved"
                            size="small"
                            sx={{
                              height: "22px",
                              backgroundColor: "rgba(76, 175, 80, 0.1)",
                              color: "success.main",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        ) : (
                          <Chip
                            icon={<Schedule sx={{ fontSize: 14 }} />}
                            label="Open"
                            size="small"
                            sx={{
                              height: "22px",
                              backgroundColor: "rgba(255, 243, 13, 0.1)",
                              color: "secondary.main",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(issue.registrationTimestamp).fromNow()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      color: "text.secondary",
                      "&.Mui-selected": { backgroundColor: "primary.main", color: "white" },
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}

        {/* Registration Modal */}
        <IssueRegistrationModal open={modalOpen} onClose={() => setModalOpen(false)} />

        {/* Issue Details Modal */}
        <IssueDetailsModal
          issueId={selectedIssueId}
          open={detailsModalOpen}
          onClose={handleCloseDetails}
        />

        {/* Disclaimer */}
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.3)",
            mt: 4,
            fontSize: "0.65rem",
          }}
        >
          * Bounties stored in ALPHA (auto-converted from TAO). USD values are estimates.
        </Typography>
      </Box>
    </Page>
  );
};

export default IssuesPage;

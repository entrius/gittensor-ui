import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Stack,
  useMediaQuery,
  Tooltip,
  CircularProgress,
  Box,
  TextField,
  InputAdornment,
  Avatar,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import theme from "../../theme";
import { useRepoChanges } from "../../api";
import dayjs from "dayjs";

type SortField =
  | "repositoryFullName"
  | "commits"
  | "additions"
  | "deletions"
  | "linesChanged"
  | "weight";
type SortOrder = "asc" | "desc";

const baseGithubUrl = "https://github.com/";

const RepositoriesTable: React.FC = () => {
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isMedium = useMediaQuery(theme.breakpoints.down("md"));
  const isLarge = useMediaQuery(theme.breakpoints.down("lg"));
  const { data: repoChanges, isLoading } = useRepoChanges();

  const [sortField, setSortField] = useState<SortField>("weight");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically calculate rows per page based on available height
  useEffect(() => {
    const calculateRows = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const titleHeight = 40; // Title height
        const headerHeight = 56; // Table header height
        const paginationHeight = 52; // Pagination height
        const rowHeight = 53; // Each table row height
        const padding = 32; // Top and bottom padding

        const availableHeight = containerHeight - titleHeight - headerHeight - paginationHeight - padding;
        const calculatedRows = Math.floor(availableHeight / rowHeight);
        const finalRows = Math.max(5, Math.min(calculatedRows, 20)); // Between 5 and 20 rows

        setRowsPerPage(finalRows);
      }
    };

    calculateRows();
    window.addEventListener('resize', calculateRows);
    return () => window.removeEventListener('resize', calculateRows);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(
        field === "weight" ||
          field === "linesChanged" ||
          field === "commits" ||
          field === "additions" ||
          field === "deletions"
          ? "desc"
          : "asc",
      );
    }
    setPage(0);
  };

  // Reset page when search query changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };





  const filteredAndSortedRepos = useMemo(() => {
    if (!repoChanges) return [];

    // Filter by search query
    let filtered = repoChanges;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = repoChanges.filter((repo) =>
        repo.repositoryFullName.toLowerCase().includes(lowerQuery)
      );
    }

    // Create a copy before sorting to avoid mutation
    const sorted = [...filtered];

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Get the values based on sort field
      switch (sortField) {
        case "repositoryFullName":
          aValue = a.repositoryFullName;
          bValue = b.repositoryFullName;
          break;
        case "commits":
          aValue = a.commits;
          bValue = b.commits;
          break;
        case "additions":
          aValue = a.additions;
          bValue = b.additions;
          break;
        case "deletions":
          aValue = a.deletions;
          bValue = b.deletions;
          break;
        case "linesChanged":
          aValue = a.linesChanged;
          bValue = b.linesChanged;
          break;
        case "weight":
          aValue = a.weight;
          bValue = b.weight;
          break;
        default:
          aValue = a.weight;
          bValue = b.weight;
      }

      // Handle null/undefined values - push them to the end
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // For repository name, do string comparison
      if (sortField === "repositoryFullName") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // For all numeric fields (including weight which is a string), convert to number
      const aNum = typeof aValue === "string" ? parseFloat(aValue) : Number(aValue);
      const bNum = typeof bValue === "string" ? parseFloat(bValue) : Number(bValue);

      // Handle NaN values
      if (isNaN(aNum) && isNaN(bNum)) return 0;
      if (isNaN(aNum)) return 1;
      if (isNaN(bNum)) return -1;

      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    });

    return sorted;
  }, [repoChanges, sortField, sortOrder, searchQuery]);

  const paginatedRepos = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedRepos.slice(startIndex, endIndex);
  }, [filteredAndSortedRepos, page, rowsPerPage]);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      elevation={0}
    >
      <CardContent ref={containerRef} sx={{ p: isMobile ? 1.5 : 2, "&:last-child": { pb: isMobile ? 1.5 : 2 }, display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            mb: isMobile ? 1 : 1.5,
            flexShrink: 0,
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontSize: isMobile ? "0.9rem" : "1rem",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 500,
            }}
          >
            Contributed Repositories
          </Typography>
          <TextField
            placeholder="Search..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "1rem" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: isMobile ? "100%" : "200px",
              "& .MuiOutlinedInput-root": {
                color: "#ffffff",
                fontFamily: '"JetBrains Mono", monospace',
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                fontSize: "0.8rem",
                height: "36px",
                borderRadius: 2,
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
              },
            }}
          />
        </Stack>


        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              backgroundColor: "transparent",
              maxHeight: "600px",
              overflowY: "auto",
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                },
              },
            }}
          >
            <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      backgroundColor: "rgba(18, 18, 20, 0.95)",
                      backdropFilter: "blur(8px)",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      minWidth: isMobile ? 120 : 180,
                      maxWidth: isMobile ? 200 : 300,
                      width: isMobile ? 150 : 250,
                    }}
                  >
                    <TableSortLabel
                      active={sortField === "repositoryFullName"}
                      direction={
                        sortField === "repositoryFullName" ? sortOrder : "asc"
                      }
                      onClick={() => handleSort("repositoryFullName")}
                      sx={{
                        "&:hover": {
                          color: "secondary.main",
                        },
                        "&.Mui-active": {
                          color: "secondary.main",
                        },
                      }}
                    >
                      <Typography variant="dataLabel" sx={{ fontSize: isMedium ? '0.7rem' : '0.75rem' }}>Repository</Typography>
                    </TableSortLabel>
                  </TableCell>
                  {!isMobile && (
                    <TableCell
                      align="right"
                      sx={{
                        backgroundColor: "rgba(18, 18, 20, 0.95)",
                        backdropFilter: "blur(8px)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        width: "12%",
                      }}
                    >
                      <TableSortLabel
                        active={sortField === "commits"}
                        direction={sortField === "commits" ? sortOrder : "desc"}
                        onClick={() => handleSort("commits")}
                        sx={{
                          "&:hover": {
                            color: "secondary.main",
                          },
                          "&.Mui-active": {
                            color: "secondary.main",
                          },
                        }}
                      >
                        <Typography variant="dataLabel" sx={{ fontSize: isMedium ? '0.7rem' : '0.75rem' }}>Commits</Typography>
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {!isMobile && !isLarge && (
                    <TableCell
                      align="right"
                      sx={{
                        backgroundColor: "rgba(18, 18, 20, 0.95)",
                        backdropFilter: "blur(8px)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        width: "15%",
                      }}
                    >
                      <TableSortLabel
                        active={sortField === "additions"}
                        direction={
                          sortField === "additions" ? sortOrder : "desc"
                        }
                        onClick={() => handleSort("additions")}
                        sx={{
                          "&:hover": {
                            color: "secondary.main",
                          },
                          "&.Mui-active": {
                            color: "secondary.main",
                          },
                        }}
                      >
                        <Typography variant="dataLabel" sx={{ fontSize: isMedium ? '0.7rem' : '0.75rem' }}>Lines Added</Typography>
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {!isMobile && !isLarge && (
                    <TableCell
                      align="right"
                      sx={{
                        backgroundColor: "rgba(18, 18, 20, 0.95)",
                        backdropFilter: "blur(8px)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        width: "15%",
                      }}
                    >
                      <TableSortLabel
                        active={sortField === "deletions"}
                        direction={
                          sortField === "deletions" ? sortOrder : "desc"
                        }
                        onClick={() => handleSort("deletions")}
                        sx={{
                          "&:hover": {
                            color: "secondary.main",
                          },
                          "&.Mui-active": {
                            color: "secondary.main",
                          },
                        }}
                      >
                        <Typography variant="dataLabel" sx={{ fontSize: isMedium ? '0.7rem' : '0.75rem' }}>Lines Removed</Typography>
                      </TableSortLabel>
                    </TableCell>
                  )}
                  <TableCell
                    align="right"
                    sx={{
                      backgroundColor: "rgba(18, 18, 20, 0.95)",
                      backdropFilter: "blur(8px)",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      width: isMobile ? "25%" : "15%",
                    }}
                  >
                    <TableSortLabel
                      active={sortField === "linesChanged"}
                      direction={
                        sortField === "linesChanged" ? sortOrder : "desc"
                      }
                      onClick={() => handleSort("linesChanged")}
                      sx={{
                        "&:hover": {
                          color: "secondary.main",
                        },
                        "&.Mui-active": {
                          color: "secondary.main",
                        },
                      }}
                    >
                      <Typography variant="dataLabel" sx={{ fontSize: isMedium ? '0.7rem' : '0.75rem' }}>Lines Changed</Typography>
                    </TableSortLabel>
                  </TableCell>
                  {!isMobile && !isMedium && (
                    <TableCell
                      align="right"
                      sx={{
                        backgroundColor: "rgba(18, 18, 20, 0.95)",
                        backdropFilter: "blur(8px)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        width: "12%",
                      }}
                    >
                      <TableSortLabel
                        active={sortField === "weight"}
                        direction={sortField === "weight" ? sortOrder : "desc"}
                        onClick={() => handleSort("weight")}
                        sx={{
                          "&:hover": {
                            color: "secondary.main",
                          },
                          "&.Mui-active": {
                            color: "secondary.main",
                          },
                        }}
                      >
                        <Typography variant="dataLabel" sx={{ fontSize: isMedium ? '0.7rem' : '0.75rem' }}>Weight</Typography>
                      </TableSortLabel>
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRepos.map((repo) => {
                  const isInactive =
                    repo.inactiveAt !== null && repo.inactiveAt !== undefined;
                  const inactiveDate = isInactive
                    ? dayjs(repo.inactiveAt).format("DD/MM/YY hh:mm a")
                    : null;

                  return (
                    <Tooltip
                      key={repo.repositoryFullName}
                      title={
                        isInactive ? `Inactivated at: ${inactiveDate}` : ""
                      }
                      arrow
                      placement="top"
                    >
                      <TableRow
                        hover
                        sx={{
                          backgroundColor: isInactive
                            ? "rgba(211, 47, 47, 0.08)"
                            : "inherit",
                          "&:hover": {
                            backgroundColor: isInactive
                              ? "rgba(211, 47, 47, 0.12)"
                              : undefined,
                          },
                        }}
                      >
                        <TableCell
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: isMobile ? 200 : 300,
                            width: isMobile ? 150 : 250,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Avatar
                              src={`https://avatars.githubusercontent.com/${repo.repositoryFullName.split('/')[0]}`}
                              alt={repo.repositoryFullName.split('/')[0]}
                              sx={{
                                width: 20,
                                height: 20,
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                backgroundColor: repo.repositoryFullName.split('/')[0] === 'opentensor' ? '#ffffff' : repo.repositoryFullName.split('/')[0] === 'bitcoin' ? '#F7931A' : 'transparent',
                              }}
                            />
                            <Typography
                              component="a"
                              href={`${baseGithubUrl}${repo.repositoryFullName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="body2"
                              fontWeight="medium"
                              sx={{
                                color: isInactive
                                  ? "error.dark"
                                  : "text.primary",
                                textDecoration: "none",
                                "&:hover": {
                                  textDecoration: "underline",
                                  color: "primary.main"
                                },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "block",
                              }}
                            >
                              {repo.repositoryFullName}
                            </Typography>
                          </Box>
                        </TableCell>
                        {!isMobile && (
                          <TableCell align="right">
                            <Typography
                              variant="dataValue"
                              sx={{
                                color: isInactive
                                  ? "error.dark"
                                  : "text.primary",
                              }}
                            >
                              {repo.commits}
                            </Typography>
                          </TableCell>
                        )}
                        {!isMobile && !isLarge && (
                          <TableCell align="right">
                            <Typography
                              variant="dataValue"
                              color={isInactive ? "error.dark" : "success.main"}
                            >
                              +{repo.additions ?? "-"}
                            </Typography>
                          </TableCell>
                        )}
                        {!isMobile && !isLarge && (
                          <TableCell align="right">
                            <Typography
                              variant="dataValue"
                              color={isInactive ? "error.dark" : "error.main"}
                            >
                              -{repo.deletions ?? "-"}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell align="right">
                          <Typography
                            variant="dataValue"
                            fontWeight="medium"
                            sx={{
                              color: isInactive ? "error.dark" : "text.primary",
                            }}
                          >
                            {repo.linesChanged ?? "-"}
                          </Typography>
                        </TableCell>
                        {!isMobile && !isMedium && (
                          <TableCell align="right">
                            <Typography
                              variant="dataValue"
                              sx={{
                                color: isInactive
                                  ? "error.dark"
                                  : "text.primary",
                              }}
                            >
                              {repo.weight ?? "-"}
                            </Typography>
                          </TableCell>
                        )}
                      </TableRow>
                    </Tooltip>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          rowsPerPageOptions={[]}
          component="div"
          count={filteredAndSortedRepos.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          showFirstButton
          showLastButton
          sx={{
            flexShrink: 0,
            mt: 1,
            ".MuiTablePagination-displayedRows": {
              fontFamily: '"JetBrains Mono", monospace',
            },
            ".MuiTablePagination-toolbar": {
              minHeight: "48px",
            },
          }}
        />

        {filteredAndSortedRepos.length === 0 && !isLoading && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography>No repositories found!</Typography>
          </Box>
        )}
      </CardContent>
    </Card >
  );
};

export default RepositoriesTable;

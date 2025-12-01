import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  Stack,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useReposAndWeights } from "../../api";
import dayjs from "dayjs";

type SortField = "owner" | "name" | "weight";
type SortOrder = "asc" | "desc";

const baseGithubUrl = "https://github.com/";

const RepositoryWeightsTable: React.FC = () => {
  const { data, isLoading } = useReposAndWeights();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("weight");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "weight" ? "desc" : "asc");
    }
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const filteredAndSortedRepos = useMemo(() => {
    if (!data) return [];

    const reposWithParts = data.map((repo) => {
      const [owner, name] = repo.fullName.split("/");
      return { ...repo, owner, name };
    });

    let filtered = reposWithParts.filter((repo) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        repo.owner.toLowerCase().includes(searchLower) ||
        repo.name.toLowerCase().includes(searchLower)
      );
    });

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortField === "owner") {
        aValue = a.owner;
        bValue = b.owner;
      } else if (sortField === "name") {
        aValue = a.name;
        bValue = b.name;
      } else {
        aValue = a.weight;
        bValue = b.weight;
      }

      // For weight field, always parse as numbers
      if (sortField === "weight") {
        const aNum = parseFloat(aValue as string);
        const bNum = parseFloat(bValue as string);
        return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
      }

      // For string fields (owner, name), use localeCompare
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return filtered;
  }, [data, searchQuery, sortField, sortOrder]);

  const paginatedRepos = useMemo(() => {
    if (rowsPerPage === -1) return filteredAndSortedRepos;
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedRepos.slice(startIndex, endIndex);
  }, [filteredAndSortedRepos, page, rowsPerPage]);

  // Scroll to top when rows per page changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [rowsPerPage]);

  return (
    <Box ref={containerRef}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h5">Repositories & Weights</Typography>
          <Typography variant="body2" color="text.secondary">
            Contribute to any of these projects to gain score and earn emissions!
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControl size="small">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.8rem" }}>
                Rows:
              </Typography>
              <Select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(e.target.value as number);
                  setPage(0);
                }}
                sx={{
                  color: "#ffffff",
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                  fontSize: "0.8rem",
                  height: "36px",
                  borderRadius: 2,
                  minWidth: "80px",
                  "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                  "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                  "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  "& .MuiSelect-select": {
                    py: 0.75,
                  },
                }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={-1}>All</MenuItem>
              </Select>
            </Box>
          </FormControl>
          <TextField
            placeholder="Search..."
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "1rem" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: "200px",
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
        </Box>
      </Box>

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
            // Removed fixed height to allow natural expansion
            overflow: "visible",
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {!isMobile && (
                  <TableCell
                    sx={{
                      backgroundColor: "rgba(18, 18, 20, 0.95)",
                      backdropFilter: "blur(8px)",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      height: "56px",
                      py: 1.5,
                      boxSizing: "border-box",
                    }}
                  >
                    <TableSortLabel
                      active={sortField === "owner"}
                      direction={sortField === "owner" ? sortOrder : "asc"}
                      onClick={() => handleSort("owner")}
                      sx={{
                        "&:hover": {
                          color: "secondary.main",
                        },
                        "&.Mui-active": {
                          color: "secondary.main",
                        },
                      }}
                    >
                      <Typography variant="dataLabel">Owner</Typography>
                    </TableSortLabel>
                  </TableCell>
                )}
                <TableCell
                  sx={{
                    backgroundColor: "rgba(18, 18, 20, 0.95)",
                    backdropFilter: "blur(8px)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    height: "56px",
                    py: 1.5,
                    boxSizing: "border-box",
                  }}
                >
                  <TableSortLabel
                    active={sortField === "name"}
                    direction={sortField === "name" ? sortOrder : "asc"}
                    onClick={() => handleSort("name")}
                    sx={{
                      "&:hover": {
                        color: "secondary.main",
                      },
                      "&.Mui-active": {
                        color: "secondary.main",
                      },
                    }}
                  >
                    <Typography variant="dataLabel">Repository</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    backgroundColor: "rgba(18, 18, 20, 0.95)",
                    backdropFilter: "blur(8px)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    height: "56px",
                    py: 1.5,
                    boxSizing: "border-box",
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
                    <Typography variant="dataLabel">Weight</Typography>
                  </TableSortLabel>
                </TableCell>
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
                    key={repo.fullName}
                    title={isInactive ? `Inactivated at: ${inactiveDate}` : ""}
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
                      {!isMobile && (
                        <TableCell
                          sx={{
                            height: "60px",
                            py: 1,
                            boxSizing: "border-box",
                          }}
                        >
                          <Typography
                            variant="body1"
                            fontWeight="medium"
                            sx={{
                              color: isInactive ? "error.dark" : "text.primary",
                            }}
                          >
                            {repo.owner}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell
                        sx={{
                          height: "60px",
                          py: 1,
                          boxSizing: "border-box",
                        }}
                      >
                        <Stack>
                          <Typography
                            component={isMobile ? "a" : "span"}
                            variant="body1"
                            fontWeight="medium"
                            href={
                              isMobile
                                ? `${baseGithubUrl}${repo.fullName}`
                                : undefined
                            }
                            target={isMobile ? "_blank" : undefined}
                            rel={isMobile ? "noopener noreferrer" : undefined}
                            sx={{
                              textDecoration: "none",
                              "&:hover": {
                                textDecoration: isMobile ? "underline" : undefined,
                              },
                              color: isInactive ? "error.dark" : "text.primary",
                            }}
                          >
                            {isMobile ? repo.fullName : repo.name}
                          </Typography>
                          {!isMobile && (
                            <Typography
                              component="a"
                              href={`${baseGithubUrl}${repo.fullName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="body2"
                              sx={{
                                color: isInactive
                                  ? "rgba(211, 47, 47, 0.7)"
                                  : "text.secondary",
                                textDecoration: "none",
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {baseGithubUrl}
                              {repo.fullName}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          height: "60px",
                          py: 1,
                          boxSizing: "border-box",
                        }}
                      >
                        <Typography
                          variant="dataValue"
                          sx={{
                            color: isInactive ? "error.dark" : "text.primary",
                          }}
                        >
                          {repo.weight}
                        </Typography>
                      </TableCell>
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
        onRowsPerPageChange={handleChangeRowsPerPage}
        showFirstButton
        showLastButton
        sx={{
          ".MuiTablePagination-displayedRows": {
            fontFamily: '"JetBrains Mono", monospace',
          },
        }}
      />

      {filteredAndSortedRepos.length === 0 && !isLoading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography>No repositories found!</Typography>
        </Box>
      )}
    </Box>
  );
};

export default RepositoryWeightsTable;

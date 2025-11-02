import React, { useState, useMemo } from "react";
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
  TextField,
  Paper,
  Stack,
  useMediaQuery,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Box,
} from "@mui/material";
import { Search } from "@mui/icons-material";
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
  const { data: repoChanges, isLoading } = useRepoChanges();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("weight");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

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
    if (!repoChanges) return [];

    let filtered = repoChanges.filter((repo) => {
      const searchLower = searchQuery.toLowerCase();
      return repo.repositoryFullName.toLowerCase().includes(searchLower);
    });

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortField === "repositoryFullName") {
        aValue = a.repositoryFullName;
        bValue = b.repositoryFullName;
      } else if (sortField === "commits") {
        aValue = a.commits;
        bValue = b.commits;
      } else if (sortField === "additions") {
        aValue = a.additions;
        bValue = b.additions;
      } else if (sortField === "deletions") {
        aValue = a.deletions;
        bValue = b.deletions;
      } else if (sortField === "linesChanged") {
        aValue = a.linesChanged;
        bValue = b.linesChanged;
      } else {
        aValue = a.weight;
        bValue = b.weight;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === "asc"
        ? parseFloat(aValue as string) - parseFloat(bValue as string)
        : parseFloat(bValue as string) - parseFloat(aValue as string);
    });

    return filtered;
  }, [repoChanges, searchQuery, sortField, sortOrder]);

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
      }}
      elevation={0}
    >
      <CardContent sx={{ flex: 1, p: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 1, fontSize: "1rem" }}>
          Contributed Repositories
        </Typography>

        {!isMobile && (
          <TextField
            fullWidth
            placeholder="Search by repository name..."
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        )}

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ backgroundColor: "transparent" }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
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
                      <Typography variant="dataLabel">Repository</Typography>
                    </TableSortLabel>
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right">
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
                        <Typography variant="dataLabel">Commits</Typography>
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell align="right">
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
                        <Typography variant="dataLabel">Lines Added</Typography>
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell align="right">
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
                        <Typography variant="dataLabel">
                          Lines Removed
                        </Typography>
                      </TableSortLabel>
                    </TableCell>
                  )}
                  <TableCell align="right">
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
                      <Typography variant="dataLabel">Lines Changed</Typography>
                    </TableSortLabel>
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right">
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
                        <TableCell>
                          <Stack>
                            <Typography
                              variant="body1"
                              fontWeight="medium"
                              sx={{
                                color: isInactive
                                  ? "error.dark"
                                  : "text.primary",
                              }}
                            >
                              {repo.repositoryFullName}
                            </Typography>
                            {!isMobile && (
                              <Typography
                                component="a"
                                href={`${baseGithubUrl}${repo.repositoryFullName}`}
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
                                {`${baseGithubUrl}${repo.repositoryFullName}`}
                              </Typography>
                            )}
                          </Stack>
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
                        {!isMobile && (
                          <TableCell align="right">
                            <Typography
                              variant="dataValue"
                              color={isInactive ? "error.dark" : "success.main"}
                            >
                              +{repo.additions ?? "-"}
                            </Typography>
                          </TableCell>
                        )}
                        {!isMobile && (
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
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredAndSortedRepos.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            ".MuiTablePagination-displayedRows": {
              fontFamily: '"JetBrains Mono", monospace',
            },
            ".MuiTablePagination-selectLabel": {
              fontFamily: '"JetBrains Mono", monospace',
            },
          }}
        />

        {filteredAndSortedRepos.length === 0 && !isLoading && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography>No repositories found!</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RepositoriesTable;

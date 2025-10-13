import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
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
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useReposAndWeights } from "../../api";

type SortField = "owner" | "name" | "weight";
type SortOrder = "asc" | "desc";

const baseGithubUrl = "https://github.com/";

const RepositoryWeightsTable: React.FC = () => {
  const { data: repositories, isLoading } = useReposAndWeights();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("weight");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
    if (!repositories) return [];

    const reposWithParts = repositories.map((repo) => {
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
  }, [repositories, searchQuery, sortField, sortOrder]);

  const paginatedRepos = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedRepos.slice(startIndex, endIndex);
  }, [filteredAndSortedRepos, page, rowsPerPage]);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        maxWidth: 1200,
        mx: "auto",
        width: "100%",
      }}
      elevation={0}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Typography variant="h5">Repositories & Weights</Typography>
          <Typography variant="body2" color="secondary.main">
            Contribute to any of these projects to gain score and earn
            emissions!
          </Typography>
        </Box>

        <TextField
          fullWidth
          placeholder="Search by owner or repository name..."
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

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  {!isMobile && (
                    <TableCell>
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
                  <TableCell>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRepos.map((repo) => (
                  <TableRow key={repo.fullName} hover>
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {repo.owner}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Stack>
                        <Typography variant="body1" fontWeight="medium">
                          {isMobile ? repo.fullName : repo.name}
                        </Typography>
                        <Typography
                          component="a"
                          href={`${baseGithubUrl}${repo.fullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            textDecoration: "none",
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          {baseGithubUrl}
                          {repo.fullName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="dataValue">{repo.weight}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
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

export default RepositoryWeightsTable;

import React, { useState, useMemo } from "react";
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
  CircularProgress,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useLanguagesAndWeights } from "../../api";

type SortField = "extension" | "weight";
type SortOrder = "asc" | "desc";

const LanguageWeightsTable: React.FC = () => {
  const { data: languages, isLoading } = useLanguagesAndWeights();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("weight");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  const filteredAndSortedLanguages = useMemo(() => {
    if (!languages) return [];

    let filtered = languages.filter((lang) => {
      const searchLower = searchQuery.toLowerCase();
      return lang.extension.toLowerCase().includes(searchLower);
    });

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortField === "extension") {
        aValue = a.extension;
        bValue = b.extension;
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
  }, [languages, searchQuery, sortField, sortOrder]);

  const paginatedLanguages = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedLanguages.slice(startIndex, endIndex);
  }, [filteredAndSortedLanguages, page, rowsPerPage]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Typography variant="h5">Language Weights</Typography>
        <Typography variant="body2" color="text.secondary">
          Programming language multipliers used in scoring calculations
        </Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by language extension..."
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
                <TableCell>
                  <TableSortLabel
                    active={sortField === "extension"}
                    direction={sortField === "extension" ? sortOrder : "asc"}
                    onClick={() => handleSort("extension")}
                    sx={{
                      "&:hover": {
                        color: "secondary.main",
                      },
                      "&.Mui-active": {
                        color: "secondary.main",
                      },
                    }}
                  >
                    <Typography variant="dataLabel">Language</Typography>
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
              {paginatedLanguages.map((lang) => (
                <TableRow key={lang.extension} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {lang.extension}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="dataValue">{lang.weight}</Typography>
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
        count={filteredAndSortedLanguages.length}
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

      {filteredAndSortedLanguages.length === 0 && !isLoading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography>No languages found!</Typography>
        </Box>
      )}
    </Box>
  );
};

export default LanguageWeightsTable;

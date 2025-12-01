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
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
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
    if (rowsPerPage === -1) return filteredAndSortedLanguages;
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedLanguages.slice(startIndex, endIndex);
  }, [filteredAndSortedLanguages, page, rowsPerPage]);

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
          <Typography variant="h5">Language Weights</Typography>
          <Typography variant="body2" color="text.secondary">
            Programming language multipliers used in scoring calculations
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
                <TableCell
                  sx={{
                    backgroundColor: "rgba(18, 18, 20, 0.95)",
                    backdropFilter: "blur(8px)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
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
                    <Typography variant="dataLabel">Extension</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    backgroundColor: "rgba(18, 18, 20, 0.95)",
                    backdropFilter: "blur(8px)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
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
        rowsPerPageOptions={[]}
        component="div"
        count={filteredAndSortedLanguages.length}
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

      {filteredAndSortedLanguages.length === 0 && !isLoading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography>No languages found!</Typography>
        </Box>
      )}
    </Box>
  );
};

export default LanguageWeightsTable;

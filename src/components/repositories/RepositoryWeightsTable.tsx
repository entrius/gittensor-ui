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
  TextField,
  Typography,
  Paper,
  InputAdornment,
  Stack,
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "weight" ? "desc" : "asc");
    }
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h5">Repositories & Weights</Typography>
          <Typography variant="body2" color="text.secondary">
            Contribute to any of these projects to gain score and earn emissions!
          </Typography>
        </Box>

        <TextField
          fullWidth
          placeholder="Search by owner or repository name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "owner"}
                    direction={sortField === "owner" ? sortOrder : "asc"}
                    onClick={() => handleSort("owner")}
                  >
                    <Typography variant="dataLabel">Owner</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "name"}
                    direction={sortField === "name" ? sortOrder : "asc"}
                    onClick={() => handleSort("name")}
                  >
                    <Typography variant="dataLabel">Repository</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === "weight"}
                    direction={sortField === "weight" ? sortOrder : "desc"}
                    onClick={() => handleSort("weight")}
                  >
                    <Typography variant="dataLabel">Weight</Typography>
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedRepos.map((repo) => (
                <TableRow key={repo.fullName} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {repo.owner}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack>
                      <Typography variant="body1" fontWeight="medium">
                        {repo.name}
                      </Typography>
                      <Typography
                        component="a"
                        href={`${baseGithubUrl}${repo.fullName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{
                          color: "primary.main",
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {`${baseGithubUrl}${repo.fullName}`}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="dataValue">
                      {repo.weight}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredAndSortedRepos.length === 0 && !isLoading && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              No repositories found
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RepositoryWeightsTable;
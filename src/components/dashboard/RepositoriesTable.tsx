import React from "react";
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
  Paper,
  Stack,
  useMediaQuery,
} from "@mui/material";
import theme from "../../theme";

export interface Repository {
  id: string;
  name: string;
  url: string;
  totalCommits: number;
  linesAdded: number;
  linesRemoved: number;
}

interface RepositoriesTableProps {
  repositories: Repository[];
}

const RepositoriesTable: React.FC<RepositoriesTableProps> = ({
  repositories,
}) => {
  // only a subset of columns are shown when in mobile view
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Repository Contributions
        </Typography>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Repository</strong>
                </TableCell>
                {!isMobile && (
                  <TableCell align="right">
                    <strong>Commits</strong>
                  </TableCell>
                )}
                {!isMobile && (
                  <TableCell align="right">
                    <strong>Lines Added</strong>
                  </TableCell>
                )}
                {!isMobile && (
                  <TableCell align="right">
                    <strong>Lines Removed</strong>
                  </TableCell>
                )}
                <TableCell align="right">
                  <strong>Lines Changed</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {repositories.map((repo) => (
                <TableRow key={repo.id} hover>
                  <TableCell>
                    <Stack>
                      <Typography variant="body1" fontWeight="medium">
                        {repo.name}
                      </Typography>
                      {!isMobile && (
                        <Typography variant="body2" color="text.secondary">
                          {repo.url}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right">
                      <Typography variant="body1">
                        {repo.totalCommits}
                      </Typography>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell align="right">
                      <Typography variant="body1" color="success.main">
                        +{repo.linesAdded.toLocaleString()}
                      </Typography>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell align="right">
                      <Typography variant="body1" color="error.main">
                        -{repo.linesRemoved.toLocaleString()}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight="medium">
                      {(repo.linesAdded + repo.linesRemoved).toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default RepositoriesTable;

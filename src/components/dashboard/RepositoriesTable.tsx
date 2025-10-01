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
import { useRepoChanges } from "../../api";

const baseGithubUrl = "https://github.com/";

const RepositoriesTable: React.FC = ({}) => {
  // only a subset of columns are shown when in mobile view
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data: repoChanges, isLoading: isRepoLoading } = useRepoChanges();

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
              {repoChanges?.map((repo) => (
                <TableRow key={repo.repositoryFullName} hover>
                  <TableCell>
                    <Stack>
                      <Typography variant="body1" fontWeight="medium">
                        {repo.repositoryFullName}
                      </Typography>
                      {!isMobile && (
                        <Typography
                          component="a"
                          href={`${baseGithubUrl}/${repo.repositoryFullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="body2"
                          color="text.secondary"
                        >
                          {`${baseGithubUrl}/${repo.repositoryFullName}`}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right">
                      <Typography variant="body1">{repo?.commits}</Typography>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell align="right">
                      <Typography variant="body1" color="success.main">
                        +{repo?.additions ?? "-"}
                      </Typography>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell align="right">
                      <Typography variant="body1" color="error.main">
                        -{repo?.deletions ?? "-"}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight="medium">
                      {repo?.linesChanged ?? "-"}
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

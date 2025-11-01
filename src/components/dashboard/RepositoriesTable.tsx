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

  const { data: repoChanges } = useRepoChanges();

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
      <CardContent sx={{ flex: 1, p: 2, "&:last-child": { pb: 2 }, overflow: "auto" }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 1, fontSize: "1rem" }}>
          Top 5 Repositories
        </Typography>
        <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: "transparent" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 1 }}>
                  <Typography variant="dataLabel" fontSize={12}>Repository</Typography>
                </TableCell>
                {!isMobile && (
                  <TableCell align="right" sx={{ py: 1 }}>
                    <Typography variant="dataLabel" fontSize={12}>Commits</Typography>
                  </TableCell>
                )}
                {!isMobile && (
                  <TableCell align="right" sx={{ py: 1 }}>
                    <Typography variant="dataLabel" fontSize={12}>Added</Typography>
                  </TableCell>
                )}
                {!isMobile && (
                  <TableCell align="right" sx={{ py: 1 }}>
                    <Typography variant="dataLabel" fontSize={12}>Removed</Typography>
                  </TableCell>
                )}
                <TableCell align="right" sx={{ py: 1 }}>
                  <Typography variant="dataLabel" fontSize={12}>Changed</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {repoChanges?.map((repo) => (
                <TableRow key={repo.repositoryFullName} hover>
                  <TableCell sx={{ py: 1 }}>
                    <Stack>
                      <Typography variant="body2" fontWeight="medium" fontSize={13}>
                        {repo.repositoryFullName}
                      </Typography>
                      {!isMobile && (
                        <Typography
                          component="a"
                          href={`${baseGithubUrl}/${repo.repositoryFullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          color="text.primary"
                          sx={{
                            textDecoration: "none",
                            fontSize: 11,
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          {`${baseGithubUrl}/${repo.repositoryFullName}`}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right" sx={{ py: 1 }}>
                      <Typography variant="dataValue" fontSize={13}>
                        {repo?.commits}
                      </Typography>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell align="right" sx={{ py: 1 }}>
                      <Typography variant="dataValue" color="success.main" fontSize={13}>
                        +{repo?.additions ?? "-"}
                      </Typography>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell align="right" sx={{ py: 1 }}>
                      <Typography variant="dataValue" color="error.main" fontSize={13}>
                        -{repo?.deletions ?? "-"}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell align="right" sx={{ py: 1 }}>
                    <Typography variant="dataValue" fontWeight="medium" fontSize={13}>
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

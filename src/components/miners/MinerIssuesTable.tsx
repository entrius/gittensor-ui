import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { useMinerIssues } from '../../api';
import { bodyCellStyle, headerCellStyle, scrollbarSx } from '../../theme';
import FilterButton from '../FilterButton';
import { formatTokenAmount } from '../../utils/format';

interface MinerIssuesTableProps {
  githubId: string;
}

type IssueFilter = 'all' | 'open' | 'solved';

const getIssueUrl = (githubUrl: string) => githubUrl;

const MinerIssuesTable: React.FC<MinerIssuesTableProps> = ({ githubId }) => {
  const theme = useTheme();
  const { data: issues = [], isLoading: isLoadingIssues } =
    useMinerIssues(githubId);
  const [filter, setFilter] = useState<IssueFilter>('all');

  const minerIssues = useMemo(() => {
    return [...issues].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (filter === 'open')
      return minerIssues.filter((issue) => issue.status !== 'completed');
    if (filter === 'solved')
      return minerIssues.filter((issue) => issue.status === 'completed');
    return minerIssues;
  }, [minerIssues, filter]);

  const counts = useMemo(
    () => ({
      total: minerIssues.length,
      open: minerIssues.filter((issue) => issue.status !== 'completed').length,
      solved: minerIssues.filter((issue) => issue.status === 'completed')
        .length,
    }),
    [minerIssues],
  );

  if (isLoadingIssues) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <CircularProgress size={36} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${theme.palette.border.light}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Typography
          sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}
        >
          Issues Opened ({counts.total})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FilterButton
            label="All"
            isActive={filter === 'all'}
            onClick={() => setFilter('all')}
            count={counts.total}
            color={theme.palette.text.secondary}
            activeTextColor="text.primary"
          />
          <FilterButton
            label="Open"
            isActive={filter === 'open'}
            onClick={() => setFilter('open')}
            count={counts.open}
            color={theme.palette.info.main}
            activeTextColor="text.primary"
          />
          <FilterButton
            label="Solved"
            isActive={filter === 'solved'}
            onClick={() => setFilter('solved')}
            count={counts.solved}
            color={theme.palette.success.main}
            activeTextColor="text.primary"
          />
        </Box>
      </Box>

      {filteredIssues.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            sx={{
              color: alpha(theme.palette.common.white, 0.55),
              fontSize: '0.9rem',
            }}
          >
            No issue discoveries found for this miner.
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{ maxHeight: 560, overflow: 'auto', ...scrollbarSx }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellStyle}>Issue</TableCell>
                <TableCell sx={headerCellStyle}>Repository</TableCell>
                <TableCell sx={headerCellStyle}>Status</TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Created
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Solved Date
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Target
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Paid
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredIssues.map((issue) => {
                const isSolved = issue.status === 'completed';
                return (
                  <TableRow
                    key={issue.id}
                    onClick={() =>
                      window.open(getIssueUrl(issue.githubUrl), '_blank')
                    }
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'surface.light' },
                    }}
                  >
                    <TableCell sx={bodyCellStyle}>
                      <a
                        href={getIssueUrl(issue.githubUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{issue.issueNumber}
                      </a>{' '}
                      {issue.title ? `- ${issue.title}` : ''}
                    </TableCell>
                    <TableCell sx={bodyCellStyle}>
                      {issue.repositoryFullName}
                    </TableCell>
                    <TableCell sx={bodyCellStyle}>
                      <Chip
                        label={isSolved ? 'SOLVED' : 'OPEN'}
                        size="small"
                        sx={{
                          color: isSolved
                            ? theme.palette.success.main
                            : theme.palette.info.main,
                          border: '1px solid',
                          borderColor: isSolved
                            ? alpha(theme.palette.success.main, 0.45)
                            : alpha(theme.palette.info.main, 0.45),
                          backgroundColor: 'transparent',
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      {issue.completedAt
                        ? new Date(issue.completedAt).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      {formatTokenAmount(issue.targetBounty)} ل
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      {formatTokenAmount(issue.bountyAmount)} ل
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
};

export default MinerIssuesTable;

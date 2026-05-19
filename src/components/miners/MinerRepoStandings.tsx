import React, { useMemo, useState } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  GridView as GridViewIcon,
  TableRows as TableRowsIcon,
} from '@mui/icons-material';
import { useMinerStats } from '../../api';
import type { MinerRepositoryEvaluation } from '../../api/models/Dashboard';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import { credibilityColor } from '../../utils/format';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { DataTable, type DataTableColumn } from '../common';
import EmptyStateMessage from './EmptyStateMessage';
import MinerRepoStandingCard, { repoMinersHref } from './MinerRepoStandingCard';

type ViewMode = 'prs' | 'issues';
type StandingsView = 'cards' | 'table';

interface MinerRepoStandingsProps {
  githubId: string;
  viewMode?: ViewMode;
}

/* ── Table-view cell helpers (folded in from MinerRepoEligibilityTable) ── */

const EligibilityChip: React.FC<{
  eligible: boolean;
  reason?: string | null;
}> = ({ eligible, reason }) => {
  const color = eligible ? STATUS_COLORS.success : STATUS_COLORS.neutral;
  const chip = (
    <Chip
      label={eligible ? 'Eligible' : 'Ineligible'}
      size="small"
      sx={{
        height: 20,
        fontSize: '0.68rem',
        fontWeight: 600,
        color,
        bgcolor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.35)}`,
      }}
    />
  );
  if (!eligible && reason) {
    return (
      <Tooltip
        title={reason}
        arrow
        placement="top"
        slotProps={tooltipSlotProps}
      >
        <Box component="span" sx={{ display: 'inline-flex' }}>
          {chip}
        </Box>
      </Tooltip>
    );
  }
  return chip;
};

const CredibilityValue: React.FC<{ value: number }> = ({ value }) => (
  <Typography
    component="span"
    sx={{
      fontSize: '0.85rem',
      fontWeight: 600,
      color: credibilityColor(value),
    }}
  >
    {`${(value * 100).toFixed(1)}%`}
  </Typography>
);

const RepositoryCell: React.FC<{ repository: string }> = ({ repository }) => {
  const owner = repository.split('/')[0];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Avatar
        src={getRepositoryOwnerAvatarSrc(owner)}
        alt={owner}
        sx={{
          width: 24,
          height: 24,
          border: '1px solid',
          borderColor: 'border.medium',
        }}
      />
      <Typography
        component="span"
        title={repository}
        sx={{
          fontSize: '0.85rem',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {repository}
      </Typography>
    </Box>
  );
};

/**
 * Per-repository standings — the miner details page centerpiece.
 *
 * Sourced from the authoritative per-repo `miner_evaluations` rows
 * (`MinerEvaluation.repositories`). Rows are sorted by per-repo score
 * descending; ineligible repos are muted. Two views: a card grid (default)
 * and a dense table.
 */
const MinerRepoStandings: React.FC<MinerRepoStandingsProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const { data: minerStats, isLoading } = useMinerStats(githubId);
  const [view, setView] = useState<StandingsView>('cards');
  const isIssueMode = viewMode === 'issues';

  const rows = useMemo(() => {
    // Pre-migration placeholder rows carry an empty repo name — drop them.
    const repos = (minerStats?.repositories ?? []).filter(
      (r) => r.repositoryFullName.trim().length > 0,
    );
    return repos
      .slice()
      .sort((a, b) =>
        isIssueMode
          ? b.issueDiscoveryScore - a.issueDiscoveryScore
          : b.totalScore - a.totalScore,
      );
  }, [minerStats, isIssueMode]);

  const eligibleCount = rows.filter((r) =>
    isIssueMode ? r.isIssueEligible : r.isEligible,
  ).length;

  const prColumns: DataTableColumn<MinerRepositoryEvaluation>[] = [
    {
      key: 'repository',
      header: 'Repository',
      width: '40%',
      renderCell: (r) => <RepositoryCell repository={r.repositoryFullName} />,
    },
    {
      key: 'eligible',
      header: 'PR eligibility',
      width: '18%',
      renderCell: (r) => (
        <EligibilityChip eligible={r.isEligible} reason={r.failedReason} />
      ),
    },
    {
      key: 'credibility',
      header: 'Credibility',
      width: '14%',
      align: 'right',
      renderCell: (r) => <CredibilityValue value={r.credibility} />,
    },
    {
      key: 'merged',
      header: 'Merged PRs',
      width: '14%',
      align: 'right',
      renderCell: (r) => r.totalMergedPrs,
    },
    {
      key: 'score',
      header: 'Repo score',
      width: '14%',
      align: 'right',
      renderCell: (r) => r.totalScore.toFixed(2),
    },
  ];

  const issueColumns: DataTableColumn<MinerRepositoryEvaluation>[] = [
    {
      key: 'repository',
      header: 'Repository',
      width: '34%',
      renderCell: (r) => <RepositoryCell repository={r.repositoryFullName} />,
    },
    {
      key: 'issueEligible',
      header: 'Issue eligibility',
      width: '18%',
      renderCell: (r) => (
        <EligibilityChip eligible={r.isIssueEligible} reason={r.failedReason} />
      ),
    },
    {
      key: 'issueCredibility',
      header: 'Issue credibility',
      width: '16%',
      align: 'right',
      renderCell: (r) => <CredibilityValue value={r.issueCredibility} />,
    },
    {
      key: 'solved',
      header: 'Solved',
      width: '10%',
      align: 'right',
      renderCell: (r) => r.totalSolvedIssues,
    },
    {
      key: 'valid',
      header: 'Valid',
      width: '10%',
      align: 'right',
      renderCell: (r) => r.totalValidSolvedIssues,
    },
    {
      key: 'discoveryScore',
      header: 'Discovery score',
      width: '12%',
      align: 'right',
      renderCell: (r) => r.issueDiscoveryScore.toFixed(2),
    },
  ];

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    next: StandingsView | null,
  ) => {
    if (next) setView(next);
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        p: 0,
        overflow: 'hidden',
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid',
          borderColor: 'border.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
            <Typography variant="sectionTitle">
              Per-repository standings
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontSize: '0.75rem',
              }}
            >
              ({rows.length})
            </Typography>
          </Box>
          {rows.length > 0 && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {isIssueMode ? 'Issue-discovery eligible' : 'PR eligible'} in{' '}
              <Box
                component="span"
                sx={{
                  color:
                    eligibleCount > 0
                      ? STATUS_COLORS.success
                      : STATUS_COLORS.neutral,
                  fontWeight: 600,
                }}
              >
                {eligibleCount}/{rows.length}
              </Box>{' '}
              {rows.length === 1 ? 'repository' : 'repositories'} · sorted by
              score
            </Typography>
          )}
        </Box>

        {rows.length > 0 && (
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={handleViewChange}
            size="small"
            aria-label="Standings view"
            sx={{
              '& .MuiToggleButton-root': {
                color: 'text.secondary',
                borderColor: 'border.light',
                px: 1.25,
                py: 0.5,
                '&.Mui-selected': {
                  color: 'primary.main',
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
                  '&:hover': {
                    backgroundColor: (t) => alpha(t.palette.primary.main, 0.18),
                  },
                },
              },
            }}
          >
            <ToggleButton value="cards" aria-label="Card grid">
              <GridViewIcon sx={{ fontSize: '1.05rem' }} />
            </ToggleButton>
            <ToggleButton value="table" aria-label="Table">
              <TableRowsIcon sx={{ fontSize: '1.05rem' }} />
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: 'primary.main' }} />
        </Box>
      ) : rows.length === 0 ? (
        <EmptyStateMessage message="No per-repository evaluations for this miner yet." />
      ) : view === 'cards' ? (
        <Box
          sx={{
            p: 3,
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
          }}
        >
          {rows.map((repo) => (
            <MinerRepoStandingCard
              key={repo.repositoryFullName}
              repo={repo}
              viewMode={viewMode}
            />
          ))}
        </Box>
      ) : (
        <DataTable<MinerRepositoryEvaluation>
          columns={isIssueMode ? issueColumns : prColumns}
          rows={rows}
          getRowKey={(r) => r.repositoryFullName}
          getRowHref={(r) => repoMinersHref(r.repositoryFullName)}
          minWidth="640px"
        />
      )}
    </Card>
  );
};

export default MinerRepoStandings;

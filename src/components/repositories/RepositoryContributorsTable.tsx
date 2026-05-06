import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  alpha,
  useTheme,
  Tooltip,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAllPrs, useAllMiners } from '../../api';
import { LinkBox } from '../common/linkBehavior';
import { STATUS_COLORS } from '../../theme';
import { isMergedPr } from '../../utils/prStatus';
import { parseNumber } from '../../utils/ExplorerUtils';
import { DataTable, type DataTableColumn } from '../common/DataTable';

interface RepositoryContributorsTableProps {
  repositoryFullName: string;
}

type ContributorsProgramTab = 'oss' | 'issues';

interface ContributorRow {
  rank: number;
  author: string;
  githubId: string;
  prs: number;
  score: number;
  minerRank?: number;
  issueMinerRank?: number;
  isEligible?: boolean;
  isIssueEligible?: boolean;
  /** From GET /miners (miner-wide issue discovery stats). */
  discoverySolved: number;
  discoveryOpen: number;
  discoveryClosed: number;
  issueDiscoveryScore: number;
}

const numericCellSx = { fontVariantNumeric: 'tabular-nums' as const };
const clippedCellSx = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
};

const RepositoryContributorsTable: React.FC<
  RepositoryContributorsTableProps
> = ({ repositoryFullName }) => {
  const theme = useTheme();
  const { data: allPRs, isLoading: isPrsLoading } = useAllPrs();
  const { data: allMinersStats, isLoading: isMinersLoading } = useAllMiners();

  const [visibleCount, setVisibleCount] = useState(7);
  const [programTab, setProgramTab] = useState<ContributorsProgramTab>('oss');

  useEffect(() => {
    setVisibleCount(7);
  }, [programTab]);

  const minerDataMap = useMemo(() => {
    const map = new Map<string, { rank: number; isEligible?: boolean }>();
    if (Array.isArray(allMinersStats)) {
      const sorted = [...allMinersStats].sort(
        (a, b) => Number(b.totalScore) - Number(a.totalScore),
      );
      sorted.forEach((miner, index) => {
        map.set(miner.githubId, {
          rank: index + 1,
          isEligible: miner.isEligible,
        });
      });
    }
    return map;
  }, [allMinersStats]);

  const issueLeaderboardRankById = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(allMinersStats)) {
      const sorted = [...allMinersStats].sort(
        (a, b) =>
          parseNumber(b.issueDiscoveryScore) -
          parseNumber(a.issueDiscoveryScore),
      );
      sorted.forEach((m, index) => {
        if (m.githubId) map.set(m.githubId, index + 1);
      });
    }
    return map;
  }, [allMinersStats]);

  const minerDiscoveryById = useMemo(() => {
    const map = new Map<
      string,
      {
        discoverySolved: number;
        discoveryOpen: number;
        discoveryClosed: number;
        issueDiscoveryScore: number;
        isIssueEligible?: boolean;
      }
    >();
    if (Array.isArray(allMinersStats)) {
      for (const m of allMinersStats) {
        if (!m.githubId) continue;
        map.set(m.githubId, {
          discoverySolved: parseNumber(m.totalSolvedIssues),
          discoveryOpen: parseNumber(m.totalOpenIssues),
          discoveryClosed: parseNumber(m.totalClosedIssues),
          issueDiscoveryScore: parseNumber(m.issueDiscoveryScore),
          isIssueEligible: m.isIssueEligible,
        });
      }
    }
    return map;
  }, [allMinersStats]);

  const contributors = useMemo<ContributorRow[]>(() => {
    if (!allPRs) return [];

    const allRepoPRs = allPRs.filter(
      (pr) =>
        pr.repository.toLowerCase() === repositoryFullName.toLowerCase() &&
        pr.githubId &&
        isMergedPr(pr),
    );

    const contributorsMap = new Map<
      string,
      { author: string; githubId: string; prs: number; score: number }
    >();

    allRepoPRs.forEach((pr) => {
      if (!pr.githubId) return;
      const existing = contributorsMap.get(pr.githubId) || {
        author: pr.author,
        githubId: pr.githubId,
        prs: 0,
        score: 0,
      };
      existing.prs += 1;
      existing.score += parseFloat(pr.score || '0');
      contributorsMap.set(pr.githubId, existing);
    });

    return Array.from(contributorsMap.values())
      .sort((a, b) => b.score - a.score)
      .map((c, index) => {
        const minerData = minerDataMap.get(c.githubId);
        const disc = minerDiscoveryById.get(c.githubId);
        return {
          ...c,
          rank: index + 1,
          minerRank: minerData?.rank,
          issueMinerRank: issueLeaderboardRankById.get(c.githubId),
          isEligible: minerData?.isEligible,
          isIssueEligible: disc?.isIssueEligible,
          discoverySolved: disc?.discoverySolved ?? 0,
          discoveryOpen: disc?.discoveryOpen ?? 0,
          discoveryClosed: disc?.discoveryClosed ?? 0,
          issueDiscoveryScore: disc?.issueDiscoveryScore ?? 0,
        };
      });
  }, [
    allPRs,
    repositoryFullName,
    minerDataMap,
    minerDiscoveryById,
    issueLeaderboardRankById,
  ]);

  const discoveryOrderedContributors = useMemo(() => {
    const totalIssues = (r: ContributorRow) =>
      r.discoverySolved + r.discoveryOpen + r.discoveryClosed;
    return [...contributors]
      .sort((a, b) => {
        const ds = b.issueDiscoveryScore - a.issueDiscoveryScore;
        if (ds !== 0) return ds;
        return totalIssues(b) - totalIssues(a);
      })
      .map((c, index) => ({ ...c, rank: index + 1 }));
  }, [contributors]);

  const activeContributors =
    programTab === 'oss' ? contributors : discoveryOrderedContributors;

  const displayedContributors = activeContributors.slice(0, visibleCount);
  const totalContributors = activeContributors.length;
  const hasMore = visibleCount < totalContributors;

  const handleShowMore = () => setVisibleCount(totalContributors);
  const handleShowLess = () => setVisibleCount(7);

  const rankColumn = useMemo<DataTableColumn<ContributorRow>>(
    () => ({
      key: 'rank',
      header: '#',
      width: '32px',
      cellSx: (c) => ({
        ...clippedCellSx,
        color: c.rank <= 3 ? 'text.primary' : STATUS_COLORS.open,
        fontWeight: c.rank <= 3 ? 600 : 400,
      }),
      renderCell: (c) => c.rank,
    }),
    [],
  );

  const minerColumn = useMemo<DataTableColumn<ContributorRow>>(
    () => ({
      key: 'miner',
      header: 'Miner',
      cellSx: clippedCellSx,
      renderCell: (c) => (
        <LinkBox
          href={`/miners/details?githubId=${encodeURIComponent(c.githubId)}&mode=${programTab === 'issues' ? 'issues' : 'prs'}`}
          linkState={{
            backLabel: `Back to ${repositoryFullName}`,
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            overflow: 'hidden',
            cursor: 'pointer',
            '&:hover .contributor-name': {
              color: STATUS_COLORS.info,
              textDecoration: 'underline',
            },
          }}
        >
          <Avatar
            src={`https://avatars.githubusercontent.com/${c.author}`}
            sx={{
              width: 20,
              height: 20,
              border: `1px solid ${theme.palette.border.light}`,
              flexShrink: 0,
            }}
          />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <Typography
              className="contributor-name"
              sx={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'text.primary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'color 0.1s',
              }}
            >
              {c.author}
            </Typography>
            {programTab === 'oss' && c.minerRank != null && (
              <Typography
                sx={{
                  fontSize: '10px',
                  color: STATUS_COLORS.open,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                OSS Rank #{c.minerRank}
              </Typography>
            )}
            {programTab === 'issues' && c.issueMinerRank != null && (
              <Typography
                sx={{
                  fontSize: '10px',
                  color: STATUS_COLORS.open,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Discovery rank #{c.issueMinerRank}
              </Typography>
            )}
          </Box>
        </LinkBox>
      ),
    }),
    [programTab, repositoryFullName, theme.palette.border.light],
  );

  const columns = useMemo<DataTableColumn<ContributorRow>[]>(() => {
    if (programTab === 'oss') {
      return [
        rankColumn,
        minerColumn,
        {
          key: 'prs',
          header: 'PRs',
          width: '3rem',
          align: 'right',
          headerSx: { ...numericCellSx, ...clippedCellSx },
          cellSx: { ...numericCellSx, ...clippedCellSx },
          renderCell: (c) => c.prs,
        },
        {
          key: 'score',
          header: 'Score',
          width: '4.5rem',
          align: 'right',
          headerSx: { ...numericCellSx, ...clippedCellSx },
          cellSx: { ...numericCellSx, ...clippedCellSx },
          renderCell: (c) => c.score.toFixed(2),
        },
      ];
    }
    return [
      rankColumn,
      minerColumn,
      {
        key: 'discoverySolved',
        header: (
          <Tooltip title="Solved issues (Issue Discovery — from Gittensor /miners; miner-wide, not limited to this repo)">
            <span>Issues</span>
          </Tooltip>
        ),
        width: '3.25rem',
        align: 'right',
        headerSx: { ...numericCellSx, ...clippedCellSx },
        cellSx: { ...numericCellSx, ...clippedCellSx },
        renderCell: (c) => c.discoverySolved,
      },
      {
        key: 'issueDiscoveryScore',
        header: 'Score',
        width: '4rem',
        align: 'right',
        headerSx: { ...numericCellSx, ...clippedCellSx },
        cellSx: { ...numericCellSx, ...clippedCellSx },
        renderCell: (c) => c.issueDiscoveryScore.toFixed(2),
      },
    ];
  }, [programTab, rankColumn, minerColumn]);

  const isLoading = isPrsLoading || isMinersLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (contributors.length === 0) {
    return null;
  }

  const header = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 0 }}>
      <Typography
        variant="subtitle2"
        sx={{
          color: 'text.secondary',
        }}
      >
        Top Miner Contributors{' '}
        <Typography
          component="span"
          sx={{ color: STATUS_COLORS.open, fontSize: '0.8em' }}
        >
          ({totalContributors})
        </Typography>
      </Typography>
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          gap: 0.5,
          backgroundColor: 'surface.subtle',
          p: 0.5,
          borderRadius: 2,
        }}
      >
        {(
          [
            { label: 'OSS Contributions', value: 'oss' as const },
            { label: 'Issue Discovery', value: 'issues' as const },
          ] as const
        ).map((option) => {
          const isActive = programTab === option.value;
          return (
            <Box
              key={option.value}
              component="button"
              type="button"
              aria-pressed={isActive}
              onClick={() => setProgramTab(option.value)}
              sx={{
                px: 1,
                py: 0.65,
                border: 0,
                borderRadius: 1.5,
                cursor: 'pointer',
                minWidth: 0,
                flex: 1,
                fontFamily: 'inherit',
                backgroundColor: isActive ? 'surface.elevated' : 'transparent',
                color: isActive
                  ? 'text.primary'
                  : (t) => alpha(t.palette.text.primary, 0.5),
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'surface.elevated',
                  color: 'text.primary',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {option.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  const showMoreRow = activeContributors.length > 7 && (
    <Box
      onClick={hasMore ? handleShowMore : handleShowLess}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        px: 1.5,
        py: 1.5,
        cursor: 'pointer',
        color: STATUS_COLORS.open,
        fontSize: '12px',
        '&:hover': {
          color: 'text.primary',
          backgroundColor: 'surface.subtle',
        },
        transition: 'all 0.1s',
      }}
    >
      {hasMore ? (
        <>
          Show more <KeyboardArrowDownIcon sx={{ fontSize: 16, ml: 0.5 }} />
        </>
      ) : (
        <>
          Show less <KeyboardArrowUpIcon sx={{ fontSize: 16, ml: 0.5 }} />
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <DataTable<ContributorRow>
        columns={columns}
        rows={displayedContributors}
        getRowKey={(c) => c.githubId}
        header={header}
        pagination={showMoreRow || undefined}
        getRowSx={(c) => {
          const eligible =
            programTab === 'oss'
              ? (c.isEligible ?? false)
              : (c.isIssueEligible ?? false);
          return {
            opacity: eligible ? 1 : 0.5,
            '&:hover': {
              backgroundColor: alpha(theme.palette.common.white, 0.04),
              opacity: 1,
            },
            transition: 'all 0.1s',
          };
        }}
      />
    </Box>
  );
};

export default RepositoryContributorsTable;

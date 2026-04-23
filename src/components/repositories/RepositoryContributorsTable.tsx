import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAllPrs, useAllMiners } from '../../api';
import { LinkBox } from '../common/linkBehavior';
import { STATUS_COLORS } from '../../theme';
import { isMergedPr } from '../../utils/prStatus';
import { DataTable, type DataTableColumn } from '../common/DataTable';

interface RepositoryContributorsTableProps {
  repositoryFullName: string;
}

interface ContributorRow {
  rank: number;
  author: string;
  githubId: string;
  prs: number;
  score: number;
  minerRank?: number;
  isEligible?: boolean;
}

const numericCellSx = { fontVariantNumeric: 'tabular-nums' as const };

const RepositoryContributorsTable: React.FC<
  RepositoryContributorsTableProps
> = ({ repositoryFullName }) => {
  const theme = useTheme();
  const { data: allPRs, isLoading } = useAllPrs();
  const { data: allMinersStats } = useAllMiners();

  // State for how many items to show. Minimum 7.
  const [visibleCount, setVisibleCount] = useState(7);

  // Build githubId -> miner rank/eligibility map
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

  // Get contributors for this repository - only count merged PRs
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
      if (!pr.githubId) return; // Skip PRs without githubId
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

    // Default sort by score descending
    return Array.from(contributorsMap.values())
      .sort((a, b) => b.score - a.score)
      .map((c, index) => {
        const minerData = minerDataMap.get(c.githubId);
        return {
          ...c,
          rank: index + 1,
          minerRank: minerData?.rank,
          isEligible: minerData?.isEligible,
        };
      });
  }, [allPRs, repositoryFullName, minerDataMap]);

  const displayedContributors = contributors.slice(0, visibleCount);
  const totalContributors = contributors.length;
  const hasMore = visibleCount < totalContributors;

  const handleShowMore = () => setVisibleCount(totalContributors);
  const handleShowLess = () => setVisibleCount(7);

  const columns = useMemo<DataTableColumn<ContributorRow>[]>(
    () => [
      {
        key: 'rank',
        header: '#',
        width: '32px',
        cellSx: (c) => ({
          color: c.rank <= 3 ? 'text.primary' : STATUS_COLORS.open,
          fontWeight: c.rank <= 3 ? 600 : 400,
        }),
        renderCell: (c) => c.rank,
      },
      {
        key: 'miner',
        header: 'Miner',
        cellSx: { minWidth: 0 },
        renderCell: (c) => (
          <LinkBox
            href={`/miners/details?githubId=${c.githubId}`}
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
              {c.minerRank != null && (
                <Typography
                  sx={{
                    fontSize: '10px',
                    color: STATUS_COLORS.open,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Global Rank #{c.minerRank}
                </Typography>
              )}
            </Box>
          </LinkBox>
        ),
      },
      {
        key: 'prs',
        header: 'PRs',
        width: '3rem',
        align: 'right',
        headerSx: numericCellSx,
        cellSx: numericCellSx,
        renderCell: (c) => c.prs,
      },
      {
        key: 'score',
        header: 'Score',
        width: '4.5rem',
        align: 'right',
        headerSx: numericCellSx,
        cellSx: numericCellSx,
        renderCell: (c) => c.score.toFixed(2),
      },
    ],
    [repositoryFullName, theme.palette.border.light],
  );

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
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
      }}
    >
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
          ({contributors.length})
        </Typography>
      </Typography>
    </Box>
  );

  const showMoreRow = contributors.length > 7 && (
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
        getRowSx={(c) => ({
          opacity: c.isEligible ? 1 : 0.5,
          '&:hover': {
            backgroundColor: alpha(theme.palette.common.white, 0.04),
            opacity: 1,
          },
          transition: 'all 0.1s',
        })}
      />
    </Box>
  );
};

export default RepositoryContributorsTable;

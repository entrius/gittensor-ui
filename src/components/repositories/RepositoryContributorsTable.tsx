import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAllPrs, useAllMiners } from '../../api';
import { useNavigate } from 'react-router-dom';
import { STATUS_COLORS } from '../../theme';
import { isMergedPr } from '../../utils/prStatus';

interface RepositoryContributorsTableProps {
  repositoryFullName: string;
}

const RepositoryContributorsTable: React.FC<
  RepositoryContributorsTableProps
> = ({ repositoryFullName }) => {
  const theme = useTheme();
  const navigate = useNavigate();
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
  const contributors = useMemo(() => {
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
    return Array.from(contributorsMap.values()).sort(
      (a, b) => b.score - a.score,
    );
  }, [allPRs, repositoryFullName]);

  const displayedContributors = contributors.slice(0, visibleCount);
  const totalContributors = contributors.length;
  const hasMore = visibleCount < totalContributors;

  const handleShowMore = () => {
    // Expand fully
    setVisibleCount(totalContributors);
  };

  const handleShowLess = () => {
    // Reset to 7
    setVisibleCount(7);
  };

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

  /** PRS/SCORE use minmax(0, …) so they shrink inside the row; overflow hidden on the grid prevents digits painting past the row border. */
  const rowGridSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: '20px minmax(0, 1fr) minmax(0, 2.75rem) minmax(0, 3.75rem)',
      sm: '28px minmax(0, 1fr) minmax(0, 3.25rem) minmax(0, 4.5rem)',
    },
    columnGap: 1,
    alignItems: 'center',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    px: 1.5,
    overflow: 'hidden',
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
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

      {/* Full-width shell so underline spans the sidebar; inner grid clips overflowing numerals. */}
      <Box
        sx={{
          width: '100%',
          minWidth: 0,
          py: 1,
          borderBottom: `1px solid ${theme.palette.border.light}`,
          boxSizing: 'border-box',
        }}
      >
        <Box sx={rowGridSx}>
          <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
            #
          </Typography>
          <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
            MINER
          </Typography>
          <Typography
            sx={{
              fontSize: '11px',
              color: 'text.secondary',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            PRS
          </Typography>
          <Typography
            sx={{
              fontSize: '11px',
              color: 'text.secondary',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            SCORE
          </Typography>
        </Box>
      </Box>

      {/* Rows */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {displayedContributors.map((contributor, index) => {
          const minerData = minerDataMap.get(contributor.githubId);
          const minerRank = minerData?.rank;
          const isInactive = !minerData?.isEligible;

          return (
            <Box
              key={contributor.githubId}
              sx={{
                width: '100%',
                minWidth: 0,
                py: 1,
                boxSizing: 'border-box',
                borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                opacity: isInactive ? 0.5 : 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.04),
                  opacity: 1,
                },
                transition: 'background-color 0.1s, opacity 0.1s',
              }}
            >
              <Box sx={rowGridSx}>
                {/* Rank */}
                <Box
                  sx={{
                    fontSize: '12px',
                    color: index < 3 ? 'text.primary' : STATUS_COLORS.open,
                    fontWeight: index < 3 ? 600 : 400,
                  }}
                >
                  {index + 1}
                </Box>

                {/* Contributor */}
                <Box
                  onClick={() =>
                    navigate(
                      `/miners/details?githubId=${contributor.githubId}`,
                      {
                        state: { backLabel: `Back to ${repositoryFullName}` },
                      },
                    )
                  }
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    minWidth: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover .contributor-name': {
                      color: STATUS_COLORS.info,
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <Avatar
                    src={`https://avatars.githubusercontent.com/${contributor.author}`}
                    sx={{
                      width: 20,
                      height: 20,
                      border: `1px solid ${theme.palette.border.light}`,
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
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'color 0.1s',
                      }}
                    >
                      {contributor.author}
                    </Typography>
                    {minerRank && (
                      <Typography
                        sx={{
                          fontSize: '10px',
                          color: STATUS_COLORS.open,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Global Rank #{minerRank}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* PRs */}
                <Typography
                  sx={{
                    textAlign: 'right',
                    fontSize: '12px',
                    color: 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {contributor.prs}
                </Typography>

                {/* Score */}
                <Typography
                  sx={{
                    textAlign: 'right',
                    fontSize: '12px',
                    color: 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {contributor.score.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          );
        })}

        {/* Show More / Show Less Row */}
        {contributors.length > 7 && (
          <Box
            onClick={hasMore ? handleShowMore : handleShowLess}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start', // Left align to match flow
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
                Show more{' '}
                <KeyboardArrowDownIcon sx={{ fontSize: 16, ml: 0.5 }} />
              </>
            ) : (
              <>
                Show less <KeyboardArrowUpIcon sx={{ fontSize: 16, ml: 0.5 }} />
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default RepositoryContributorsTable;

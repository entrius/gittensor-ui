import React, { useCallback, useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { type FeaturedWorkRepo, type FeaturedWorkPr } from '../dashboardData';
import FeaturedWorkRepoCard from './FeaturedWorkRepoCard';
import {
  emptyMessageSx,
  loaderContainerSx,
  sectionContainerSx,
  sectionTitleSx,
} from './featuredWorkStyles';
import { getPrHref, getRepoHref } from '../../../routes.helpers';

interface DashboardFeaturedWorkProps {
  items: FeaturedWorkRepo[];
  isLoading?: boolean;
}

type NavigateToRepoFn = (repoName: string) => void;
type NavigateToPrFn = (repoName: string, pr: FeaturedWorkPr) => void;

const FEATURED_WORK_EMPTY_MESSAGE = 'No merged PRs in the last 24 hours.';
const FEATURED_WORK_TITLE = 'Featured Work';
const MAX_COLUMNS_SM = 2;
const MAX_COLUMNS_LG = 3;

const buildPrDetailUrl = (repo: string, prNumber: number): string =>
  getPrHref(repo, prNumber);

const buildRepoDetailUrl = (repo: string): string => getRepoHref(repo);

const computeGridColumns = (
  itemCount: number,
): { xs: string; sm: string; lg: string } => ({
  xs: '1fr',
  sm: `repeat(${Math.min(itemCount, MAX_COLUMNS_SM)}, minmax(0, 1fr))`,
  lg: `repeat(${Math.min(itemCount, MAX_COLUMNS_LG)}, minmax(0, 1fr))`,
});

const DashboardFeaturedWorkSection: React.FC<DashboardFeaturedWorkProps> = ({
  items,
  isLoading = false,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const mono: string = theme.typography.fontFamily ?? 'monospace';

  const navigateToRepo: NavigateToRepoFn = useCallback(
    (repoName: string): void => {
      navigate(buildRepoDetailUrl(repoName));
    },
    [navigate],
  );

  const navigateToPr: NavigateToPrFn = useCallback(
    (repoName: string, pr: FeaturedWorkPr): void => {
      navigate(buildPrDetailUrl(repoName, pr.prNumber));
    },
    [navigate],
  );

  const gridColumns = useMemo(
    () => computeGridColumns(items.length),
    [items.length],
  );

  const hasItems: boolean = items.length > 0;

  return (
    <Box sx={sectionContainerSx(theme)}>
      <Typography sx={sectionTitleSx(theme, mono)}>
        {FEATURED_WORK_TITLE}
      </Typography>

      {isLoading ? (
        <Box sx={loaderContainerSx}>
          <CircularProgress size={24} />
        </Box>
      ) : !hasItems ? (
        <Typography sx={emptyMessageSx(mono)}>
          {FEATURED_WORK_EMPTY_MESSAGE}
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: gridColumns,
            gap: 2,
          }}
        >
          {items.map((repo: FeaturedWorkRepo) => (
            <FeaturedWorkRepoCard
              key={repo.repository}
              repo={repo}
              mono={mono}
              theme={theme}
              onNavigateToRepo={navigateToRepo}
              onNavigateToPr={navigateToPr}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DashboardFeaturedWorkSection;

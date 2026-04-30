import React from 'react';
import GitHubIcon from '@mui/icons-material/GitHub';
import { Avatar, Box, Stack, Tooltip, Typography } from '@mui/material';
import { type Theme } from '@mui/material/styles';
import { getGithubAvatarSrc } from '../../../utils';
import { type FeaturedWorkRepo, type FeaturedWorkPr } from '../dashboardData';
import FeaturedWorkPrRow from './FeaturedWorkPrRow';
import {
  repoAvatarSx,
  repoCardContainerSx,
  repoHeaderSx,
  repoNameSx,
  repoSubtitleSx,
  scoreHighlightSx,
} from './featuredWorkStyles';

export interface FeaturedWorkRepoCardProps {
  repo: FeaturedWorkRepo;
  mono: string;
  theme: Theme;
  onNavigateToRepo: (repoName: string) => void;
  onNavigateToPr: (repoName: string, pr: FeaturedWorkPr) => void;
}

const extractOwner = (repository: string): string =>
  repository.split('/')[0] || '';

const formatPrCount = (count: number): string =>
  `${count} PR${count !== 1 ? 's' : ''}`;

const formatTotalScore = (score: number): string => score.toFixed(1);

const FeaturedWorkRepoCard: React.FC<FeaturedWorkRepoCardProps> = ({
  repo,
  mono,
  theme,
  onNavigateToRepo,
  onNavigateToPr,
}) => {
  const owner: string = extractOwner(repo.repository);
  const prCountLabel: string = formatPrCount(repo.prCount);
  const scoreLabel: string = formatTotalScore(repo.totalScore);

  const handleRepoClick = (): void => onNavigateToRepo(repo.repository);

  const handleRepoKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigateToRepo(repo.repository);
    }
  };

  return (
    <Box sx={repoCardContainerSx(theme)}>
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        role="button"
        tabIndex={0}
        onClick={handleRepoClick}
        onKeyDown={handleRepoKeyDown}
        sx={repoHeaderSx(theme)}
      >
        <Avatar
          src={getGithubAvatarSrc(owner)}
          alt={owner}
          sx={repoAvatarSx(theme, mono)}
        >
          <GitHubIcon />
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Tooltip title={repo.repository} arrow placement="top">
            <Typography className="repo-name" sx={repoNameSx(theme, mono)}>
              {repo.repository}
            </Typography>
          </Tooltip>
          <Typography sx={repoSubtitleSx(theme, mono)}>
            {prCountLabel} {repo.windowLabel}
            {' · '}
            <Box component="span" sx={scoreHighlightSx(theme)}>
              {scoreLabel}
            </Box>
            {' score'}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={0.25}>
        {repo.prs.map((pr: FeaturedWorkPr) => (
          <FeaturedWorkPrRow
            key={`${repo.repository}-${pr.prNumber}`}
            repository={repo.repository}
            pr={pr}
            mono={mono}
            theme={theme}
            onNavigate={onNavigateToPr}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default FeaturedWorkRepoCard;

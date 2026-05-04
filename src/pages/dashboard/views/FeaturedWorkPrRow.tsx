import React from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { type Theme } from '@mui/material/styles';
import { type FeaturedWorkPr } from '../dashboardData';
import {
  prAuthorSx,
  prChangesSx,
  prDeletionsSx,
  prNumberSx,
  prRowContainerSx,
  prScoreSx,
  prTitleSx,
} from './featuredWorkStyles';

export interface FeaturedWorkPrRowProps {
  repository: string;
  pr: FeaturedWorkPr;
  mono: string;
  theme: Theme;
  onNavigate: (repo: string, pr: FeaturedWorkPr) => void;
}

const buildPrTitle = (prNumber: number, title: string): string =>
  title || `PR #${prNumber}`;

const formatAdditions = (additions: number): string =>
  `+${additions.toLocaleString()}`;

const formatDeletions = (deletions: number): string =>
  `-${deletions.toLocaleString()}`;

const formatScore = (score: number): string => score.toFixed(2);

const FeaturedWorkPrRow: React.FC<FeaturedWorkPrRowProps> = ({
  repository,
  pr,
  mono,
  theme,
  onNavigate,
}) => {
  const handleClick = (): void => onNavigate(repository, pr);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate(repository, pr);
    }
  };

  const displayTitle: string = buildPrTitle(pr.prNumber, pr.title);
  const scoreText: string = formatScore(pr.score);
  const additionsText: string = formatAdditions(pr.additions);
  const hasDeletions: boolean = pr.deletions > 0;
  const deletionsText: string = hasDeletions
    ? formatDeletions(pr.deletions)
    : '';

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      sx={prRowContainerSx(theme)}
    >
      <Tooltip title={displayTitle} arrow placement="top">
        <Typography sx={prTitleSx(theme, mono)}>
          <Box component="span" sx={prNumberSx(theme)}>
            #{pr.prNumber}
          </Box>{' '}
          {displayTitle}
        </Typography>
      </Tooltip>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
        <Typography sx={prScoreSx(theme, mono)}>{scoreText}</Typography>
        <Typography sx={prChangesSx(theme, mono)}>
          {additionsText}
          {hasDeletions && (
            <Box component="span" sx={prDeletionsSx(theme)}>
              {' '}
              {deletionsText}
            </Box>
          )}
        </Typography>
        <Typography sx={prAuthorSx(theme, mono)}>{pr.author}</Typography>
      </Stack>
    </Box>
  );
};

export default FeaturedWorkPrRow;

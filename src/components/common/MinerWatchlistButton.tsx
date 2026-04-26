import React from 'react';
import { IconButton, Tooltip, type SxProps, type Theme } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useWatchlist, serializePRKey } from '../../hooks/useWatchlist';
import {
  getAllPrsQueryKey,
  getMinerPRsQueryKey,
  type CommitLog,
} from '../../api';

interface MinerWatchlistButtonProps {
  githubId: string;
  hotkey?: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

function fanOutKeys(prs: CommitLog[]): string[] {
  return prs.map((pr) => serializePRKey(pr.repository, pr.pullRequestNumber));
}

function filterPrsByHotkey(prs: CommitLog[], hotkey: string): CommitLog[] {
  return prs.filter((pr) => pr.hotkey === hotkey);
}

async function fetchMinerPRsViaCache(
  queryClient: ReturnType<typeof useQueryClient>,
  githubId: string,
): Promise<CommitLog[]> {
  return queryClient.fetchQuery<CommitLog[]>({
    queryKey: getMinerPRsQueryKey(githubId),
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
      const url = `${baseUrl ?? ''}/miners/${githubId}/prs`;
      const { data } = await axios.get<CommitLog[]>(url);
      return data;
    },
  });
}

export const MinerWatchlistButton: React.FC<MinerWatchlistButtonProps> = ({
  githubId,
  hotkey,
  size = 'small',
  sx,
}) => {
  const { isWatched, toggle } = useWatchlist('miners');
  const { addMany: addManyPrs } = useWatchlist('prs');
  const queryClient = useQueryClient();

  const watched = githubId ? isWatched(githubId) : false;
  const label = watched ? 'Remove from watchlist' : 'Add to watchlist';

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!githubId) return;

    const willBeWatched = !watched;
    toggle(githubId);
    if (!willBeWatched) return;

    if (hotkey) {
      const cached = queryClient.getQueryData<CommitLog[]>(getAllPrsQueryKey());
      if (cached) {
        addManyPrs(fanOutKeys(filterPrsByHotkey(cached, hotkey)));
        return;
      }
    }

    try {
      const prs = await fetchMinerPRsViaCache(queryClient, githubId);
      addManyPrs(fanOutKeys(prs ?? []));
    } catch {
      // noop
    }
  };

  return (
    <Tooltip title={label} placement="top" arrow>
      <IconButton
        size={size}
        onClick={handleClick}
        aria-label={label}
        aria-pressed={watched}
        sx={{
          color: watched ? 'warning.main' : 'text.tertiary',
          transition: 'color 0.15s, transform 0.15s',
          '&:hover': {
            color: 'warning.light',
            transform: 'scale(1.08)',
            backgroundColor: 'rgba(255,255,255,0.06)',
          },
          ...sx,
        }}
      >
        {watched ? (
          <StarIcon fontSize={size === 'medium' ? 'medium' : 'small'} />
        ) : (
          <StarBorderIcon fontSize={size === 'medium' ? 'medium' : 'small'} />
        )}
      </IconButton>
    </Tooltip>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  CircularProgress,
  useMediaQuery,
  alpha,
  Avatar,
  Chip,
} from '@mui/material';
import { LinkBox } from '../../../components/common/linkBehavior';
import { useInfiniteCommitLog } from '../../../api';
import theme, { scrollbarSx } from '../../../theme';
import { getGithubAvatarBg, getGithubAvatarSrc } from '../../../utils';

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const formatUtcTimestamp = (iso: string): string => {
  const d = new Date(iso);
  const month = MONTH_SHORT[d.getUTCMonth()];
  const day = d.getUTCDate();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${month} ${day}, ${hh}:${mm}:${ss} UTC`;
};

interface CommitLogEntry {
  pullRequestNumber: number;
  hotkey: string;
  pullRequestTitle: string;
  additions: number;
  deletions: number;
  commitCount: number;
  repository: string;
  mergedAt: string | null;
  prCreatedAt: string;
  prState?: string;
  author: string;
  score: string;
}

type CommitStatus = 'merged' | 'open' | 'closed';
type CommitStatusFilter = 'all' | CommitStatus;

const COMMIT_STATUS_META: Record<
  CommitStatusFilter,
  { filterLabel: string; badgeLabel: string; color: string }
> = {
  all: {
    filterLabel: 'All',
    badgeLabel: 'ALL',
    color: theme.palette.text.secondary,
  },
  merged: {
    filterLabel: 'Merged',
    badgeLabel: 'MERGED',
    color: theme.palette.status.merged,
  },
  open: {
    filterLabel: 'Open',
    badgeLabel: 'OPEN',
    color: theme.palette.status.open,
  },
  closed: {
    filterLabel: 'Closed',
    badgeLabel: 'CLOSED',
    color: theme.palette.status.closed,
  },
};

const COMMIT_STATUS_FILTERS: CommitStatusFilter[] = [
  'all',
  'merged',
  'open',
  'closed',
];

const getCommitId = (entry: CommitLogEntry) =>
  `${entry.repository}-${entry.pullRequestNumber}`;

const getCommitStatus = (entry: CommitLogEntry): CommitStatus => {
  if (entry.mergedAt || entry.prState === 'MERGED') return 'merged';
  if (entry.prState === 'CLOSED') return 'closed';
  return 'open';
};

const getCommitTimestamp = (entry: CommitLogEntry) => {
  const timestamp = entry.mergedAt || entry.prCreatedAt;
  return timestamp ? new Date(timestamp).getTime() : 0;
};

const getScoreColor = (score: string) => {
  const scoreNum = parseFloat(score);
  if (isNaN(scoreNum)) return theme.palette.text.secondary;
  if (scoreNum >= 10) return theme.palette.text.primary;
  if (scoreNum >= 5) return alpha(theme.palette.common.white, 0.69);
  return theme.palette.text.secondary;
};

const CommitLogItem: React.FC<{
  entry: CommitLogEntry;
  isNew: boolean;
  innerRef?: React.Ref<HTMLAnchorElement>;
}> = ({ entry, isNew, innerRef }) => {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const isMerged = !!entry.mergedAt;
  const isClosed = entry.prState === 'CLOSED' && !entry.mergedAt;

  let status = { label: 'OPEN', color: theme.palette.status.neutral };
  if (isMerged)
    status = { label: 'MERGED', color: theme.palette.status.merged };
  else if (isClosed)
    status = { label: 'CLOSED', color: theme.palette.status.closed };
  const timestampRaw = entry.mergedAt || entry.prCreatedAt;
  const timestamp = timestampRaw
    ? formatUtcTimestamp(timestampRaw)
    : 'Loading...';

  const content = (
    <LinkBox
      href={`/miners/pr?repo=${entry.repository}&number=${entry.pullRequestNumber}`}
      linkState={{ backLabel: 'Back to Dashboard' }}
      ref={innerRef}
      sx={{
        p: isMobile ? 0.75 : isTablet ? 1.25 : 1,
        borderRadius: 3,
        border: '1px solid',
        borderColor: isNew
          ? theme.palette.secondary.main
          : theme.palette.border.light,
        backgroundColor: theme.palette.surface.subtle,
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: isNew ? 'slideIn 0.5s ease-out' : undefined,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(90deg, ${alpha(status.color, 0.1)} 0%, transparent 100%)`,
          opacity: 0.5,
        },
        '&:hover': {
          borderColor: status.color,
          transform: 'translateX(4px)',
          boxShadow: `0 0 20px ${alpha(status.color, 0.1)}`,
          '&::before': { opacity: 0.8 },
        },
        '@keyframes slideIn': {
          from: { opacity: 0, transform: 'translateX(-20px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      }}
    >
      <Stack
        spacing={isMobile ? 0.5 : isTablet ? 1 : 0.5}
        sx={{ position: 'relative', zIndex: 1 }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            {(() => {
              const repoOwner = entry.repository.split('/')[0];
              return (
                <Avatar
                  src={getGithubAvatarSrc(repoOwner)}
                  sx={{
                    width: 16,
                    height: 16,
                    border: `1px solid ${theme.palette.border.medium}`,
                    backgroundColor:
                      getGithubAvatarBg(repoOwner) ??
                      theme.palette.surface.transparent,
                  }}
                />
              );
            })()}
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
              }}
            >
              {entry.repository}
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
            }}
          >
            #{entry.pullRequestNumber}
          </Typography>
        </Stack>

        <Box>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 0.5 }}
          >
            <Chip
              variant="status"
              label={status.label}
              size="small"
              sx={{
                color: status.color,
                borderColor: alpha(status.color, 0.3),
                backgroundColor: alpha(status.color, 0.1),
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {timestamp}
            </Typography>
          </Stack>
          <Typography
            sx={{
              color: 'text.primary',
              fontSize: '0.9rem',
              fontWeight: 500,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {entry.pullRequestTitle}
          </Typography>
        </Box>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            pt: 1,
            borderTop: `1px solid ${theme.palette.border.subtle}`,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            by {entry.author}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography
                variant="caption"
                sx={{ color: theme.palette.diff.additions, fontWeight: 600 }}
              >
                +{entry.additions}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                /
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: theme.palette.diff.deletions, fontWeight: 600 }}
              >
                -{entry.deletions}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: getScoreColor(entry.score),
                fontWeight: 600,
              }}
            >
              SCORE: {parseFloat(entry.score).toFixed(2)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </LinkBox>
  );

  return content;
};

const LiveCommitLog: React.FC = () => {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteCommitLog({ refetchInterval: 10000 });

  const [statusFilter, setStatusFilter] = useState<CommitStatusFilter>('all');
  const [logEntries, setLogEntries] = useState<CommitLogEntry[]>([]);
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const logContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLAnchorElement>(null);

  const apiCommits = useMemo<CommitLogEntry[]>(
    () => data?.pages.flat() ?? [],
    [data],
  );

  useEffect(() => {
    if (apiCommits.length === 0) return;

    setLogEntries((prevLog) => {
      const previousIds = new Set(prevLog.map(getCommitId));
      const latestById = new Map(
        apiCommits.map((entry) => [getCommitId(entry), entry]),
      );

      if (prevLog.length === 0) return apiCommits;

      const updatedLog = prevLog.map(
        (entry) => latestById.get(getCommitId(entry)) ?? entry,
      );
      const novelItems = apiCommits.filter(
        (entry) => !previousIds.has(getCommitId(entry)),
      );

      if (novelItems.length === 0) return updatedLog;

      const firstApiId = getCommitId(apiCommits[0]);
      const isHeadUpdate = novelItems.some(
        (entry) => getCommitId(entry) === firstApiId,
      );

      if (isHeadUpdate) {
        setNewEntryIds(new Set(novelItems.map(getCommitId)));
        setTimeout(() => setNewEntryIds(new Set()), 2000);
        return [...novelItems, ...updatedLog];
      }

      return [...updatedLog, ...novelItems];
    });
  }, [apiCommits]);

  const visibleEntries = useMemo(
    () =>
      [...logEntries]
        .filter(
          (entry) =>
            statusFilter === 'all' || getCommitStatus(entry) === statusFilter,
        )
        .sort((a, b) => getCommitTimestamp(b) - getCommitTimestamp(a)),
    [logEntries, statusFilter],
  );

  const hasAnyEntries = logEntries.length > 0;
  const showInitialLoading = isLoading && !hasAnyEntries;
  const showWaitingForActivity = !showInitialLoading && !hasAnyEntries;
  const showFilteredEmptyState = hasAnyEntries && visibleEntries.length === 0;

  // Intersection observer for infinite scroll
  useEffect(() => {
    const scrollContainer = logContainerRef.current;
    const loadMoreElement = loadMoreRef.current;
    if (!scrollContainer || !loadMoreElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: scrollContainer,
        threshold: 0.1,
      },
    );

    observer.observe(loadMoreElement);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, visibleEntries.length]);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: 'transparent',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      elevation={0}
    >
      <CardContent
        sx={{
          flex: 1,
          p: isMobile ? 1.5 : isTablet ? 1.75 : 2,
          '&:last-child': { pb: isMobile ? 1.5 : isTablet ? 1.75 : 2 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <Stack
          spacing={0.5}
          useFlexGap
          sx={{ mb: isMobile ? 1 : 1.5, flexShrink: 0 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: isMobile ? '0.9rem' : isTablet ? '0.95rem' : '1rem',
                fontWeight: 500,
              }}
            >
              Live Activity
            </Typography>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: theme.palette.success.main,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          </Stack>
          <Box
            sx={{
              mt: 0.5,
              borderBottom: (t) => `1px solid ${t.palette.border.light}`,
            }}
          />
          <Box
            sx={(t) => ({
              mt: 1,
              mb: '1px',
              display: 'inline-flex',
              alignSelf: 'center',
              gap: 0.5,
              p: 0.5,
              borderRadius: 2,
              backgroundColor: t.palette.surface.light,
            })}
          >
            {COMMIT_STATUS_FILTERS.map((filter) => {
              const option = COMMIT_STATUS_META[filter];
              const selected = statusFilter === filter;

              return (
                <Box
                  key={filter}
                  component="button"
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setStatusFilter(filter)}
                  sx={(t) => ({
                    px: isMobile ? 1.35 : 1.6,
                    height: isMobile ? 22 : 24,
                    display: 'flex',
                    alignItems: 'center',
                    border: 0,
                    borderRadius: 1.5,
                    backgroundColor: selected
                      ? alpha(t.palette.text.primary, 0.15)
                      : 'transparent',
                    color: selected
                      ? t.palette.text.primary
                      : alpha(option.color, 0.82),
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.68rem' : '0.72rem',
                    fontWeight: selected ? 600 : 500,
                    lineHeight: 1,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(t.palette.text.primary, 0.1),
                      color: t.palette.text.primary,
                    },
                    '&:focus-visible': {
                      outline: `1px solid ${option.color}`,
                      outlineOffset: 1,
                    },
                  })}
                >
                  {option.filterLabel}
                </Box>
              );
            })}
          </Box>
        </Stack>

        {showInitialLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            ref={logContainerRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              pr: 1,
              ...scrollbarSx,
            }}
          >
            {showWaitingForActivity ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 8,
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body2">Waiting for activity...</Typography>
              </Box>
            ) : showFilteredEmptyState ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 8,
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body2">
                  No{' '}
                  {COMMIT_STATUS_META[statusFilter].filterLabel.toLowerCase()}{' '}
                  activity yet.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={isMobile ? 1 : isTablet ? 1.25 : 1}>
                {visibleEntries.map((entry) => {
                  const entryId = getCommitId(entry);
                  const isNew = newEntryIds.has(entryId);

                  return (
                    <CommitLogItem key={entryId} entry={entry} isNew={isNew} />
                  );
                })}
              </Stack>
            )}

            <Box ref={loadMoreRef} sx={{ height: 1 }} />

            {isFetchingNextPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={20} />
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveCommitLog;

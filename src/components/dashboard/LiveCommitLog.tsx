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
import { useNavigate } from 'react-router-dom';
import theme from '../../theme';
import { useInfiniteCommitLog, usePullRequestDetails } from '../../api';

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
  isNew?: boolean;
}

const getScoreColor = (score: string) => {
  const scoreNum = parseFloat(score);
  if (isNaN(scoreNum)) return theme.palette.grey[500];
  if (scoreNum >= 10) return '#ffffff';
  if (scoreNum >= 5) return '#b0b0b0';
  return '#7d7d7d';
};

const CommitLogItem: React.FC<{
  entry: CommitLogEntry;
  isNew: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
}> = ({ entry, isNew, innerRef }) => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Hydrate with detailed data
  const { data: details } = usePullRequestDetails(
    entry.repository,
    entry.pullRequestNumber,
  );

  // Derive status and timestamp from details if available, otherwise fallback
  const isMerged = !!(details?.mergedAt || entry.mergedAt);
  const isClosed = details?.prState === 'CLOSED' || entry.prState === 'CLOSED';

  let status = { label: 'OPEN', color: theme.palette.status.neutral };
  if (isMerged)
    status = { label: 'MERGED', color: theme.palette.status.merged };
  else if (isClosed)
    status = { label: 'CLOSED', color: theme.palette.status.closed };

  const timestampRaw =
    details?.mergedAt ||
    details?.prCreatedAt ||
    entry.mergedAt ||
    entry.prCreatedAt;
  const timestamp = timestampRaw
    ? formatUtcTimestamp(timestampRaw)
    : 'Loading...';

  const content = (
    <Box
      ref={innerRef}
      onClick={() =>
        navigate(
          `/miners/pr?repo=${entry.repository}&number=${entry.pullRequestNumber}`,
          { state: { backLabel: 'Back to Dashboard' } },
        )
      }
      sx={{
        p: isMobile ? 0.75 : isTablet ? 1.25 : 1,
        borderRadius: 3,
        border: '1px solid',
        borderColor: isNew
          ? theme.palette.secondary.main
          : 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)',
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
        {/* Top Row: Repo & ID */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar
              src={`https://avatars.githubusercontent.com/${entry.repository.split('/')[0]}`}
              sx={{
                width: 16,
                height: 16,
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor:
                  entry.repository.split('/')[0] === 'opentensor'
                    ? '#ffffff'
                    : entry.repository.split('/')[0] === 'bitcoin'
                      ? '#F7931A'
                      : 'transparent',
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {entry.repository}
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            #{entry.pullRequestNumber}
          </Typography>
        </Stack>

        {/* Middle Row: Action & Title */}
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
              color: '#fff',
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

        {/* Bottom Row: Author & Stats */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ pt: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}
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
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              SCORE: {parseFloat(entry.score).toFixed(2)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );

  return content;
};

const LiveCommitLog: React.FC = () => {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Using infinite query for pagination
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteCommitLog({ refetchInterval: 10000 }); // Poll every 10 seconds

  const [logEntries, setLogEntries] = useState<CommitLogEntry[]>([]);
  const [_seenEntryIds, setSeenEntryIds] = useState<Set<string>>(new Set());
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const logContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Flatten all pages into a single array from API (memoized to avoid infinite effect loops)
  const apiCommits = useMemo<CommitLogEntry[]>(
    () => data?.pages.flat() ?? [],
    [data],
  );

  useEffect(() => {
    if (apiCommits.length === 0) return;

    const getCommitId = (c: CommitLogEntry) =>
      `${c.pullRequestNumber}-${c.mergedAt || c.prCreatedAt || c.prState || 'OPEN'}`;

    setSeenEntryIds((prevSeen) => {
      const newSeen = new Set(prevSeen);
      const novelItems: CommitLogEntry[] = [];

      apiCommits.forEach((c) => {
        const id = getCommitId(c);
        if (!newSeen.has(id)) {
          novelItems.push(c);
          newSeen.add(id);
        }
      });

      if (novelItems.length === 0) return prevSeen;

      // Check if we should prepend or append
      // If the *first* item in the incoming API list was one of the novel items, assume it's new data (Prepend)
      // Otherwise append.
      const firstApiId = getCommitId(apiCommits[0]);
      const isHeadUpdate = novelItems.some(
        (c) => getCommitId(c) === firstApiId,
      );

      setLogEntries((prevLog) => {
        if (prevLog.length === 0) return apiCommits; // Initial fill

        if (isHeadUpdate) {
          // Newest items first
          // Mark for animation
          const ids = new Set(novelItems.map(getCommitId));
          setNewEntryIds(ids);
          setTimeout(() => setNewEntryIds(new Set()), 2000);
          return [...novelItems, ...prevLog];
        } else {
          return [...prevLog, ...novelItems];
        }
      });

      return newSeen;
    });
  }, [apiCommits]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, logEntries.length]);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
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
        <Stack spacing={0.5} sx={{ mb: isMobile ? 1 : 1.5, flexShrink: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: isMobile ? '0.9rem' : isTablet ? '0.95rem' : '1rem',
                fontFamily: '"JetBrains Mono", monospace',
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
        </Stack>

        {isLoading && logEntries.length === 0 ? (
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
        ) : logEntries.length === 0 ? (
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
        ) : (
          <Box
            ref={logContainerRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              pr: 1,
              '&::-webkit-scrollbar': { width: '6px' },
              '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
              },
            }}
          >
            <Stack spacing={isMobile ? 1 : isTablet ? 1.25 : 1}>
              {[...logEntries]
                .sort((a, b) => {
                  const dateA = a.mergedAt
                    ? new Date(a.mergedAt).getTime()
                    : a.prCreatedAt
                      ? new Date(a.prCreatedAt).getTime()
                      : 0;
                  const dateB = b.mergedAt
                    ? new Date(b.mergedAt).getTime()
                    : b.prCreatedAt
                      ? new Date(b.prCreatedAt).getTime()
                      : 0;
                  return dateB - dateA; // Newest first
                })
                .map((entry, index) => {
                  const entryId = `${entry.pullRequestNumber}-${
                    entry.mergedAt || entry.prCreatedAt || 'OPEN'
                  }`;
                  const isLastItem = index === logEntries.length - 1;
                  const isNew = newEntryIds.has(entryId);

                  return (
                    <CommitLogItem
                      key={entryId}
                      entry={entry}
                      isNew={isNew}
                      innerRef={isLastItem ? loadMoreRef : null}
                    />
                  );
                })}

              {isFetchingNextPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveCommitLog;

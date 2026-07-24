import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Typography,
  Box,
  Stack,
  CircularProgress,
  useMediaQuery,
  alpha,
  Avatar,
  Tooltip,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { LinkBox } from '../../../components/common/linkBehavior';
import { useInfiniteCommitLog } from '../../../api';
import { getRepositoryOwnerAvatarSrc } from '../../../utils/avatar';
import theme, {
  REPO_OWNER_AVATAR_BACKGROUNDS,
  scrollbarSx,
} from '../../../theme';

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

const formatRelativeActivityTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
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

/** Remaining scroll distance (px) at which the next page starts loading. */
const SCROLL_BOTTOM_BUFFER_PX = 80;
/** Debounce delay (ms) for the scroll handler to avoid hammering on fast scroll. */
const SCROLL_DEBOUNCE_MS = 120;

const getCommitId = (entry: CommitLogEntry) =>
  `${entry.repository}-${entry.pullRequestNumber}`;

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

  let status = { label: 'OPENED', color: theme.palette.status.neutral };
  if (isMerged)
    status = { label: 'MERGED', color: theme.palette.status.merged };
  else if (isClosed)
    status = { label: 'CLOSED', color: theme.palette.status.closed };
  const timestampRaw = entry.mergedAt || entry.prCreatedAt;
  const relativeTime = timestampRaw
    ? formatRelativeActivityTime(timestampRaw)
    : 'Loading...';

  const content = (
    <LinkBox
      // TODO: convert to minerPrPath(entry.repository, entry.pullRequestNumber).
      // Left inline here to preserve current byte-level URL (repository is not encoded
      // today, so swapping in the helper would change the URL string); fix in a follow-up.
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
        backgroundColor: 'transparent',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: isNew ? 'slideIn 0.5s ease-out' : undefined,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: status.color,
          transform: 'translateX(4px)',
          boxShadow: `0 0 20px ${alpha(status.color, 0.1)}`,
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
            <Avatar
              src={getRepositoryOwnerAvatarSrc(entry.repository.split('/')[0])}
              alt={entry.repository}
              sx={{
                width: 16,
                height: 16,
                border: `1px solid ${theme.palette.border.medium}`,
                backgroundColor:
                  entry.repository.split('/')[0] === 'opentensor'
                    ? REPO_OWNER_AVATAR_BACKGROUNDS.opentensor
                    : entry.repository.split('/')[0] === 'bitcoin'
                      ? REPO_OWNER_AVATAR_BACKGROUNDS.bitcoin
                      : theme.palette.surface.transparent,
              }}
            />
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
            <Typography
              component="span"
              variant="caption"
              sx={{
                color: status.color,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              {status.label}
            </Typography>
            {timestampRaw ? (
              <Tooltip
                title={formatUtcTimestamp(timestampRaw)}
                placement="top"
                enterDelay={400}
              >
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ color: 'text.secondary' }}
                >
                  {relativeTime}
                </Typography>
              </Tooltip>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {relativeTime}
              </Typography>
            )}
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

        <LiveCommitFooter
          author={entry.author}
          additions={entry.additions}
          deletions={entry.deletions}
          score={entry.score}
        />
      </Stack>
    </LinkBox>
  );

  return content;
};

interface LiveCommitFooterProps {
  author: string;
  additions: number;
  deletions: number;
  score: string;
}

function LiveCommitFooter({
  author,
  additions,
  deletions,
  score,
}: LiveCommitFooterProps) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      gap={1}
      sx={{
        pt: 1,
        minWidth: 0,
        borderTop: `1px solid ${theme.palette.border.subtle}`,
      }}
    >
      <Tooltip title={author} placement="top" arrow>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          by {author}
        </Typography>
      </Tooltip>
      <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography
            variant="caption"
            sx={{ color: theme.palette.diff.additions, fontWeight: 600 }}
          >
            +{additions}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            /
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.diff.deletions, fontWeight: 600 }}
          >
            -{deletions}
          </Typography>
        </Stack>
        <Typography
          variant="caption"
          sx={{
            color: getScoreColor(score),
            fontWeight: 600,
          }}
        >
          SCORE: {parseFloat(score).toFixed(2)}
        </Typography>
      </Stack>
    </Stack>
  );
}

const LiveCommitLog: React.FC = () => {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteCommitLog({ refetchInterval: 10000 });

  const [logEntries, setLogEntries] = useState<CommitLogEntry[]>([]);
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const [, setRelativeTimeTick] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const fetchInFlightRef = useRef(false);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = window.setInterval(
      () => setRelativeTimeTick((n) => n + 1),
      60_000,
    );
    return () => window.clearInterval(id);
  }, []);

  // Clear any pending debounced scroll check on unmount.
  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current !== null) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
  }, []);

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
      [...logEntries].sort(
        (a, b) => getCommitTimestamp(b) - getCommitTimestamp(a),
      ),
    [logEntries],
  );

  const hasAnyEntries = logEntries.length > 0;
  const showInitialLoading = isLoading && !hasAnyEntries;
  const showWaitingForActivity = !showInitialLoading && !hasAnyEntries;

  // If the first page doesn't fill the container there is no scroll event to
  // trigger pagination. Check after each render and fetch the next page when
  // the container has no overflow yet.
  useEffect(() => {
    const el = logContainerRef.current;
    if (!el || !hasNextPage || isFetchingNextPage || fetchInFlightRef.current)
      return;
    if (el.scrollHeight <= el.clientHeight) {
      fetchInFlightRef.current = true;
      void fetchNextPage().finally(() => {
        fetchInFlightRef.current = false;
      });
    }
  }, [visibleEntries, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget;

      // Debounce: clear any pending check and reschedule
      if (scrollDebounceRef.current !== null) {
        clearTimeout(scrollDebounceRef.current);
      }

      scrollDebounceRef.current = setTimeout(() => {
        scrollDebounceRef.current = null;

        // Only trigger when within the buffer distance of the bottom.
        // Using a fixed pixel value is intentional: a percentage would shift
        // upward as new pages load (growing scrollHeight) and could re-fire
        // before the user scrolls further down.
        const distanceFromBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom > SCROLL_BOTTOM_BUFFER_PX) return;

        if (!hasNextPage || isFetchingNextPage || fetchInFlightRef.current)
          return;

        fetchInFlightRef.current = true;
        void fetchNextPage().finally(() => {
          fetchInFlightRef.current = false;
        });
      }, SCROLL_DEBOUNCE_MS);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  return (
    // Header sits directly on the canvas; the activity entries inside are
    // the only card layer.
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          flex: 1,
          // No vertical padding: the header lines up with the "Active
          // Network" title and the feed's bottom edge lines up with the
          // main column's bottom.
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            // Matches the "Active Network" header metrics exactly so the
            // first entry card's top lines up with the chart card's top.
            fontSize: { xs: '1.02rem', sm: '1.1rem' },
            fontWeight: 700,
            lineHeight: 1.5,
            mb: isMobile ? 1 : 1.1,
            flexShrink: 0,
          }}
        >
          Live Activity
        </Typography>

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
            onScroll={handleScroll}
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

            {isFetchingNextPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={20} />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LiveCommitLog;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  IconButton,
  TextField,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import { LinkBox } from '../../../components/common/linkBehavior';
import { useCommitLog } from '../../../api';
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

/** Matches server page size in DashboardApi (useInfiniteCommitLog / /dash/commits) */
const COMMITS_PAGE_SIZE = 15;

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
            <Avatar
              src={`https://avatars.githubusercontent.com/${entry.repository.split('/')[0]}`}
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

  const [statusFilter, setStatusFilter] = useState<CommitStatusFilter>('all');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageInput, setPageInput] = useState('1');

  const apiPage = pageIndex + 1;

  const { data: pageData, isFetching } = useCommitLog(
    { refetchInterval: 10000 },
    apiPage,
    COMMITS_PAGE_SIZE,
  );

  useEffect(() => {
    setPageIndex(0);
  }, [statusFilter]);

  useEffect(() => {
    setPageInput(String(pageIndex + 1));
  }, [pageIndex]);

  const pageEntries = useMemo<CommitLogEntry[]>(
    () => (Array.isArray(pageData) ? pageData : []),
    [pageData],
  );

  /** Exact page count only when this response is the last page (short page). */
  const exactTotalPages = useMemo(() => {
    if (pageData === undefined) return null;
    const len = Array.isArray(pageData) ? pageData.length : 0;
    if (pageIndex === 0 && len === 0) return null;
    if (len < COMMITS_PAGE_SIZE) return pageIndex + 1;
    return null;
  }, [pageData, pageIndex]);

  const visibleEntries = useMemo(
    () =>
      [...pageEntries]
        .filter(
          (entry) =>
            statusFilter === 'all' || getCommitStatus(entry) === statusFilter,
        )
        .sort((a, b) => getCommitTimestamp(b) - getCommitTimestamp(a)),
    [pageEntries, statusFilter],
  );

  const hasNextServerPage = pageEntries.length === COMMITS_PAGE_SIZE;
  const hasPrevPage = pageIndex > 0;
  const canGoLast = exactTotalPages !== null && pageIndex < exactTotalPages - 1;

  const commitPageInput = useCallback(() => {
    let parsed = Number.parseInt(pageInput.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setPageInput(String(pageIndex + 1));
      return;
    }
    if (exactTotalPages !== null) {
      parsed = Math.min(parsed, exactTotalPages);
    }
    setPageIndex(parsed - 1);
  }, [exactTotalPages, pageIndex, pageInput]);

  const hasAnyRowsOnServer = pageEntries.length > 0;
  const awaitingFirstPayload = pageData === undefined && isFetching;
  const showInitialLoading = pageIndex === 0 && awaitingFirstPayload;
  const showInnerPageLoading = pageIndex > 0 && awaitingFirstPayload;
  const showWaitingForActivity =
    pageIndex === 0 &&
    !awaitingFirstPayload &&
    !isFetching &&
    Array.isArray(pageData) &&
    pageData.length === 0;
  const showFilteredEmptyState =
    hasAnyRowsOnServer && visibleEntries.length === 0;

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
            gap={1}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: isMobile ? '0.9rem' : isTablet ? '0.95rem' : '1rem',
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              Live Activity
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.25}
              sx={{
                flexShrink: 0,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <IconButton
                size="small"
                aria-label="First page"
                disabled={pageIndex === 0 || awaitingFirstPayload}
                onClick={() => setPageIndex(0)}
                sx={{
                  color: 'text.secondary',
                  p: 0.35,
                  '&:disabled': { opacity: 0.35 },
                }}
              >
                <FirstPageIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Previous page"
                disabled={!hasPrevPage || awaitingFirstPayload}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                sx={{
                  color: 'text.secondary',
                  p: 0.35,
                  '&:disabled': { opacity: 0.35 },
                }}
              >
                <ChevronLeftIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <TextField
                size="small"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={commitPageInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                disabled={!hasAnyRowsOnServer && !awaitingFirstPayload}
                placeholder="1"
                title="Page number"
                inputProps={{
                  'aria-label': 'Page number',
                  inputMode: 'numeric',
                  min: 1,
                  max: exactTotalPages ?? undefined,
                  style: {
                    textAlign: 'center',
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                    padding: '4px 4px',
                  },
                }}
                sx={{
                  width: 44,
                  mx: 0.25,
                  '& .MuiOutlinedInput-root': {
                    height: 28,
                    backgroundColor: 'background.default',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'border.light',
                  },
                }}
              />
              <IconButton
                size="small"
                aria-label="Next page"
                disabled={!hasNextServerPage || awaitingFirstPayload}
                onClick={() => setPageIndex((p) => p + 1)}
                sx={{
                  color: 'text.secondary',
                  p: 0.35,
                  '&:disabled': { opacity: 0.35 },
                }}
              >
                <ChevronRightIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Last page"
                disabled={!canGoLast || awaitingFirstPayload}
                onClick={() =>
                  exactTotalPages && setPageIndex(exactTotalPages - 1)
                }
                sx={{
                  color: 'text.secondary',
                  p: 0.35,
                  '&:disabled': { opacity: 0.35 },
                }}
              >
                <LastPageIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Stack>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: theme.palette.success.main,
                animation: 'pulse 2s infinite',
                flexShrink: 0,
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
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              pr: 1,
              ...scrollbarSx,
            }}
          >
            {showInnerPageLoading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 6,
                }}
              >
                <CircularProgress size={28} />
              </Box>
            ) : showWaitingForActivity ? (
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

                  return (
                    <CommitLogItem key={entryId} entry={entry} isNew={false} />
                  );
                })}
              </Stack>
            )}

            {isFetching && hasAnyRowsOnServer && (
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

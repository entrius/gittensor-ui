import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import {
  useRepositoryIssues,
  useRepoIssues,
  type RepositoryIssue,
} from '../../api';
import { LinkBox } from '../common/linkBehavior';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import { ScrollAwareTooltip } from '../../components/common/ScrollAwareTooltip';
import { formatTokenAmount } from '../../utils/format';
import {
  getIssueStatusMeta,
  getBountyAmountColor,
  isRepositoryIssueOpen,
  dedupeRepositoryIssues,
} from '../../utils/issueStatus';
import { STATUS_COLORS, TEXT_OPACITY, scrollbarSx } from '../../theme';
import FilterButton from '../FilterButton';

interface RepositoryIssuesTableProps {
  repositoryFullName: string;
}

type IssuesSearchLayout = 'desktop' | 'mdRange' | 'mobile';

/** One search field for all breakpoints (avoids three `TextField` copies + extra `useMemo`s). */
const IssuesSearchTextField: React.FC<{
  value: string;
  onChange: (next: string) => void;
  layout: IssuesSearchLayout;
  onMobileBlurCollapse?: () => void;
}> = ({ value, onChange, layout, onMobileBlurCollapse }) => {
  const theme = useTheme();
  return (
    <TextField
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search issues"
      autoComplete="off"
      fullWidth={layout === 'mobile'}
      autoFocus={layout === 'mobile'}
      onBlur={
        layout === 'mobile'
          ? () => {
              if (!value.trim()) onMobileBlurCollapse?.();
            }
          : undefined
      }
      sx={{
        '& .MuiOutlinedInput-root': {
          fontSize: '0.82rem',
          borderRadius: '8px',
          backgroundColor: 'surface.subtle',
          '& fieldset': {
            borderColor: theme.palette.border.light,
          },
        },
        ...(layout === 'desktop'
          ? { minWidth: 220, maxWidth: 340 }
          : layout === 'mdRange'
            ? { flex: '1 1 160px', minWidth: 160, maxWidth: 280 }
            : {}),
      }}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <SearchIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
          </InputAdornment>
        ),
      }}
    />
  );
};

const RepositoryIssuesTable: React.FC<RepositoryIssuesTableProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  /** `md` and up (900px+): title row + filters + search field in one toolbar. */
  const useWideIssuesToolbar = useMediaQuery(theme.breakpoints.up('md'), {
    noSsr: true,
  });
  /** Below `sm` (<600px): title row + search icon; tap to expand field below. */
  const isXsPhone = useMediaQuery(theme.breakpoints.down('sm'), {
    noSsr: true,
  });
  const { data: issuesRaw, isLoading } =
    useRepositoryIssues(repositoryFullName);
  const issues = useMemo(
    () => (issuesRaw ? dedupeRepositoryIssues(issuesRaw) : undefined),
    [issuesRaw],
  );
  const { data: bounties } = useRepoIssues(repositoryFullName);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const showPhoneExpandedSearch =
    isXsPhone && (isMobileSearchOpen || !!searchQuery.trim());

  const counts = useMemo(() => {
    if (!issues) return { total: 0, open: 0, closed: 0 };
    let open = 0;
    for (const issue of issues) {
      if (isRepositoryIssueOpen(issue)) open += 1;
    }
    const total = issues.length;
    return { total, open, closed: total - open };
  }, [issues]);

  /** Avoid O(bounties × issues) `.find` per bounty row. */
  const issueTitleByRepoAndNumber = useMemo(() => {
    if (!issues) return null;
    const m = new Map<string, string>();
    for (const i of issues) {
      m.set(`${i.repositoryFullName}:${i.number}`, i.title ?? '');
    }
    return m;
  }, [issues]);

  /** Denominator for the title ("n of m") matches `counts`, no extra filter pass. */
  const statusMatchLength =
    filter === 'open'
      ? counts.open
      : filter === 'closed'
        ? counts.closed
        : counts.total;

  /** Single pipeline: status filter → search → sort (one copy + sort). */
  const sortedVisibleIssues = useMemo(() => {
    if (!issues) return [];
    let list =
      filter === 'open'
        ? issues.filter((issue) => isRepositoryIssueOpen(issue))
        : filter === 'closed'
          ? issues.filter((issue) => !isRepositoryIssueOpen(issue))
          : issues;

    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (trimmedQuery) {
      list = list.filter((issue) => {
        const issueNumber = String(issue.number);
        const title = issue.title?.toLowerCase() ?? '';
        const author = issue.author?.toLowerCase() ?? '';
        return (
          issueNumber.includes(trimmedQuery) ||
          title.includes(trimmedQuery) ||
          author.includes(trimmedQuery)
        );
      });
    }

    return [...list].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [issues, filter, searchQuery]);

  const titleText = useMemo(() => {
    if (!searchQuery.trim()) return `Issues (${statusMatchLength})`;
    return `Issues (${sortedVisibleIssues.length} of ${statusMatchLength})`;
  }, [searchQuery, sortedVisibleIssues.length, statusMatchLength]);

  const emptyMessage = useMemo(() => {
    if ((issues?.length ?? 0) > 0 && sortedVisibleIssues.length === 0) {
      return searchQuery.trim()
        ? 'No issues match your search'
        : 'No issues match this filter';
    }
    return 'No issues found';
  }, [issues?.length, sortedVisibleIssues.length, searchQuery]);

  const handleRowClick = useCallback((issue: RepositoryIssue) => {
    window.open(
      `https://github.com/${issue.repositoryFullName}/issues/${issue.number}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, []);

  const columns: DataTableColumn<RepositoryIssue>[] = useMemo(
    () => [
      {
        key: 'number',
        header: 'Issue #',
        renderCell: (issue) => (
          <a
            href={`https://github.com/${issue.repositoryFullName}/issues/${issue.number}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              fontWeight: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            #{issue.number}
          </a>
        ),
      },
      {
        key: 'title',
        header: 'Title',
        renderCell: (issue) => (
          <ScrollAwareTooltip
            title={issue.title}
            arrow
            placement="top-start"
            enterDelay={200}
          >
            <Box
              sx={{
                maxWidth: '400px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {issue.title}
            </Box>
          </ScrollAwareTooltip>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        renderCell: (issue) => {
          const isOpen = isRepositoryIssueOpen(issue);
          return (
            <Chip
              variant="status"
              icon={isOpen ? <RadioButtonUncheckedIcon /> : <CheckCircleIcon />}
              label={isOpen ? 'OPEN' : 'CLOSED'}
              sx={{
                color: isOpen ? STATUS_COLORS.open : STATUS_COLORS.merged,
                borderColor: isOpen ? STATUS_COLORS.open : STATUS_COLORS.merged,
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          );
        },
      },
      {
        key: 'linkedPr',
        header: 'Linked PR',
        renderCell: (issue) =>
          issue.prNumber ? (
            <a
              href={`https://github.com/${issue.repositoryFullName}/pull/${issue.prNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: STATUS_COLORS.info,
                textDecoration: 'none',
                fontWeight: 500,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              #{issue.prNumber}
            </a>
          ) : (
            <span
              style={{
                color: alpha(theme.palette.common.white, TEXT_OPACITY.faint),
              }}
            >
              -
            </span>
          ),
      },
      {
        key: 'created',
        header: 'Created',
        align: 'right',
        renderCell: (issue) =>
          issue.createdAt
            ? new Date(issue.createdAt).toLocaleDateString()
            : '-',
      },
      {
        key: 'closed',
        header: 'Closed',
        align: 'right',
        renderCell: (issue) =>
          issue.closedAt ? new Date(issue.closedAt).toLocaleDateString() : '-',
      },
    ],
    [theme],
  );

  const filterButtons = useMemo(
    () => (
      <Stack direction="row" spacing={1}>
        <FilterButton
          label="All"
          isActive={filter === 'all'}
          onClick={() => setFilter('all')}
          count={counts.total}
          color={STATUS_COLORS.open}
          activeTextColor="text.primary"
        />
        <FilterButton
          label="Open"
          isActive={filter === 'open'}
          onClick={() => setFilter('open')}
          count={counts.open}
          color={STATUS_COLORS.open}
          activeTextColor="text.primary"
        />
        <FilterButton
          label="Closed"
          isActive={filter === 'closed'}
          onClick={() => setFilter('closed')}
          count={counts.closed}
          color={STATUS_COLORS.merged}
          activeTextColor="text.primary"
        />
      </Stack>
    ),
    [filter, counts.total, counts.open, counts.closed],
  );

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            Issues
          </Typography>
        </Box>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  const mobileSearchIconButton = (
    <IconButton
      aria-label="Open issue search"
      onClick={() => setIsMobileSearchOpen(true)}
      sx={{
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: '8px',
        backgroundColor: 'surface.subtle',
        color: 'text.secondary',
        width: 36,
        height: 36,
        flexShrink: 0,
      }}
    >
      <SearchIcon sx={{ fontSize: 18 }} />
    </IconButton>
  );

  const headerToolbar = (
    <Box
      sx={{
        p: 3,
        borderBottom: `1px solid ${theme.palette.border.light}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {useWideIssuesToolbar ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: 'text.primary', fontSize: '1.1rem', fontWeight: 500 }}
          >
            {titleText}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            {filterButtons}
            <IssuesSearchTextField
              value={searchQuery}
              onChange={setSearchQuery}
              layout="desktop"
            />
          </Box>
        </Box>
      ) : isXsPhone ? (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              width: '100%',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 500,
              }}
            >
              {titleText}
            </Typography>
            {!showPhoneExpandedSearch ? mobileSearchIconButton : null}
          </Box>
          <Box
            sx={{
              width: '100%',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              ...scrollbarSx,
            }}
          >
            <Box sx={{ width: 'max-content' }}>{filterButtons}</Box>
          </Box>
          {showPhoneExpandedSearch ? (
            <IssuesSearchTextField
              value={searchQuery}
              onChange={setSearchQuery}
              layout="mobile"
              onMobileBlurCollapse={() => setIsMobileSearchOpen(false)}
            />
          ) : null}
        </>
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              width: '100%',
              minWidth: 0,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 500,
                flexShrink: 0,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                pr: 1,
              }}
            >
              {titleText}
            </Typography>
            <IssuesSearchTextField
              value={searchQuery}
              onChange={setSearchQuery}
              layout="mdRange"
            />
          </Box>
          <Box
            sx={{
              width: '100%',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              ...scrollbarSx,
            }}
          >
            <Box sx={{ width: 'max-content' }}>{filterButtons}</Box>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {bounties && bounties.length > 0 && (
        <Card
          sx={{
            borderRadius: 3,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundColor: 'transparent',
            p: 0,
            overflow: 'hidden',
          }}
          elevation={0}
        >
          <Box
            sx={{
              p: 3,
              borderBottom: `1px solid ${theme.palette.border.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 500,
              }}
            >
              Bounties ({bounties.length})
            </Typography>
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {bounties.map((bounty) => {
              const meta = getIssueStatusMeta(bounty.status);
              const titleKey = `${bounty.repositoryFullName}:${bounty.issueNumber}`;
              const linkedTitle =
                issueTitleByRepoAndNumber?.get(titleKey) ??
                `${repositoryFullName}#${bounty.issueNumber}`;
              return (
                <LinkBox
                  key={bounty.id}
                  href={`/bounties/details?id=${bounty.id}`}
                  linkState={{ backLabel: `Back to ${repositoryFullName}` }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                    backgroundColor: 'surface.subtle',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'surface.light',
                      borderColor: alpha(theme.palette.common.white, 0.15),
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      minWidth: 0,
                    }}
                  >
                    <Chip
                      label={meta.text}
                      size="small"
                      sx={{
                        backgroundColor: meta.bgColor,
                        color: meta.color,
                        border: `1px solid ${meta.borderColor}`,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        height: '22px',
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                    <Typography
                      sx={{
                        color: STATUS_COLORS.open,
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      #{bounty.issueNumber}
                    </Typography>
                    <Typography
                      sx={{
                        color: 'text.primary',
                        fontSize: '0.85rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {linkedTitle}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        color: getBountyAmountColor(
                          bounty.status,
                          alpha(theme.palette.common.white, TEXT_OPACITY.muted),
                        ),
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      {`${formatTokenAmount(bounty.targetBounty)} ل`}
                    </Typography>
                    <ArrowForwardIcon
                      sx={{
                        color: alpha(
                          theme.palette.common.white,
                          TEXT_OPACITY.ghost,
                        ),
                        fontSize: 16,
                      }}
                    />
                  </Box>
                </LinkBox>
              );
            })}
          </Box>
        </Card>
      )}

      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: 'transparent',
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Restructure so only the body scrolls — the header sits above the
          // scroll area, so the scrollbar never appears next to the header row.
          '& .MuiTableContainer-root': {
            overflow: 'visible',
          },
          '& .MuiTable-root': {
            display: 'block',
          },
          '& .MuiTableHead-root': {
            display: 'block',
            // Reserve space matching the body's scrollbar gutter so columns line up.
            paddingRight: '8px',
            backgroundColor: theme.palette.surface.tooltip,
          },
          '& .MuiTableHead-root .MuiTableRow-root': {
            display: 'table',
            tableLayout: 'fixed',
            width: '100%',
          },
          '& .MuiTableBody-root': {
            display: 'block',
            maxHeight: '500px',
            overflowY: 'auto',
            scrollbarGutter: 'stable',
            ...scrollbarSx,
          },
          '& .MuiTableBody-root .MuiTableRow-root': {
            display: 'table',
            tableLayout: 'fixed',
            width: '100%',
          },
        }}
        elevation={0}
      >
        <DataTable<RepositoryIssue>
          columns={columns}
          rows={sortedVisibleIssues}
          getRowKey={(issue) => `${issue.repositoryFullName}:${issue.number}`}
          stickyHeader
          size="medium"
          header={headerToolbar}
          emptyState={
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography
                sx={{
                  color: alpha(
                    theme.palette.common.white,
                    TEXT_OPACITY.tertiary,
                  ),
                  fontSize: '0.9rem',
                }}
              >
                {emptyMessage}
              </Typography>
            </Box>
          }
          onRowClick={handleRowClick}
        />
      </Card>
    </Box>
  );
};

export default RepositoryIssuesTable;

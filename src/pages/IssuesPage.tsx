import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Box,
  Tab,
  Tabs,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { IssuesList, BountySidebar } from '../components/issues';
import {
  FILTER_ORDER,
  FILTER_LABELS,
  type FilterType,
} from '../components/issues/IssuesList';
import { useIssuesStats, useIssues } from '../api';
import { useTwitterStickySidebar } from '../hooks/useTwitterStickySidebar';
import { TEXT_OPACITY } from '../theme';

const ISSUE_LINK_STATE = { backLabel: 'Back to Bounties' } as const;
const getIssueHref = (id: number) => `/bounties/details?id=${id}`;

/** Ignore subpixel noise when comparing scroll vs client widths. */
const LAYOUT_OVERFLOW_TOLERANCE_PX = 1;
/** Skip measurement until the tab bar has a usable width. */
const ISSUE_TABS_MIN_MEASURE_WIDTH_PX = 32;
/** Muted hover wash on tab rows (not in TEXT_OPACITY — tuned for dark tabs). */
const ISSUE_TAB_HOVER_BG_ALPHA = 0.04;

function elementHasHorizontalOverflow(
  el: HTMLElement,
  tolerancePx: number,
): boolean {
  return el.scrollWidth > el.clientWidth + tolerancePx;
}

const IssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const showSidebarRight = useMediaQuery(theme.breakpoints.up('xl'));
  const stickySidebarRef = useTwitterStickySidebar();

  // Redirect legacy path-based tabs to query params
  useEffect(() => {
    if (
      tabParam === 'available' ||
      tabParam === 'pending' ||
      tabParam === 'history'
    ) {
      navigate(`/bounties?filter=${tabParam}`, { replace: true });
    }
  }, [tabParam, navigate]);

  const filterType = useMemo<FilterType>(() => {
    const f = searchParams.get('filter');
    if (f === 'available' || f === 'pending' || f === 'history') return f;
    return 'all';
  }, [searchParams]);

  const handleTabChange = useCallback(
    (_e: React.SyntheticEvent, value: FilterType) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (value === 'all') params.delete('filter');
          else params.set('filter', value);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const statsQuery = useIssuesStats();
  const { data, isLoading } = useIssues();
  const allIssues = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      all: allIssues.length,
      available: allIssues.filter((i) => i.status === 'active').length,
      pending: allIssues.filter((i) => i.status === 'registered').length,
      history: allIssues.filter(
        (i) => i.status === 'completed' || i.status === 'cancelled',
      ).length,
    }),
    [allIssues],
  );

  const issueTabsRef = useRef<HTMLDivElement>(null);
  /** When true, tabs share the row evenly (full-width look). When false, row scrolls horizontally. */
  const [issueTabsFillRow, setIssueTabsFillRow] = useState(false);

  const measureIssueTabsLayout = useCallback(() => {
    const root = issueTabsRef.current;
    if (!root) return;
    const scroller = root.querySelector(
      '.MuiTabs-scroller',
    ) as HTMLElement | null;
    if (!scroller || scroller.clientWidth < ISSUE_TABS_MIN_MEASURE_WIDTH_PX)
      return;

    const scrollerOverflow = elementHasHorizontalOverflow(
      scroller,
      LAYOUT_OVERFLOW_TOLERANCE_PX,
    );
    let anyTabTruncated = false;
    root.querySelectorAll('.MuiTab-root').forEach((node) => {
      const el = node as HTMLElement;
      if (elementHasHorizontalOverflow(el, LAYOUT_OVERFLOW_TOLERANCE_PX)) {
        anyTabTruncated = true;
      }
    });

    setIssueTabsFillRow(!scrollerOverflow && !anyTabTruncated);
  }, []);

  useLayoutEffect(() => {
    measureIssueTabsLayout();
    const root = issueTabsRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measureIssueTabsLayout());
    ro.observe(root);
    return () => ro.disconnect();
  }, [measureIssueTabsLayout, filterType, counts]);

  return (
    <Page title="Issue Bounties">
      <SEO
        title="Issue Bounties"
        description="Browse GitHub issues with Alpha bounties. Solve issues and earn rewards on Gittensor."
      />
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: showSidebarRight ? 'row' : 'column',
          alignItems: showSidebarRight ? 'flex-start' : 'stretch',
          gap: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 1.5 },
            minWidth: 0,
            pr: showSidebarRight ? 1 : 0,
            minHeight: showSidebarRight ? 'calc(100vh - 88px)' : 'auto',
          }}
        >
          {/* Status tabs */}
          <Box
            sx={{
              borderBottom: '1px solid',
              borderColor: 'border.light',
              position: 'sticky',
              top: 64,
              zIndex: 50,
              backgroundColor: (t) => alpha(t.palette.background.default, 0.85),
              backdropFilter: 'blur(12px)',
            }}
          >
            <Tabs
              ref={issueTabsRef}
              value={filterType}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons={false}
              sx={(t) => ({
                minHeight: 52,
                '& .MuiTabs-scroller': {
                  WebkitOverflowScrolling: 'touch',
                },
                ...(issueTabsFillRow && {
                  '& .MuiTabs-flexContainer': {
                    width: '100%',
                  },
                }),
                '& .MuiTab-root': {
                  minHeight: 52,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: '0.01em',
                  color: alpha(t.palette.text.primary, TEXT_OPACITY.tertiary),
                  transition: 'color 0.2s, background-color 0.2s',
                  ...(issueTabsFillRow
                    ? {
                        flex: '1 1 0',
                        minWidth: 0,
                        maxWidth: 'none',
                      }
                    : {
                        flexShrink: 0,
                        minWidth: 'auto',
                        px: 1.5,
                      }),
                  '&:hover': {
                    backgroundColor: alpha(
                      t.palette.text.primary,
                      ISSUE_TAB_HOVER_BG_ALPHA,
                    ),
                    color: alpha(
                      t.palette.text.primary,
                      TEXT_OPACITY.secondary,
                    ),
                  },
                  '&.Mui-selected': {
                    color: t.palette.text.primary,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: t.palette.primary.main,
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              })}
            >
              {FILTER_ORDER.map((f) => (
                <Tab
                  key={f}
                  value={f}
                  label={
                    <Badge
                      badgeContent={counts[f]}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.65rem',
                          minWidth: 18,
                          height: 18,
                        },
                      }}
                    >
                      <Box sx={{ pr: counts[f] > 0 ? 1.5 : 0 }}>
                        {FILTER_LABELS[f]}
                      </Box>
                    </Badge>
                  }
                />
              ))}
            </Tabs>
          </Box>

          <IssuesList
            issues={allIssues}
            isLoading={isLoading}
            getIssueHref={getIssueHref}
            linkState={ISSUE_LINK_STATE}
          />
        </Box>
        <Box
          ref={showSidebarRight ? stickySidebarRef : undefined}
          sx={{
            width: showSidebarRight ? 340 : '100%',
            flexShrink: 0,
            position: showSidebarRight ? 'sticky' : 'static',
            top: showSidebarRight ? 88 : 'auto',
          }}
        >
          <BountySidebar
            issues={allIssues}
            stats={statsQuery.data}
            isLoading={isLoading}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default IssuesPage;

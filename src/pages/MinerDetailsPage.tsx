import React from 'react';
import { Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { Box, Tab, Tabs, Typography, alpha } from '@mui/material';
import { Page } from '../components/layout';
import { LinkBox } from '../components/common/linkBehavior';
import {
  BackButton,
  MinerActivity,
  MinerNextSteps,
  MinerOpenDiscoveryIssuesByRepo,
  MinerPRsTable,
  MinerProfileHero,
  MinerRepositoryPanel,
  MinerStatBand,
  SEO,
} from '../components';
import { WatchlistButton } from '../components/common';
import { useMinerStats } from '../api';

type ViewMode = 'prs' | 'issues';

const PR_TABS = ['pull-requests', 'activity'] as const;
const ISSUE_TABS = ['open-issues', 'activity'] as const;
type MinerDetailsTab = (typeof PR_TABS)[number] | (typeof ISSUE_TABS)[number];

// Offset so smooth-scrolled sections clear the sticky global search bar
// (see AppLayout) instead of landing flush under it.
const sectionAnchorSx = { scrollMarginTop: { xs: 72, md: 88 } } as const;

// Segmented-pill tab styling — matches the OSS/Discovery + range switches:
// no underline indicator, the active tab is a raised elevated pill with bold
// white text, inactive tabs are muted grey.
const tabsAlignSx = {
  minHeight: 0,
  border: '1px solid',
  borderColor: 'border.light',
  borderRadius: 2,
  p: 0.5,
  '& .MuiTabs-indicator': { display: 'none' },
  '& .MuiTabs-flexContainer': { gap: 0.5 },
  '& .MuiTab-root': {
    minHeight: 0,
    minWidth: 0,
    textTransform: 'none' as const,
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'text.secondary',
    px: { xs: 1.5, sm: 2 },
    py: 0.6,
    borderRadius: 1.5,
    border: '1px solid transparent',
    transition: 'all 0.2s',
    '&:hover': { color: 'text.primary', backgroundColor: 'surface.light' },
    '&.Mui-selected': {
      color: 'text.primary',
      fontWeight: 700,
      backgroundColor: 'surface.elevated',
      borderColor: 'border.medium',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
    },
  },
};

// Time-range options for the contributions toolbar. 30D is the default (and the
// widest, matching the subnet's ~30-day PR scoring window).
const RANGES = [
  { label: '1D', value: '1d', days: 1 },
  { label: '7D', value: '7d', days: 7 },
  { label: '30D', value: '30d', days: 30 },
] as const;

/** Small segmented (pill) toggle built from router links — used for both the
 *  OSS/Discovery track and the 1D/7D/30D range. */
const Segmented: React.FC<{
  ariaLabel: string;
  options: ReadonlyArray<{ label: string; href: string; active: boolean }>;
}> = ({ ariaLabel, options }) => (
  <Box
    role="group"
    aria-label={ariaLabel}
    sx={{
      display: 'inline-flex',
      gap: 0.5,
      border: '1px solid',
      borderColor: 'border.light',
      p: 0.5,
      borderRadius: 2,
    }}
  >
    {options.map((o) => (
      <LinkBox
        key={o.label}
        href={o.href}
        replace
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.6,
          borderRadius: 1.5,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: o.active ? 'border.medium' : 'transparent',
          backgroundColor: o.active ? 'surface.elevated' : 'transparent',
          boxShadow: o.active ? '0 1px 2px rgba(0, 0, 0, 0.45)' : 'none',
          color: o.active
            ? 'text.primary'
            : (t) => alpha(t.palette.text.primary, 0.45),
          transition: 'all 0.2s',
          '&:hover': {
            color: 'text.primary',
            backgroundColor: o.active
              ? 'surface.elevated'
              : (t) => alpha(t.palette.text.primary, 0.04),
          },
        }}
      >
        <Typography
          sx={{
            fontSize: '0.8rem',
            fontWeight: o.active ? 700 : 500,
            whiteSpace: 'nowrap',
          }}
        >
          {o.label}
        </Typography>
      </LinkBox>
    ))}
  </Box>
);

const MinerDetailsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const githubId = searchParams.get('githubId');

  const modeParam = searchParams.get('mode');
  const viewMode: ViewMode = modeParam === 'issues' ? 'issues' : 'prs';

  const tabs = viewMode === 'issues' ? ISSUE_TABS : PR_TABS;
  const defaultTab: MinerDetailsTab = tabs[0];

  const buildModeHref = (mode: ViewMode) => {
    const p = new URLSearchParams(searchParams);
    p.set('mode', mode);
    // Drop the tab param so the new mode lands on its own first tab —
    // PR and issue modes have disjoint first tabs.
    p.delete('tab');
    return `${location.pathname}?${p.toString()}`;
  };

  // Time range for the contributions (PR/issue lists + activity). Defaults to
  // the widest window (30D).
  const rangeParam = searchParams.get('range');
  const activeRange =
    RANGES.find((r) => r.value === rangeParam) ?? RANGES[RANGES.length - 1];
  const rangeDays = activeRange.days;

  const buildRangeHref = (value: string) => {
    const p = new URLSearchParams(searchParams);
    p.set('range', value);
    return `${location.pathname}?${p.toString()}`;
  };

  const tabParam = searchParams.get('tab');
  const activeTab: MinerDetailsTab =
    tabParam && (tabs as readonly string[]).includes(tabParam)
      ? (tabParam as MinerDetailsTab)
      : defaultTab;

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: MinerDetailsTab,
  ) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', newValue);
    setSearchParams(p, { replace: true });
  };

  const { data: minerStats, isLoading: isLoadingMinerStats } = useMinerStats(
    githubId ?? '',
  );
  // Only show the star once we've confirmed the miner exists — otherwise
  // users can pin phantom entries via /miners/details?githubId=<anything>.
  const minerExists = !isLoadingMinerStats && !!minerStats;

  if (!githubId) {
    return <Navigate to="/repositories" replace />;
  }

  return (
    <Page title="Miner Dashboard">
      <SEO
        title={`Miner Dashboard - ${githubId}`}
        description={`Track earnings, unlock progress, contribution quality, and performance for miner ${githubId}.`}
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'center',
          py: { xs: 1.5, sm: 2.5 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            width: '100%',
            maxWidth: 1320,
            px: { xs: 2, md: 0 },
          }}
        >
          {/* ── Back (icon button) ───────────────────────────────── */}
          <BackButton to="/repositories" />

          {/* ── Identity header (watch action pinned top-right) ──── */}
          <MinerProfileHero
            githubId={githubId}
            action={
              minerExists ? (
                <WatchlistButton
                  category="miners"
                  itemKey={githubId}
                  size="medium"
                />
              ) : undefined
            }
          />

          {/* ── Headline performance band (with peer percentiles) ── */}
          <MinerStatBand githubId={githubId} />

          {/* ── What to do next — the prioritised action list ────── */}
          <MinerNextSteps githubId={githubId} />

          {/* ── Track toggle — governs the repositories table and the
              contribution tabs below (not the hero / next-steps / risk). */}
          <Box sx={{ mt: 0.5 }}>
            <Segmented
              ariaLabel="Contribution track"
              options={[
                {
                  label: 'OSS Contributions',
                  href: buildModeHref('prs'),
                  active: viewMode === 'prs',
                },
                {
                  label: 'Issue Discovery',
                  href: buildModeHref('issues'),
                  active: viewMode === 'issues',
                },
              ]}
            />
          </Box>

          {/* ── Repositories — standing + unlock progress ────────── */}
          <Box id="repositories" sx={sectionAnchorSx}>
            <MinerRepositoryPanel githubId={githubId} viewMode={viewMode} />
          </Box>

          {/* ── Contribution detail: tabs (left) · range (right) ───
              The 1D/7D/30D range filters these contribution lists and the
              activity heatmap by date. */}
          <Box
            id="contributions"
            sx={{
              ...sectionAnchorSx,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="standard"
              sx={tabsAlignSx}
            >
              {viewMode === 'issues' ? (
                <Tab value="open-issues" label="Open Issues" />
              ) : (
                <Tab value="pull-requests" label="Pull Requests" />
              )}
              <Tab value="activity" label="Activity" />
            </Tabs>
            <Box sx={{ flexShrink: 0 }}>
              <Segmented
                ariaLabel="Time range"
                options={RANGES.map((r) => ({
                  label: r.label,
                  href: buildRangeHref(r.value),
                  active: r.value === activeRange.value,
                }))}
              />
            </Box>
          </Box>

          <Box>
            {activeTab === 'pull-requests' && viewMode === 'prs' && (
              <MinerPRsTable githubId={githubId} rangeDays={rangeDays} />
            )}
            {activeTab === 'open-issues' && viewMode === 'issues' && (
              <MinerOpenDiscoveryIssuesByRepo
                githubId={githubId}
                rangeDays={rangeDays}
              />
            )}
            {activeTab === 'activity' && (
              <MinerActivity
                githubId={githubId}
                viewMode={viewMode}
                rangeDays={rangeDays}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default MinerDetailsPage;

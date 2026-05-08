import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Collapse,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';

import {
  type IssueBounty,
  type IssuesStats,
  type IssueSubmission,
} from '../../api';
import { LinkBox } from '../common/linkBehavior';
import { SectionCard } from '../leaderboard/SectionCard';
import { StatRow } from '../leaderboard/ActivitySidebarCards';
import { FONTS } from '../leaderboard/types';
import { CHART_COLORS, CREDIBILITY_COLORS, STATUS_COLORS } from '../../theme';
import { getGithubAvatarSrc, parseNumber } from '../../utils';
import { formatAlphaToUsd, formatTokenAmount } from '../../utils/format';
import { usePrices } from '../../hooks/usePrices';

type FilterType = 'all' | 'available' | 'pending' | 'history';

interface BountySidebarProps {
  issues: IssueBounty[];
  stats?: IssuesStats;
  isLoading?: boolean;
}

const truncateHotkey = (hotkey: string | null | undefined) => {
  if (!hotkey) return '—';
  if (hotkey.length <= 12) return hotkey;
  return `${hotkey.slice(0, 6)}…${hotkey.slice(-4)}`;
};

interface HunterRow {
  rank: number;
  authorLogin: string;
  authorGithubId: string | null;
  hotkey: string | null;
  count: number;
  totalAlpha: number;
}

const TOP_HUNTERS_FETCH_LIMIT = 50;

const fetchIssueSubmissions = async (
  id: number,
): Promise<IssueSubmission[]> => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  const path = `/issues/${id}/submissions`;
  const url = baseUrl ? `${baseUrl}${path}` : path;
  const { data } = await axios.get<IssueSubmission[]>(url);
  return data;
};

/**
 * Aggregates winning miners across recent completed bounties.
 *
 * For each completed bounty we fetch its `/issues/{id}/submissions`, find the
 * row with `isWinner: true`, and tally its `authorLogin` plus the bounty's
 * paid `bountyAmount`. Cache key matches `useIssueSubmissions` so the bounty
 * details page re-uses these fetches.
 */
const useTopBountyHunters = (
  issues: IssueBounty[],
  topN: number,
): { hunters: HunterRow[]; isLoading: boolean } => {
  const completedBounties = useMemo(() => {
    return issues
      .filter((i) => i.status === 'completed')
      .sort((a, b) => {
        const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, TOP_HUNTERS_FETCH_LIMIT);
  }, [issues]);

  const queries = useQueries({
    queries: completedBounties.map((b) => ({
      queryKey: [
        'useIssueSubmissions',
        `/issues/${b.id}/submissions`,
        undefined,
      ] as const,
      queryFn: () => fetchIssueSubmissions(b.id),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const isLoading =
    completedBounties.length > 0 && queries.some((q) => q.isLoading);

  type Acc = {
    authorLogin: string;
    authorGithubId: string | null;
    hotkey: string | null;
    count: number;
    totalAlpha: number;
  };
  const byAuthor = new Map<string, Acc>();
  completedBounties.forEach((bounty, idx) => {
    const submissions = queries[idx]?.data;
    if (!submissions) return;
    const winner = submissions.find((s) => s.isWinner);
    if (!winner || !winner.authorLogin) return;
    // For completed bounties the actual payout is held in `targetBounty`
    // (the goal that was met). `bountyAmount` may decrement to 0 once paid.
    // Use `targetBounty` first, fall back to `bountyAmount` if missing.
    const paid =
      parseNumber(bounty.targetBounty) || parseNumber(bounty.bountyAmount);
    const key = winner.authorLogin;
    const existing = byAuthor.get(key) ?? {
      authorLogin: winner.authorLogin,
      authorGithubId: winner.authorGithubId,
      hotkey: winner.hotkey,
      count: 0,
      totalAlpha: 0,
    };
    existing.count += 1;
    existing.totalAlpha += paid;
    byAuthor.set(key, existing);
  });

  const hunters = [...byAuthor.values()]
    .sort((a, b) => {
      if (a.totalAlpha !== b.totalAlpha) return b.totalAlpha - a.totalAlpha;
      return b.count - a.count;
    })
    .slice(0, topN)
    .map((h, i) => ({ ...h, rank: i + 1 }));

  return { hunters, isLoading };
};

/* ------------------------------------------------------------------
 * Filters panel — collapsible shell that hosts a Portal target.
 * IssuesList portals its full toolbar (status/view/search/rows/chart)
 * into this panel on lg+ screens; the in-table top header is suppressed.
 * ------------------------------------------------------------------ */

const FilterSection: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  const filterType = useMemo<FilterType>(() => {
    const f = searchParams.get('filter');
    if (f === 'available' || f === 'pending' || f === 'history') return f;
    return 'all';
  }, [searchParams]);

  const hasActiveFilter = filterType !== 'all';

  return (
    <Box
      sx={{
        display: { xs: 'none', xl: 'flex' },
        flexDirection: 'column',
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'background.default',
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        sx={(t) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: 0,
          background: 'none',
          cursor: 'pointer',
          p: 0,
          color: t.palette.text.primary,
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <TuneOutlinedIcon
            sx={{ fontSize: '1rem', color: 'text.secondary' }}
          />
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Filters
          </Typography>
          {hasActiveFilter && (
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'status.info',
              }}
            />
          )}
        </Box>
        <KeyboardArrowDownIcon
          sx={{
            fontSize: '1.1rem',
            color: 'text.secondary',
            transform: open ? 'rotate(-180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </Box>
      <Collapse in={open}>
        <Box
          id="tabs-options-portal"
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}
        />
      </Collapse>
    </Box>
  );
};

/* ------------------------------------------------------------------
 * Completion-rate donut — matches top-miners ActivityDonutCard pattern
 * ------------------------------------------------------------------ */

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

const rateColor = (rate: number) =>
  rate >= 80
    ? CREDIBILITY_COLORS.excellent
    : rate >= 50
      ? CREDIBILITY_COLORS.moderate
      : STATUS_COLORS.closed;

const ActivityLegendRow: React.FC<{ segment: DonutSegment }> = ({
  segment,
}) => (
  <Box
    sx={(theme) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1,
      py: 0.55,
      borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`,
      '&:last-of-type': { borderBottom: 'none' },
    })}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: segment.color,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.78rem',
          color: STATUS_COLORS.open,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {segment.label}
      </Typography>
    </Box>
    <Typography
      sx={(theme) => ({
        fontFamily: FONTS.mono,
        fontSize: '0.9rem',
        fontWeight: 700,
        color: theme.palette.text.primary,
      })}
    >
      {segment.value.toLocaleString()}
    </Typography>
  </Box>
);

/* ------------------------------------------------------------------
 * Bounty Pool & Total Payouts — replaces the old top-of-page IssueStats.
 * Two tile values, matching `MinerStatusTile` density.
 * ------------------------------------------------------------------ */

const PoolPayoutsCard: React.FC<{ stats?: IssuesStats }> = ({ stats }) => {
  const tiles = [
    { label: 'Bounty Pool', amount: stats?.totalBountyPool },
    {
      label: 'Total Payouts',
      amount: stats?.totalPayouts,
      valueColor: STATUS_COLORS.merged,
    },
  ];

  return (
    <SectionCard title="Pool & Payouts" sx={{ flexShrink: 0 }}>
      <Box sx={{ px: 2, pt: 1, pb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            mb: 2,
          }}
        >
          {tiles.map((t) => {
            return (
              <Box
                key={t.label}
                sx={(theme) => ({
                  p: 1.15,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.border.light}`,
                  backgroundColor: alpha(theme.palette.text.primary, 0.035),
                  minWidth: 0,
                })}
              >
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.68rem',
                    color: STATUS_COLORS.open,
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.75,
                  }}
                >
                  {t.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8 }}>
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: t.valueColor ?? 'text.primary',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatTokenAmount(t.amount)} ل
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
        <StatRow label="All" value={(stats?.totalIssues ?? 0).toLocaleString()} />
      </Box>
    </SectionCard>
  );
};

const CompletionDonut: React.FC<{
  issues: IssueBounty[];
  isLoading: boolean;
}> = ({ issues, isLoading }) => {
  const breakdown = useMemo(() => {
    let registered = 0;
    let active = 0;
    let completed = 0;
    let cancelled = 0;
    for (const i of issues) {
      if (i.status === 'registered') registered += 1;
      else if (i.status === 'active') active += 1;
      else if (i.status === 'completed') completed += 1;
      else if (i.status === 'cancelled') cancelled += 1;
    }
    const total = registered + active + completed + cancelled;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { registered, active, completed, cancelled, total, rate };
  }, [issues]);

  const segments: DonutSegment[] = [
    {
      label: 'Completed',
      value: breakdown.completed,
      color: CHART_COLORS.merged,
    },
    {
      label: 'Available',
      value: breakdown.active,
      color: CHART_COLORS.open,
    },
    {
      label: 'Pending',
      value: breakdown.registered,
      color: STATUS_COLORS.warning,
    },
    {
      label: 'Cancelled',
      value: breakdown.cancelled,
      color: CHART_COLORS.closed,
    },
  ];

  const total = breakdown.total;
  const showSkeleton = isLoading && total === 0;

  return (
    <SectionCard title="Completion Rate" sx={{ flexShrink: 0 }}>
      <Box sx={{ px: 2, pt: 1, pb: 2 }}>
        {showSkeleton ? (
          <Skeleton
            variant="rounded"
            height={108}
            sx={{ borderRadius: 2, mb: 2 }}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.75,
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 92,
                height: 92,
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <ReactECharts
                option={{
                  backgroundColor: 'transparent',
                  series: [
                    {
                      type: 'pie',
                      radius: ['65%', '90%'],
                      silent: true,
                      label: { show: false },
                      itemStyle: { borderRadius: 3, borderWidth: 0 },
                      data:
                        total > 0
                          ? segments.map((segment) => ({
                              value: segment.value,
                              itemStyle: { color: segment.color },
                            }))
                          : [
                              {
                                value: 1,
                                itemStyle: {
                                  color: 'rgba(255,255,255,0.08)',
                                },
                              },
                            ],
                    },
                  ],
                }}
                style={{ width: '100%', height: '100%' }}
                opts={{ renderer: 'svg' }}
              />
              <Box
                sx={(theme) => ({
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  color: theme.palette.text.primary,
                })}
              >
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: rateColor(breakdown.rate),
                    lineHeight: 1,
                  }}
                >
                  {breakdown.rate}%
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.56rem',
                    color: STATUS_COLORS.open,
                    mt: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Completion
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {segments.map((segment) => (
                <ActivityLegendRow key={segment.label} segment={segment} />
              ))}
            </Box>
          </Box>
        )}

        <StatRow label="Total Bounties" value={total.toLocaleString()} />
      </Box>
    </SectionCard>
  );
};

/* ------------------------------------------------------------------
 * Top hunters card (matches LeaderboardRow density)
 * ------------------------------------------------------------------ */

const HuntersHeader: React.FC = () => (
  <Box
    sx={(theme) => ({
      display: 'flex',
      py: 1,
      borderBottom: `1px solid ${theme.palette.border.light}`,
      mb: 1,
    })}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: STATUS_COLORS.open,
        width: 24,
        textTransform: 'uppercase',
      }}
    >
      #
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: STATUS_COLORS.open,
        flex: 1,
        textTransform: 'uppercase',
      }}
    >
      Miner
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: STATUS_COLORS.open,
        textTransform: 'uppercase',
      }}
    >
      Earned
    </Typography>
  </Box>
);

const HunterRowItem: React.FC<{
  hunter: HunterRow;
  taoPrice: number;
  alphaPrice: number;
  hasPrices: boolean;
}> = ({ hunter, taoPrice, alphaPrice, hasPrices }) => {
  const { authorLogin, authorGithubId, hotkey } = hunter;
  const avatarSrc = authorLogin
    ? getGithubAvatarSrc(authorLogin)
    : authorGithubId && /^\d+$/.test(authorGithubId)
      ? `https://avatars.githubusercontent.com/u/${authorGithubId}`
      : '';
  const displayName = authorLogin || truncateHotkey(hotkey);
  const profileHref = authorGithubId
    ? `/miners/details?githubId=${encodeURIComponent(authorGithubId)}`
    : hotkey
      ? `/miners?hotkey=${encodeURIComponent(hotkey)}`
      : '/miners';

  const usdLabel = hasPrices
    ? formatAlphaToUsd(String(hunter.totalAlpha), taoPrice, alphaPrice)
    : null;

  return (
    <LinkBox
      href={profileHref}
      linkState={{ backLabel: 'Back to Bounties' }}
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        py: 1,
        px: 2,
        mx: -2,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: alpha(theme.palette.text.primary, 0.03),
        },
      })}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.85rem',
          color: STATUS_COLORS.open,
          width: 24,
        }}
      >
        {hunter.rank}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flex: 1,
          minWidth: 0,
        }}
      >
        <Avatar src={avatarSrc} sx={{ width: 20, height: 20 }} />
        <Stack spacing={0} sx={{ minWidth: 0 }}>
          <Typography
            sx={(theme) => ({
              fontFamily: FONTS.mono,
              fontSize: '0.85rem',
              color: theme.palette.text.tertiary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            })}
          >
            {displayName}
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              color: STATUS_COLORS.open,
            }}
          >
            {hunter.count} solved
          </Typography>
        </Stack>
      </Box>
      <Stack spacing={0.1} alignItems="flex-end" sx={{ flexShrink: 0, ml: 1 }}>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.95rem',
            color: STATUS_COLORS.merged,
            fontWeight: 600,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}
        >
          {formatTokenAmount(String(hunter.totalAlpha))} ل
        </Typography>
        {usdLabel && (
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              color: STATUS_COLORS.open,
              whiteSpace: 'nowrap',
            }}
          >
            {usdLabel}
          </Typography>
        )}
      </Stack>
    </LinkBox>
  );
};

const TopHuntersSection: React.FC<{
  history: IssueBounty[];
  isLoading: boolean;
}> = ({ history, isLoading }) => {
  const { taoPrice, alphaPrice, hasPrices } = usePrices();
  const { hunters, isLoading: isLoadingHunters } = useTopBountyHunters(
    history,
    5,
  );

  const showSkeleton = (isLoading || isLoadingHunters) && hunters.length === 0;

  return (
    <SectionCard title="Top Bounty Hunters" sx={{ flexShrink: 0 }}>
      <Box sx={{ px: 2, pb: 2 }}>
        <HuntersHeader />
        {showSkeleton ? (
          <Stack spacing={0.85}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={36} />
            ))}
          </Stack>
        ) : hunters.length === 0 ? (
          <Box
            sx={(theme) => ({
              py: 3,
              textAlign: 'center',
              fontFamily: FONTS.mono,
              fontSize: '0.78rem',
              color: alpha(theme.palette.text.primary, 0.42),
            })}
          >
            No bounties solved yet.
          </Box>
        ) : (
          hunters.map((h) => (
            <HunterRowItem
              key={h.authorLogin}
              hunter={h}
              taoPrice={taoPrice}
              alphaPrice={alphaPrice}
              hasPrices={hasPrices}
            />
          ))
        )}
      </Box>
    </SectionCard>
  );
};

/* ------------------------------------------------------------------
 * Public sidebar
 * ------------------------------------------------------------------ */

const BountySidebar: React.FC<BountySidebarProps> = ({
  issues,
  stats,
  isLoading = false,
}) => {
  return (
    <Stack spacing={2} sx={{ alignSelf: 'flex-start' }}>
      <PoolPayoutsCard stats={stats} />
      <FilterSection />
      <CompletionDonut issues={issues} isLoading={isLoading} />
      <TopHuntersSection history={issues} isLoading={isLoading} />
    </Stack>
  );
};

export default BountySidebar;

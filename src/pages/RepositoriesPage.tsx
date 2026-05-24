import React, { useMemo, useRef, useState } from 'react';

import {
  Avatar,
  Box,
  Card,
  Collapse,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import LaunchIcon from '@mui/icons-material/Launch';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

import { LinkBox, useLinkBehavior } from '../components/common/linkBehavior';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { useAllPrs, useReposAndWeights } from '../api';
import { type CommitLog } from '../api/models/Dashboard';
import { getRepositoryOwnerAvatarSrc } from '../utils/avatar';
import { isMergedPr } from '../utils/prStatus';

const FONTS = { mono: '"JetBrains Mono", monospace' } as const;

type SortKey =
  | 'score'
  | 'weight'
  | 'trend'
  | 'totalPRs'
  | 'miners'
  | 'collateral'
  | 'maintainerCut'
  | 'issueShare'
  | 'name';

interface EnrichedRepo {
  repository: string;
  totalScore: number;
  totalPRs: number;
  uniqueMiners: number;
  weight: number; // 0-1
  collateralTotal: number;
  openPRs: number;
  pctIncrease: number; // 7d trend %; 0 if no prior baseline
  authorScores: { author: string; score: number; prs: number }[];
  // Scoring config (from RepositoryConfig)
  maintainerCut: number; // 0-1
  issueDiscoveryShare: number; // 0-1
  defaultLabelMultiplier?: number;
  labelMultipliers: Record<string, number>;
  trustedLabelPipeline: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────
const getAvatarBg = (name: string) => {
  const owner = name.split('/')[0];
  if (owner === 'opentensor')
    return (theme: Theme) => theme.palette.text.primary;
  if (owner === 'bitcoin')
    return (theme: Theme) => theme.palette.status.warningOrange;
  return (theme: Theme) => theme.palette.surface.transparent;
};

const formatScore = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);

const formatRelativeTime = (date: Date) => {
  const now = new Date();
  if (date > now) return 'just now';
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 30) return `${days}d ago`;
  return `${days}d ago`;
};

const compareRepos = (a: EnrichedRepo, b: EnrichedRepo, k: SortKey): number => {
  switch (k) {
    case 'name':
      return a.repository
        .toLowerCase()
        .localeCompare(b.repository.toLowerCase());
    case 'score':
      return b.totalScore - a.totalScore;
    case 'weight':
      return b.weight - a.weight;
    case 'trend':
      return b.pctIncrease - a.pctIncrease;
    case 'totalPRs':
      return b.totalPRs - a.totalPRs;
    case 'miners':
      return b.uniqueMiners - a.uniqueMiners;
    case 'collateral':
      return b.collateralTotal - a.collateralTotal;
    case 'maintainerCut':
      return b.maintainerCut - a.maintainerCut;
    case 'issueShare':
      return b.issueDiscoveryShare - a.issueDiscoveryShare;
  }
};

const getRepoHref = (name: string) =>
  `/miners/repository?name=${encodeURIComponent(name)}`;
const getPrHref = (name: string, number: number) =>
  `/miners/pr?repo=${encodeURIComponent(name)}&number=${number}`;
const getMinerHref = (author: string) =>
  `/miners/details?author=${encodeURIComponent(author)}`;

const REPO_LINK_STATE = { backLabel: 'Back to Repositories' } as const;

// ── Shared row layout & column metadata ───────────────────────────────
const KPI_COLUMNS: { sortKey: SortKey; label: string }[] = [
  { sortKey: 'score', label: 'Score' },
  { sortKey: 'weight', label: 'Weight' },
  { sortKey: 'trend', label: '7d Trend' },
  { sortKey: 'totalPRs', label: 'PRs' },
  { sortKey: 'miners', label: 'Miners' },
  { sortKey: 'collateral', label: 'Open coll.' },
  { sortKey: 'maintainerCut', label: 'Maint cut' },
  { sortKey: 'issueShare', label: 'Issue %' },
];

const ROW_GAP = { xs: 1.5, md: 2 } as const;
const ROW_PX = { xs: 1.5, sm: 2 } as const;
const IDENTITY_FLEX = { xs: '1 1 100%', md: '0 0 170px' } as const;
const ACTIONS_FLEX = '0 0 auto' as const;
const KPI_GRID_TEMPLATE = {
  xs: 'repeat(4, minmax(0, 1fr))',
  md: 'repeat(8, minmax(70px, 1fr))',
} as const;
const KPI_GAP = { xs: 0.5, md: 1.25 } as const;

interface KpiCellProps {
  value: React.ReactNode;
  accent?: 'default' | 'positive' | 'negative';
}

const KpiCell: React.FC<KpiCellProps> = ({ value, accent = 'default' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
    <Typography
      sx={(theme) => ({
        fontFamily: FONTS.mono,
        fontSize: '0.95rem',
        fontWeight: 700,
        color:
          accent === 'positive'
            ? theme.palette.status.success
            : accent === 'negative'
              ? theme.palette.status.error
              : theme.palette.text.primary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      })}
    >
      {value}
    </Typography>
  </Box>
);

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  activeSort: SortKey;
  onSort: (k: SortKey) => void;
}

const SortHeader: React.FC<SortHeaderProps> = ({
  label,
  sortKey,
  activeSort,
  onSort,
}) => {
  const isActive = sortKey === activeSort;
  return (
    <Box
      onClick={() => onSort(sortKey)}
      sx={(theme) => ({
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        color: isActive
          ? theme.palette.text.primary
          : theme.palette.text.tertiary,
        transition: 'color 0.12s',
        userSelect: 'none',
        '&:hover': { color: theme.palette.text.primary },
      })}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: isActive ? 700 : 500,
          color: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      {isActive ? <ArrowDownwardIcon sx={{ fontSize: '0.75rem' }} /> : null}
    </Box>
  );
};

// ── Recent PRs / Top Miners (expansion body) ───────────────────────────
interface RecentPr {
  number: number;
  title: string;
  author?: string;
  mergedAt: Date;
  score: number;
}

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Typography
    sx={(theme) => ({
      fontFamily: FONTS.mono,
      fontSize: '0.68rem',
      fontWeight: 600,
      color: theme.palette.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      mb: 0.75,
      pb: 0.5,
      borderBottom: `1px solid ${theme.palette.border.subtle}`,
    })}
  >
    {children}
  </Typography>
);

interface ExpansionBodyProps {
  repo: EnrichedRepo;
  recentPrs: RecentPr[];
}

const ScoringConfig: React.FC<{ repo: EnrichedRepo }> = ({ repo }) => {
  const labelEntries = Object.entries(repo.labelMultipliers);
  return (
    <Box>
      <SectionHeader>Scoring Config</SectionHeader>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          mb: labelEntries.length ? 1.25 : 0,
        }}
      >
        <Box
          component="span"
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 0.75,
            py: 0.25,
            borderRadius: 0.75,
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            color: theme.palette.text.secondary,
            backgroundColor: alpha(theme.palette.common.black, 0.3),
            border: `1px solid ${theme.palette.border.subtle}`,
          })}
        >
          Default multiplier:&nbsp;
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {`${repo.defaultLabelMultiplier ?? 1}×`}
          </Box>
        </Box>
        <Box
          component="span"
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 0.75,
            py: 0.25,
            borderRadius: 0.75,
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            fontWeight: 600,
            color: repo.trustedLabelPipeline
              ? theme.palette.status.success
              : theme.palette.text.tertiary,
            backgroundColor: alpha(
              repo.trustedLabelPipeline
                ? theme.palette.status.success
                : theme.palette.text.primary,
              0.1,
            ),
            border: `1px solid ${alpha(
              repo.trustedLabelPipeline
                ? theme.palette.status.success
                : theme.palette.text.primary,
              0.2,
            )}`,
          })}
        >
          Trusted labels: {repo.trustedLabelPipeline ? 'on' : 'off'}
        </Box>
      </Box>
      {labelEntries.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {labelEntries.map(([label, mult]) => (
            <Box
              key={label}
              sx={(theme) => ({
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 0.75,
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: theme.palette.text.primary,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
              })}
            >
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {label}
              </Box>
              <Box component="span" sx={{ fontWeight: 700 }}>
                {`${mult}×`}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography
          sx={(theme) => ({
            fontSize: '0.72rem',
            color: alpha(theme.palette.text.primary, 0.4),
            fontStyle: 'italic',
          })}
        >
          No per-label multipliers configured.
        </Typography>
      )}
    </Box>
  );
};

const ExpansionBody: React.FC<ExpansionBodyProps> = ({ repo, recentPrs }) => (
  <Box
    sx={(theme) => ({
      pt: 2,
      mt: 2,
      borderTop: `1px solid ${theme.palette.border.subtle}`,
      display: 'flex',
      flexDirection: 'column',
      gap: { xs: 2, md: 2.5 },
    })}
  >
    <ScoringConfig repo={repo} />
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
        gap: { xs: 2, md: 3 },
      }}
    >
      <Box>
        <SectionHeader>Recent Merged PRs</SectionHeader>
        {recentPrs.length === 0 ? (
          <Typography
            sx={(theme) => ({
              fontSize: '0.78rem',
              color: alpha(theme.palette.text.primary, 0.4),
              fontStyle: 'italic',
              p: 1,
            })}
          >
            No merged PRs yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {recentPrs.map((pr) => (
              <LinkBox
                key={pr.number}
                href={getPrHref(repo.repository, pr.number)}
                linkState={REPO_LINK_STATE}
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  mx: -1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.text.primary, 0.04),
                  },
                })}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Tooltip
                    title={pr.title}
                    arrow
                    placement="top"
                    enterDelay={400}
                  >
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.78rem',
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      #{pr.number} {pr.title}
                    </Typography>
                  </Tooltip>
                  <Typography
                    sx={(theme) => ({
                      fontFamily: FONTS.mono,
                      fontSize: '0.66rem',
                      color: theme.palette.text.tertiary,
                    })}
                  >
                    {pr.author ? `${pr.author} · ` : ''}
                    {formatRelativeTime(pr.mergedAt)}
                  </Typography>
                </Box>
                <Typography
                  sx={(theme) => ({
                    fontFamily: FONTS.mono,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: theme.palette.status.success,
                    flexShrink: 0,
                  })}
                >
                  {formatScore(pr.score)}
                </Typography>
              </LinkBox>
            ))}
          </Box>
        )}
      </Box>

      <Box>
        <SectionHeader>Top Miners</SectionHeader>
        {repo.authorScores.length === 0 ? (
          <Typography
            sx={(theme) => ({
              fontSize: '0.78rem',
              color: alpha(theme.palette.text.primary, 0.4),
              fontStyle: 'italic',
              p: 1,
            })}
          >
            No contributors yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {repo.authorScores.slice(0, 6).map((m) => (
              <LinkBox
                key={m.author}
                href={getMinerHref(m.author)}
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  mx: -1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.text.primary, 0.04),
                  },
                })}
              >
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.76rem',
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {m.author}
                </Typography>
                <Typography
                  sx={(theme) => ({
                    fontFamily: FONTS.mono,
                    fontSize: '0.7rem',
                    color: theme.palette.text.tertiary,
                    flexShrink: 0,
                  })}
                >
                  {m.prs} PR{m.prs === 1 ? '' : 's'}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    flexShrink: 0,
                    minWidth: 44,
                    textAlign: 'right',
                  }}
                >
                  {formatScore(m.score)}
                </Typography>
              </LinkBox>
            ))}
          </Box>
        )}
      </Box>
    </Box>
    <Box
      sx={(theme) => ({
        display: 'flex',
        justifyContent: 'flex-end',
        pt: 1,
        borderTop: `1px solid ${theme.palette.border.subtle}`,
      })}
    >
      <Box
        component="a"
        href={getRepoHref(repo.repository)}
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          fontWeight: 600,
          color: theme.palette.text.secondary,
          textDecoration: 'none',
          '&:hover': { color: theme.palette.text.primary },
        })}
      >
        Open full repository page
        <LaunchIcon sx={{ fontSize: '0.85rem' }} />
      </Box>
    </Box>
  </Box>
);

// ── Repo summary card (always-on KPIs + click to expand) ───────────────
interface RepoSummaryCardProps {
  repo: EnrichedRepo;
  isExpanded: boolean;
  onToggle: () => void;
  recentPrs: RecentPr[];
}

const RepoSummaryCard: React.FC<RepoSummaryCardProps> = ({
  repo,
  isExpanded,
  onToggle,
  recentPrs,
}) => {
  const trendAccent: 'positive' | 'negative' | 'default' =
    repo.pctIncrease > 0
      ? 'positive'
      : repo.pctIncrease < 0
        ? 'negative'
        : 'default';

  const trendValue =
    repo.pctIncrease === 0 ? (
      '—'
    ) : (
      <Box
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
      >
        {repo.pctIncrease > 0 ? (
          <TrendingUpIcon sx={{ fontSize: '1rem' }} />
        ) : (
          <TrendingDownIcon sx={{ fontSize: '1rem' }} />
        )}
        {repo.pctIncrease > 0 ? '+' : ''}
        {repo.pctIncrease.toFixed(0)}%
      </Box>
    );

  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        border: '1px solid',
        borderColor: isExpanded
          ? theme.palette.primary.main
          : theme.palette.border.light,
        backgroundColor: theme.palette.surface.transparent,
        borderRadius: 2,
        transition: 'border-color 0.15s, background 0.15s',
        '&:hover': {
          borderColor: isExpanded
            ? theme.palette.primary.main
            : theme.palette.border.medium,
        },
      })}
    >
      {/* Header / KPI row — clickable to toggle */}
      <Box
        onClick={onToggle}
        sx={{
          py: 1.5,
          px: ROW_PX,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: ROW_GAP,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
        }}
      >
        {/* Identity */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            minWidth: 0,
            flex: IDENTITY_FLEX,
          }}
        >
          <Avatar
            src={getRepositoryOwnerAvatarSrc(repo.repository.split('/')[0])}
            alt={repo.repository}
            sx={(theme) => ({
              width: 28,
              height: 28,
              flexShrink: 0,
              border: `1px solid ${theme.palette.border.subtle}`,
              backgroundColor: getAvatarBg(repo.repository),
            })}
          />
          <Tooltip
            title={repo.repository}
            arrow
            placement="top"
            enterDelay={400}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {repo.repository}
            </Typography>
          </Tooltip>
        </Box>

        {/* KPI strip — values only (labels live in the sticky column header) */}
        <Box
          sx={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: KPI_GRID_TEMPLATE,
            gap: KPI_GAP,
            minWidth: 0,
          }}
        >
          <KpiCell value={formatScore(repo.totalScore)} />
          <KpiCell value={`${(repo.weight * 100).toFixed(1)}%`} />
          <KpiCell value={trendValue} accent={trendAccent} />
          <KpiCell value={repo.totalPRs.toString()} />
          <KpiCell value={repo.uniqueMiners.toString()} />
          <KpiCell
            value={
              repo.collateralTotal > 0 ? repo.collateralTotal.toFixed(1) : '—'
            }
          />
          <KpiCell value={`${(repo.maintainerCut * 100).toFixed(0)}%`} />
          <KpiCell value={`${(repo.issueDiscoveryShare * 100).toFixed(0)}%`} />
        </Box>

        {/* Actions — just the expand chevron; full-page link lives in the expansion. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flex: ACTIONS_FLEX,
            ml: { xs: 'auto', md: 0 },
          }}
        >
          <ExpandMoreIcon
            sx={(theme) => ({
              fontSize: '1.4rem',
              color: theme.palette.text.tertiary,
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
            })}
          />
        </Box>
      </Box>

      {/* Expansion */}
      <Collapse in={isExpanded} unmountOnExit>
        <Box sx={{ px: ROW_PX, pb: 2 }}>
          <ExpansionBody repo={repo} recentPrs={recentPrs} />
        </Box>
      </Collapse>
    </Card>
  );
};

// ── Sticky column header (aligned to row layout) ──────────────────────
interface ColumnHeaderProps {
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
}

const ColumnHeader: React.FC<ColumnHeaderProps> = ({ sortKey, onSort }) => (
  <Box
    sx={(theme) => ({
      display: { xs: 'none', md: 'flex' },
      alignItems: 'center',
      gap: ROW_GAP,
      py: 1,
      px: ROW_PX,
      borderRadius: 1.5,
      backgroundColor: alpha(theme.palette.common.black, 0.55),
      border: `1px solid ${theme.palette.border.subtle}`,
      backdropFilter: 'blur(4px)',
    })}
  >
    {/* Identity column — sortable by name */}
    <Box sx={{ flex: IDENTITY_FLEX, minWidth: 0 }}>
      <SortHeader
        label="Repository"
        sortKey="name"
        activeSort={sortKey}
        onSort={onSort}
      />
    </Box>
    {/* KPI columns */}
    <Box
      sx={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: KPI_GRID_TEMPLATE,
        gap: KPI_GAP,
        minWidth: 0,
      }}
    >
      {KPI_COLUMNS.map((c) => (
        <SortHeader
          key={c.sortKey}
          label={c.label}
          sortKey={c.sortKey}
          activeSort={sortKey}
          onSort={onSort}
        />
      ))}
    </Box>
    {/* Actions spacer — matches the chevron width in rows below */}
    <Box sx={{ flex: ACTIONS_FLEX, width: 22 }} aria-hidden />
  </Box>
);

// ── Navigation rail ────────────────────────────────────────────────────
interface RailMetricProps {
  repo: EnrichedRepo;
  sortKey: SortKey;
}

const RailMetric: React.FC<RailMetricProps> = ({ repo, sortKey }) => {
  if (sortKey === 'name') return null;
  if (sortKey === 'trend') {
    if (repo.pctIncrease === 0) {
      return (
        <Typography
          sx={(theme) => ({
            fontFamily: FONTS.mono,
            fontSize: '0.68rem',
            color: alpha(theme.palette.text.primary, 0.3),
          })}
        >
          —
        </Typography>
      );
    }
    const positive = repo.pctIncrease > 0;
    return (
      <Typography
        sx={(theme) => ({
          fontFamily: FONTS.mono,
          fontSize: '0.68rem',
          fontWeight: 600,
          color: positive
            ? theme.palette.status.success
            : theme.palette.status.error,
          whiteSpace: 'nowrap',
        })}
      >
        {positive ? '+' : ''}
        {repo.pctIncrease.toFixed(0)}%
      </Typography>
    );
  }
  let text = '';
  switch (sortKey) {
    case 'score':
      text = formatScore(repo.totalScore);
      break;
    case 'weight':
      text = `${(repo.weight * 100).toFixed(1)}%`;
      break;
    case 'totalPRs':
      text = repo.totalPRs.toString();
      break;
    case 'miners':
      text = repo.uniqueMiners.toString();
      break;
    case 'collateral':
      text = repo.collateralTotal > 0 ? repo.collateralTotal.toFixed(1) : '—';
      break;
    case 'maintainerCut':
      text = `${(repo.maintainerCut * 100).toFixed(0)}%`;
      break;
    case 'issueShare':
      text = `${(repo.issueDiscoveryShare * 100).toFixed(0)}%`;
      break;
  }
  return (
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        fontWeight: 600,
        color: 'text.primary',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </Typography>
  );
};

interface NavRailProps {
  repos: EnrichedRepo[];
  expandedKey: string | null;
  sortKey: SortKey;
  onJump: (key: string) => void;
  registerLinkProps: React.AnchorHTMLAttributes<HTMLAnchorElement>;
}

const NavRail: React.FC<NavRailProps> = ({
  repos,
  expandedKey,
  sortKey,
  onJump,
  registerLinkProps,
}) => (
  <Card
    elevation={0}
    sx={(theme) => ({
      border: `1px solid ${theme.palette.border.light}`,
      backgroundColor: theme.palette.surface.transparent,
      borderRadius: 2,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    })}
  >
    <Box
      sx={(theme) => ({
        px: 1,
        py: 0.75,
        borderBottom: `1px solid ${theme.palette.border.subtle}`,
      })}
    >
      <Box
        component="a"
        {...registerLinkProps}
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          width: '100%',
          py: 0.75,
          px: 1,
          borderRadius: 1,
          textDecoration: 'none',
          fontFamily: FONTS.mono,
          fontSize: '0.74rem',
          fontWeight: 600,
          color: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
          transition: 'background 0.12s',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
          },
        })}
      >
        + Register a repo
      </Box>
    </Box>
    <Box sx={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
      {repos.map((r) => {
        const isActive = r.repository === expandedKey;
        return (
          <Box
            key={r.repository}
            onClick={() => onJump(r.repository)}
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.75,
              cursor: 'pointer',
              borderLeft: '3px solid',
              borderLeftColor: isActive
                ? theme.palette.primary.main
                : 'transparent',
              backgroundColor: isActive
                ? alpha(theme.palette.primary.main, 0.08)
                : 'transparent',
              transition: 'background 0.12s',
              '&:hover': {
                backgroundColor: isActive
                  ? alpha(theme.palette.primary.main, 0.12)
                  : alpha(theme.palette.text.primary, 0.04),
              },
            })}
          >
            <Avatar
              src={getRepositoryOwnerAvatarSrc(r.repository.split('/')[0])}
              alt={r.repository}
              sx={(theme) => ({
                width: 18,
                height: 18,
                flexShrink: 0,
                border: `1px solid ${theme.palette.border.subtle}`,
                backgroundColor: getAvatarBg(r.repository),
              })}
            />
            <Tooltip
              title={r.repository}
              arrow
              placement="right"
              enterDelay={400}
            >
              <Typography
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: FONTS.mono,
                  fontSize: '0.72rem',
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.repository}
              </Typography>
            </Tooltip>
            <Box sx={{ flexShrink: 0 }}>
              <RailMetric repo={r} sortKey={sortKey} />
            </Box>
          </Box>
        );
      })}
    </Box>
  </Card>
);

// ── Page ───────────────────────────────────────────────────────────────
const RepositoriesPage: React.FC = () => {
  const registerRepoLink = useLinkBehavior<HTMLAnchorElement>(
    '/repository-registration',
  );

  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: reposWithWeights, isLoading: isLoadingRepos } =
    useReposAndWeights();

  const isLoading = isLoadingPRs || isLoadingRepos;

  const enrichedRepos: EnrichedRepo[] = useMemo(() => {
    if (!reposWithWeights) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    type Acc = {
      totalScore: number;
      totalPRs: number;
      uniqueMiners: Set<string>;
      recentScore: number;
      priorScore: number;
      collateralTotal: number;
      openPRs: number;
      authors: Map<string, { score: number; prs: number }>;
    };
    const empty = (): Acc => ({
      totalScore: 0,
      totalPRs: 0,
      uniqueMiners: new Set(),
      recentScore: 0,
      priorScore: 0,
      collateralTotal: 0,
      openPRs: 0,
      authors: new Map(),
    });

    const acc = new Map<string, Acc>();

    if (allPRs) {
      allPRs.forEach((pr: CommitLog) => {
        if (!pr?.repository) return;
        const key = pr.repository.toLowerCase();
        const cur = acc.get(key) || empty();

        if (isMergedPr(pr)) {
          const score = parseFloat(pr.score || '0');
          cur.totalScore += score;
          cur.totalPRs += 1;
          if (pr.author) {
            cur.uniqueMiners.add(pr.author);
            const a = cur.authors.get(pr.author) || { score: 0, prs: 0 };
            a.score += score;
            a.prs += 1;
            cur.authors.set(pr.author, a);
          }
          if (pr.mergedAt) {
            if (new Date(pr.mergedAt) >= cutoff) cur.recentScore += score;
            else cur.priorScore += score;
          }
        }

        if (pr.prState === 'OPEN') {
          const c = parseFloat(pr.collateralScore || '0');
          if (c > 0) {
            cur.collateralTotal += c;
            cur.openPRs += 1;
          }
        }

        acc.set(key, cur);
      });
    }

    const toNum = (v: unknown): number | undefined => {
      if (v === null || v === undefined || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    return reposWithWeights
      .map((repo) => {
        const key = repo.fullName.toLowerCase();
        const s = acc.get(key) || empty();
        const cfg = repo.config ?? {};
        return {
          repository: repo.fullName,
          totalScore: s.totalScore,
          totalPRs: s.totalPRs,
          uniqueMiners: s.uniqueMiners.size,
          weight: toNum(cfg.emissionShare) ?? 0,
          collateralTotal: s.collateralTotal,
          openPRs: s.openPRs,
          pctIncrease:
            s.priorScore > 0 ? (s.recentScore / s.priorScore) * 100 : 0,
          authorScores: Array.from(s.authors.entries())
            .map(([author, v]) => ({ author, score: v.score, prs: v.prs }))
            .sort((a, b) => b.score - a.score),
          maintainerCut: toNum(cfg.maintainerCut) ?? 0,
          issueDiscoveryShare: toNum(cfg.issueDiscoveryShare) ?? 0,
          defaultLabelMultiplier: cfg.defaultLabelMultiplier,
          labelMultipliers: cfg.labelMultipliers ?? {},
          trustedLabelPipeline: !!cfg.trustedLabelPipeline,
        } satisfies EnrichedRepo;
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [allPRs, reposWithWeights]);

  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Row refs so we can scroll a chosen repo into view (rail click + expand).
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Reserve enough top space for the global search bar (~60px) + sticky
  // column header (~40px) + buffer when scrolling a row into view.
  const STICKY_TOP_OFFSET = 120;

  const findScrollParent = (el: HTMLElement): HTMLElement | null => {
    let cur: HTMLElement | null = el.parentElement;
    while (cur) {
      const oy = getComputedStyle(cur).overflowY;
      if (
        (oy === 'auto' || oy === 'scroll') &&
        cur.scrollHeight > cur.clientHeight
      ) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return null;
  };

  // Wait long enough for MUI's Collapse animation (~300ms) to settle, then
  // scroll the row to sit just below the sticky header instead of behind it.
  const scrollRowIntoView = (key: string) => {
    setTimeout(() => {
      const el = rowRefs.current.get(key);
      if (!el) return;
      const parent = findScrollParent(el);
      if (!parent) return;
      const rowTop = el.getBoundingClientRect().top;
      const parentTop = parent.getBoundingClientRect().top;
      const target =
        parent.scrollTop + (rowTop - parentTop) - STICKY_TOP_OFFSET;
      parent.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }, 360);
  };

  const handleExpand = (key: string) => {
    setExpandedKey((prev) => {
      if (prev === key) return null; // collapse without scroll
      scrollRowIntoView(key);
      return key;
    });
  };

  const handleJump = (key: string) => {
    setExpandedKey(key);
    scrollRowIntoView(key);
  };

  const visibleRepos = useMemo(
    () => [...enrichedRepos].sort((a, b) => compareRepos(a, b, sortKey)),
    [enrichedRepos, sortKey],
  );

  // Recent PRs only for the currently-expanded repo.
  const recentPrsForExpanded: RecentPr[] = useMemo(() => {
    if (!expandedKey || !allPRs) return [];
    const targetKey = expandedKey.toLowerCase();
    return allPRs
      .filter(
        (pr) =>
          pr.repository?.toLowerCase() === targetKey &&
          isMergedPr(pr) &&
          pr.mergedAt,
      )
      .sort(
        (a, b) =>
          new Date(b.mergedAt!).getTime() - new Date(a.mergedAt!).getTime(),
      )
      .slice(0, 8)
      .map((pr) => ({
        number: pr.pullRequestNumber,
        title: pr.pullRequestTitle ?? `PR #${pr.pullRequestNumber}`,
        author: pr.author ?? undefined,
        mergedAt: new Date(pr.mergedAt!),
        score: parseFloat(pr.score || '0'),
      }));
  }, [expandedKey, allPRs]);

  return (
    <Page title="Repositories">
      <SEO
        title="Repositories"
        description="Browse supported repositories on Gittensor."
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: { xl: 1760 },
          mx: 'auto',
          py: { xs: 1.5, sm: 2.5 },
          px: { xs: 1, sm: 2, lg: 3, xl: 2 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Nav rail + scrollable list */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              flex: '0 0 220px',
              display: { xs: 'none', md: 'block' },
              position: 'sticky',
              top: 64,
              alignSelf: 'flex-start',
            }}
          >
            <NavRail
              repos={visibleRepos}
              expandedKey={expandedKey}
              sortKey={sortKey}
              onJump={handleJump}
              registerLinkProps={registerRepoLink}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
            }}
          >
            {/* Sticky column header */}
            <Box
              sx={{
                position: 'sticky',
                top: { xs: 56, md: 64 },
                zIndex: 5,
              }}
            >
              <ColumnHeader sortKey={sortKey} onSort={setSortKey} />
            </Box>

            {visibleRepos.map((r) => {
              const isExpanded = expandedKey === r.repository;
              return (
                <Box
                  key={r.repository}
                  ref={(el: HTMLDivElement | null) => {
                    if (el) rowRefs.current.set(r.repository, el);
                    else rowRefs.current.delete(r.repository);
                  }}
                >
                  <RepoSummaryCard
                    repo={r}
                    isExpanded={isExpanded}
                    onToggle={() => handleExpand(r.repository)}
                    recentPrs={isExpanded ? recentPrsForExpanded : []}
                  />
                </Box>
              );
            })}
            {!isLoading && visibleRepos.length === 0 ? (
              <Card
                elevation={0}
                sx={(theme) => ({
                  p: 4,
                  textAlign: 'center',
                  border: `1px solid ${theme.palette.border.light}`,
                  backgroundColor: theme.palette.surface.transparent,
                  borderRadius: 2,
                })}
              >
                <Typography
                  sx={(theme) => ({
                    color: alpha(theme.palette.text.primary, 0.4),
                    fontSize: '0.85rem',
                  })}
                >
                  No repositories match.
                </Typography>
              </Card>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default RepositoriesPage;

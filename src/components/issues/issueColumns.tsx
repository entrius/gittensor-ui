import React from 'react';
import { Avatar, Box, Chip, Link, Typography, alpha } from '@mui/material';
import { type Theme } from '@mui/material/styles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { IssueBounty } from '../../api/models/Issues';
import { formatTokenAmount, formatAlphaToUsd } from '../../utils/format';
import { getIssueStatusMeta } from '../../utils/issueStatus';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import { type DataTableColumn } from '../common/DataTable';
import { WatchlistButton } from '../common/WatchlistButton';

export type IssueSortBasis = 'repository' | 'issue' | 'bounty' | 'status';

export const parseBountyAmount = (value: string | null | undefined): number => {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getIssueSortValue = (
  issue: IssueBounty,
  basis: IssueSortBasis,
): number | string => {
  switch (basis) {
    case 'repository':
      return (issue.repositoryFullName || '').toLowerCase();
    case 'issue':
      return `${(issue.title || '').toLowerCase()}::${String(issue.issueNumber).padStart(10, '0')}`;
    case 'bounty':
      return parseBountyAmount(issue.targetBounty);
    case 'status':
      return getIssueStatusMeta(issue.status).text;
  }
};

export const sortIssues = <Row, Key extends string>(
  rows: Row[],
  getValue: (row: Row, key: Key) => number | string,
  key: Key,
  order: 'asc' | 'desc',
): Row[] => {
  const directionFactor = order === 'asc' ? 1 : -1;
  const collator = new Intl.Collator(undefined, {
    sensitivity: 'base',
    numeric: true,
  });
  const decorated = rows.map((row) => ({ row, value: getValue(row, key) }));
  decorated.sort((a, b) => {
    if (typeof a.value === 'number' && typeof b.value === 'number') {
      return (a.value - b.value) * directionFactor;
    }
    return collator.compare(String(a.value), String(b.value)) * directionFactor;
  });
  return decorated.map((d) => d.row);
};

export const issueRepositoryColumn = <K extends string>(
  sortKey: K,
  width: string = '200px',
): DataTableColumn<IssueBounty, K> => ({
  key: 'repository',
  header: 'Repository',
  width,
  sortKey,
  cellSx: { overflow: 'hidden' },
  renderCell: (issue) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Avatar
        src={`https://avatars.githubusercontent.com/${issue.repositoryFullName.split('/')[0]}`}
        sx={{ width: 24, height: 24, borderRadius: 1, flexShrink: 0 }}
      />
      <Typography
        sx={{
          fontSize: '0.85rem',
          color: STATUS_COLORS.info,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {issue.repositoryFullName}
      </Typography>
    </Box>
  ),
});

export const issueTitleColumn = <K extends string>(
  sortKey: K,
  theme: Theme,
): DataTableColumn<IssueBounty, K> => ({
  key: 'issue',
  header: 'Issue',
  sortKey,
  renderCell: (issue) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {issue.title && (
        <Typography
          sx={{
            fontSize: '0.85rem',
            color: 'text.primary',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {issue.title}
        </Typography>
      )}
      <Link
        href={issue.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          fontSize: '0.75rem',
          color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
          textDecoration: 'none',
          '&:hover': {
            color: STATUS_COLORS.info,
            textDecoration: 'underline',
          },
        }}
      >
        #{issue.issueNumber}
        <OpenInNewIcon sx={{ fontSize: 12, opacity: 0.5 }} />
      </Link>
    </Box>
  ),
});

export interface IssueBountyColumnOptions {
  label: string;
  width?: string;
  color?: string | ((issue: IssueBounty) => string);
}

export const issueBountyColumn = <K extends string>(
  sortKey: K,
  taoPrice: number,
  alphaPrice: number,
  theme: Theme,
  opts: IssueBountyColumnOptions,
): DataTableColumn<IssueBounty, K> => ({
  key: 'bounty',
  header: opts.label,
  width: opts.width,
  align: 'right',
  sortKey,
  renderCell: (issue) => {
    const usdDisplay = formatAlphaToUsd(
      issue.targetBounty,
      taoPrice,
      alphaPrice,
    );
    const color =
      (typeof opts.color === 'function' ? opts.color(issue) : opts.color) ??
      STATUS_COLORS.merged;
    return (
      <>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color }}>
          {formatTokenAmount(issue.targetBounty)} ل
        </Typography>
        {usdDisplay && (
          <Typography
            sx={{
              fontSize: '0.7rem',
              color: alpha(theme.palette.common.white, 0.35),
            }}
          >
            {usdDisplay}
          </Typography>
        )}
      </>
    );
  },
});

export const issueStatusColumn = <K extends string>(
  sortKey: K,
  width?: string,
): DataTableColumn<IssueBounty, K> => ({
  key: 'status',
  header: 'Status',
  width,
  align: 'center',
  sortKey,
  renderCell: (issue) => {
    const statusBadge = getIssueStatusMeta(issue.status);
    return (
      <Chip
        label={statusBadge.text}
        size="small"
        sx={{
          fontSize: '0.7rem',
          fontWeight: 600,
          backgroundColor: statusBadge.bgColor,
          color: statusBadge.color,
          border: `1px solid ${statusBadge.color}40`,
        }}
      />
    );
  },
});

export const issueWatchColumn = <K extends string>(
  width: string = '52px',
): DataTableColumn<IssueBounty, K> => ({
  key: 'watch',
  header: '★',
  width,
  align: 'center',
  cellSx: { p: 0 },
  renderCell: (issue) => (
    <WatchlistButton category="bounties" itemKey={String(issue.id)} />
  ),
});

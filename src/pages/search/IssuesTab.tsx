import React from 'react';
import { Tooltip, Typography } from '@mui/material';
import { format } from 'date-fns';
import { type IssueBounty } from '../../api/models/Issues';
import { formatDate } from '../../utils/format';
import { getGithubAvatarSrc, getIssueStatusMeta } from '../../utils';
import {
  type DataTableColumn,
  type DataTableSort,
} from '../../components/common/DataTable';
import SearchResultsCard from './SearchResultsCard';
import { type IssueSearchSortKey } from './searchSort';
import {
  SearchAvatarContentCell,
  SearchStatusChip,
  SearchTruncatedText,
} from './SearchTableCells';

const issueColumns: DataTableColumn<IssueBounty, IssueSearchSortKey>[] = [
  {
    key: 'issueNumber',
    header: 'Issue',
    width: 96,
    sortKey: 'issueNumber',
    renderCell: (issue: IssueBounty) => `#${issue.issueNumber}`,
    cellSx: {
      fontWeight: 600,
      color: 'text.secondary',
    },
  },
  {
    key: 'title',
    header: 'Title',
    width: '34%',
    sortKey: 'title',
    renderCell: (issue: IssueBounty) => (
      <SearchTruncatedText
        tooltip={issue.title || 'Untitled issue'}
        sx={(theme) => ({
          color: theme.palette.text.primary,
          fontWeight: 500,
        })}
        text={issue.title || 'Untitled issue'}
      />
    ),
  },
  {
    key: 'repository',
    header: 'Repository',
    width: '28%',
    sortKey: 'repository',
    renderCell: (issue: IssueBounty) => {
      const repositoryOwner = issue.repositoryFullName.split('/')[0];

      return (
        <SearchAvatarContentCell
          avatarAlt={repositoryOwner}
          avatarBorderRadius={1}
          avatarSrc={getGithubAvatarSrc(repositoryOwner)}
          showAvatarBorder={false}
        >
          <SearchTruncatedText
            tooltip={issue.repositoryFullName}
            sx={(theme) => ({
              ...theme.typography.mono,
              color: theme.palette.status.info,
            })}
            text={issue.repositoryFullName}
          />
        </SearchAvatarContentCell>
      );
    },
  },
  {
    key: 'status',
    header: 'Status',
    width: '12%',
    align: 'center',
    sortKey: 'status',
    renderCell: (issue: IssueBounty) => {
      const statusMeta = getIssueStatusMeta(issue.status);
      return (
        <SearchStatusChip
          backgroundColor={statusMeta.bgColor}
          borderColor={statusMeta.borderColor}
          color={statusMeta.color}
          label={statusMeta.text}
        />
      );
    },
  },
  {
    key: 'date',
    header: 'Date',
    width: 132,
    align: 'right',
    sortKey: 'date',
    renderCell: (issue: IssueBounty) => {
      const raw =
        issue.completedAt || issue.updatedAt || issue.createdAt || null;
      const label = raw ? formatDate(raw) : '—';
      const tooltipTitle = (() => {
        if (!raw) return label;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return label;
        return format(d, 'PPpp');
      })();
      return (
        <Tooltip title={tooltipTitle} arrow>
          <Typography
            component="span"
            sx={{
              fontSize: '0.8rem',
              color: 'text.secondary',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
        </Tooltip>
      );
    },
  },
];

type IssuesTabProps = {
  isError: boolean;
  isLoading: boolean;
  issueResults: IssueBounty[];
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  getIssueHref: (issue: IssueBounty) => string;
  linkState?: Record<string, unknown>;
  page: number;
  paginatedIssueResults: IssueBounty[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
  sort: DataTableSort<IssueSearchSortKey>;
};

const IssuesTab: React.FC<IssuesTabProps> = ({
  isError,
  isLoading,
  issueResults,
  onPageChange,
  onRowsPerPageChange,
  getIssueHref,
  linkState,
  page,
  paginatedIssueResults,
  rowsPerPage,
  rowsPerPageOptions,
  sort,
}) => (
  <SearchResultsCard
    columns={issueColumns}
    emptyLabel="No issue matches."
    errorLabel="Failed to load issues for search."
    getRowKey={(issue) => issue.id}
    isError={isError}
    isLoading={isLoading}
    minWidth={900}
    onPageChange={onPageChange}
    getRowHref={getIssueHref}
    linkState={linkState}
    onRowsPerPageChange={onRowsPerPageChange}
    page={page}
    rows={paginatedIssueResults}
    rowsPerPage={rowsPerPage}
    rowsPerPageOptions={rowsPerPageOptions}
    sort={sort}
    totalCount={issueResults.length}
  />
);

export default IssuesTab;

import React from 'react';
import { alpha } from '@mui/material/styles';
import { type IssueBounty } from '../../api/models/Issues';
import { getGithubAvatarSrc, getIssueStatusMeta } from '../../utils';
import SearchResultsTable, {
  type SearchResultsTableColumn,
} from './SearchResultsTable';
import {
  SearchAvatarContentCell,
  SearchStatusChip,
  SearchTruncatedText,
} from './SearchTableCells';

const issueColumns: SearchResultsTableColumn<IssueBounty>[] = [
  {
    key: 'issueNumber',
    header: 'Issue #',
    width: 100,
    renderCell: (issue: IssueBounty) => `#${issue.issueNumber}`,
    cellSx: {
      color: 'text.secondary',
    },
  },
  {
    key: 'repository',
    header: 'Repository',
    width: '30%',
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
    key: 'title',
    header: 'Issue',
    width: '42%',
    renderCell: (issue: IssueBounty) => (
      <SearchTruncatedText
        tooltip={issue.title || 'Untitled issue'}
        sx={(theme) => ({
          ...theme.typography.mono,
          color: theme.palette.text.primary,
        })}
        text={issue.title || 'Untitled issue'}
      />
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '18%',
    align: 'center',
    renderCell: (issue: IssueBounty) => {
      const statusMeta = getIssueStatusMeta(issue.status);

      return (
        <SearchStatusChip
          backgroundColor={(theme) =>
            alpha(theme.palette.status[statusMeta.tone], 0.15)
          }
          borderColor={(theme) =>
            alpha(theme.palette.status[statusMeta.tone], 0.25)
          }
          color={(theme) => theme.palette.status[statusMeta.tone]}
          label={statusMeta.text}
        />
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
  onSelectIssue: (id: number) => void;
  page: number;
  paginatedIssueResults: IssueBounty[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
};

const IssuesTab: React.FC<IssuesTabProps> = ({
  isError,
  isLoading,
  issueResults,
  onPageChange,
  onRowsPerPageChange,
  onSelectIssue,
  page,
  paginatedIssueResults,
  rowsPerPage,
  rowsPerPageOptions,
}) => (
  <SearchResultsTable
    columns={issueColumns}
    emptyLabel="No issue matches."
    errorLabel="Failed to load issues for search."
    getRowKey={(issue) => issue.id}
    isError={isError}
    isLoading={isLoading}
    minWidth={900}
    onPageChange={onPageChange}
    onRowClick={(issue) => onSelectIssue(issue.id)}
    onRowsPerPageChange={onRowsPerPageChange}
    page={page}
    rows={paginatedIssueResults}
    rowsPerPage={rowsPerPage}
    rowsPerPageOptions={rowsPerPageOptions}
    totalCount={issueResults.length}
  />
);

export default IssuesTab;

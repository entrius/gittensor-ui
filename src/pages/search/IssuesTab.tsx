import React, { useMemo } from 'react';
import { alpha } from '@mui/material/styles';
import { useTheme } from '@mui/material';
import { type IssueBounty } from '../../api/models/Issues';
import { getGithubAvatarSrc, getIssueStatusMetaForTheme } from '../../utils';
import { type DataTableColumn } from '../../components/common/DataTable';
import SearchResultsCard from './SearchResultsCard';
import {
  SearchAvatarContentCell,
  SearchStatusChip,
  SearchTruncatedText,
} from './SearchTableCells';

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
}) => {
  const theme = useTheme();
  const issueColumns = useMemo<DataTableColumn<IssueBounty>[]>(
    () => [
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
                sx={(t) => ({
                  ...t.typography.mono,
                  color: t.palette.status.info,
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
            sx={(t) => ({
              ...t.typography.mono,
              color: t.palette.text.primary,
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
          const statusMeta = getIssueStatusMetaForTheme(issue.status, theme);

          return (
            <SearchStatusChip
              backgroundColor={(t) =>
                alpha(t.palette.status[statusMeta.tone], 0.15)
              }
              borderColor={(t) =>
                alpha(t.palette.status[statusMeta.tone], 0.25)
              }
              color={(t) => t.palette.status[statusMeta.tone]}
              label={statusMeta.text}
            />
          );
        },
      },
    ],
    [theme],
  );

  return (
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
      totalCount={issueResults.length}
    />
  );
};

export default IssuesTab;

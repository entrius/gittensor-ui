/**
 * Issues API - For issue bounties.
 */
import { useQueries, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useApiQuery } from './ApiUtils';
import {
  GitHubIssue,
  IssueBounty,
  IssueDetails,
  IssueSubmission,
  IssuesStats,
  RepoBountySummary,
} from './models/Issues';

const GITHUB_API_BASE_URL = 'https://api.github.com';

const parseRepositoryFullName = (repositoryUrl: string): string =>
  repositoryUrl.replace(/^https:\/\/api\.github\.com\/repos\//, '');

const mapGitHubIssue = (issue: {
  repository_url: string;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user?: { login?: string | null };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  comments?: number;
  labels?: Array<{ name?: string }>;
}): GitHubIssue => ({
  repositoryFullName: parseRepositoryFullName(issue.repository_url),
  issueNumber: issue.number,
  title: issue.title,
  body: issue.body,
  state: issue.state,
  htmlUrl: issue.html_url,
  authorLogin: issue.user?.login ?? null,
  createdAt: issue.created_at,
  updatedAt: issue.updated_at,
  closedAt: issue.closed_at,
  commentsCount: issue.comments ?? 0,
  labels: (issue.labels || []).map((label) => label.name || '').filter(Boolean),
});

/**
 * Fetch all issues with optional status and repository filter.
 */
export const useIssues = (status?: string, repository?: string) => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (repository) params.repository = repository;
  return useApiQuery<IssueBounty[]>(
    'useIssues',
    '/issues',
    undefined,
    Object.keys(params).length > 0 ? params : undefined,
  );
};

// Shared cache key for the issues dataset.
export const getIssuesQueryKey = (status?: string, repository?: string) =>
  [
    'useIssues',
    '/issues',
    status || repository ? { status, repository } : undefined,
  ] as const;

/**
 * Fetch all bounties for a specific repository.
 */
export const useRepoIssues = (repoFullName: string) =>
  useApiQuery<IssueBounty[]>(
    'useRepoIssues',
    '/issues',
    undefined,
    { repository: repoFullName },
    !!repoFullName,
  );

/**
 * Fetch issue statistics.
 */
export const useIssuesStats = () =>
  useApiQuery<IssuesStats>('useIssuesStats', '/issues/stats');

/**
 * Fetch a single issue by ID.
 */
export const useIssue = (id: number) =>
  useApiQuery<IssueBounty>(
    'useIssue',
    `/issues/${id}`,
    undefined,
    undefined,
    !!id,
  );

/**
 * Fetch issue details with GitHub data.
 */
export const useIssueDetails = (id: number) =>
  useApiQuery<IssueDetails>(
    'useIssueDetails',
    `/issues/${id}/details`,
    undefined,
    undefined,
    !!id,
  );

/**
 * Fetch issue details for multiple issue IDs.
 * Useful when a view needs author metadata for a preloaded issue list.
 */
export const useIssueDetailsByIds = (ids: number[]) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [
        'useIssueDetails',
        `/issues/${id}/details`,
        undefined,
      ] as const,
      queryFn: async (): Promise<IssueDetails> => {
        const requestUrl = baseUrl
          ? `${baseUrl}/issues/${id}/details`
          : `/issues/${id}/details`;
        const { data } = await axios.get<IssueDetails>(requestUrl);
        return data;
      },
      retry: false,
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    })),
  });
};

/**
 * Fetch GitHub issues authored by a specific user.
 * Discovery mode needs the original GitHub issue stream, not only bounty rows.
 */
export const useGitHubIssuesByAuthor = (authorLogin: string, enabled = true) =>
  useQuery<GitHubIssue[]>({
    queryKey: ['useGitHubIssuesByAuthor', authorLogin],
    queryFn: async () => {
      const { data } = await axios.get<{
        items: Array<{
          repository_url: string;
          number: number;
          title: string;
          body: string | null;
          state: 'open' | 'closed';
          html_url: string;
          user?: { login?: string | null };
          created_at: string;
          updated_at: string;
          closed_at: string | null;
          comments?: number;
          labels?: Array<{ name?: string }>;
        }>;
      }>(`${GITHUB_API_BASE_URL}/search/issues`, {
        params: {
          q: `author:${authorLogin} is:issue`,
          per_page: 100,
        },
      });

      return data.items.map(mapGitHubIssue);
    },
    retry: false,
    enabled: enabled && !!authorLogin,
    staleTime: 5 * 60 * 1000,
  });

/**
 * Fetch PR submissions for an issue.
 */
export const useIssueSubmissions = (id: number) =>
  useApiQuery<IssueSubmission[]>(
    'useIssueSubmissions',
    `/issues/${id}/submissions`,
    undefined,
    undefined,
    !!id,
  );

/**
 * Fetch bounty summary for a specific repository.
 */
export const useRepoBountySummary = (repoFullName: string) =>
  useApiQuery<RepoBountySummary>(
    'useRepoBountySummary',
    `/issues/repo/${encodeURIComponent(repoFullName)}/summary`,
    undefined,
    undefined,
    !!repoFullName,
  );

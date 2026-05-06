import React, { useMemo } from 'react';
import { formatDate } from '../../utils/format';
import {
  Box,
  Grid,
  Typography,
  Chip,
  Divider,
  Card,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SpeedIcon from '@mui/icons-material/Speed';
import LaunchIcon from '@mui/icons-material/Launch';
import PeopleIcon from '@mui/icons-material/People';
import BugReportIcon from '@mui/icons-material/BugReport';
import { STATUS_COLORS } from '../../theme';
import { githubErrorMessage, useGithubQuery } from '../../api';

interface RepositoryCheckTabProps {
  repositoryFullName: string;
}

interface HealthCheck {
  name: string;
  passed: boolean;
  description: string;
}

interface RepoData {
  default_branch?: string;
  pushed_at: string;
  created_at: string;
  archived: boolean;
  forks_count: number;
  open_issues_count?: number;
  license?: unknown;
}

interface CommunityProfile {
  files?: {
    contributing?: unknown;
    code_of_conduct?: unknown;
  };
}

interface TreeNode {
  path: string;
}

interface TreeResponse {
  tree?: TreeNode[];
}

interface SearchIssuesResponse {
  total_count: number;
}

const repoApi = (repositoryFullName: string) =>
  `https://api.github.com/repos/${repositoryFullName}`;

const SEARCH_ISSUES_URL = 'https://api.github.com/search/issues';

const issueSearchParams = (
  repositoryFullName: string,
  extra: string,
): Record<string, string | number> => ({
  q: `repo:${repositoryFullName} is:issue is:open${extra ? ` ${extra}` : ''}`,
  per_page: 1,
});

const RepositoryCheckTab: React.FC<RepositoryCheckTabProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const enabled = !!repositoryFullName;

  const repoQuery = useGithubQuery<RepoData>(repoApi(repositoryFullName), {
    enabled,
  });

  const communityQuery = useGithubQuery<CommunityProfile>(
    `${repoApi(repositoryFullName)}/community/profile`,
    { enabled },
  );

  const branch = repoQuery.data?.default_branch || 'main';
  const treeQuery = useGithubQuery<TreeResponse>(
    `${repoApi(repositoryFullName)}/git/trees/${branch}`,
    {
      params: { recursive: 1 },
      enabled: enabled && !!repoQuery.data,
    },
  );

  const openIssuesQuery = useGithubQuery<SearchIssuesResponse>(
    SEARCH_ISSUES_URL,
    {
      queryKey: ['searchIssues', repositoryFullName, 'open'],
      params: issueSearchParams(repositoryFullName, ''),
      enabled,
    },
  );
  const goodFirstIssuesQuery = useGithubQuery<SearchIssuesResponse>(
    SEARCH_ISSUES_URL,
    {
      queryKey: ['searchIssues', repositoryFullName, 'good-first'],
      params: issueSearchParams(repositoryFullName, 'label:"good first issue"'),
      enabled,
    },
  );
  const helpWantedQuery = useGithubQuery<SearchIssuesResponse>(
    SEARCH_ISSUES_URL,
    {
      queryKey: ['searchIssues', repositoryFullName, 'help-wanted'],
      params: issueSearchParams(repositoryFullName, 'label:"help wanted"'),
      enabled,
    },
  );

  const fileTree = useMemo(
    () => treeQuery.data?.tree?.map((node) => node.path) ?? [],
    [treeQuery.data],
  );

  const checks: HealthCheck[] = useMemo(() => {
    if (!repoQuery.data) return [];

    const hasFile = (pattern: RegExp) =>
      fileTree.some((path) => pattern.test(path));
    const community = communityQuery.data;

    return [
      {
        name: 'License',
        passed: !!repoQuery.data.license,
        description: 'Repository has a license file.',
      },
      {
        name: 'README',
        passed: hasFile(/^README\.(md|txt|rst)$/i),
        description: 'Repository has a README file.',
      },
      {
        name: 'Contributing Guidelines',
        passed:
          hasFile(/^(docs\/)?CONTRIBUTING\.(md|txt|rst)$/i) ||
          (community?.files?.contributing !== null &&
            community?.files?.contributing !== undefined),
        description: 'Guidelines for new contributors.',
      },
      {
        name: 'Code of Conduct',
        passed:
          hasFile(/^(docs\/)?CODE_OF_CONDUCT\.(md|txt|rst)$/i) ||
          (community?.files?.code_of_conduct !== null &&
            community?.files?.code_of_conduct !== undefined),
        description: 'Standards for community behavior.',
      },
      {
        name: 'Pull Request Template',
        passed:
          hasFile(/^(\.github\/)?PULL_REQUEST_TEMPLATE\.(md|txt)$/i) ||
          hasFile(/^(\.github\/)?PULL_REQUEST_TEMPLATE\//i),
        description: 'Template for new pull requests.',
      },
      {
        name: 'Issue Templates',
        passed: hasFile(/^(\.github\/)?ISSUE_TEMPLATE\//i),
        description: 'Templates for reporting issues.',
      },
      {
        name: 'Security Policy',
        passed: hasFile(/^SECURITY\.(md|txt)$/i),
        description: 'Security policy for vulnerability reporting.',
      },
    ];
  }, [repoQuery.data, communityQuery.data, fileTree]);

  const score = useMemo(() => {
    if (checks.length === 0) return 0;
    const passed = checks.filter((c) => c.passed).length;
    return Math.round((passed / checks.length) * 100);
  }, [checks]);

  // Loading is gated on the two critical calls (repo + tree); community profile
  // and issue counts are best-effort and render fallbacks when missing.
  const loading =
    repoQuery.isLoading || (!!repoQuery.data && treeQuery.isLoading);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (repoQuery.error || !repoQuery.data) {
    return (
      <Box sx={{ p: 4, color: 'error.main', textAlign: 'center' }}>
        {githubErrorMessage(
          repoQuery.error,
          'Failed to load repository health data.',
        )}
      </Box>
    );
  }

  const repoData = repoQuery.data;
  const openIssuesCount =
    openIssuesQuery.data?.total_count ?? repoData.open_issues_count ?? null;
  const goodFirstIssueCount = goodFirstIssuesQuery.data?.total_count ?? null;
  const helpWantedCount = helpWantedQuery.data?.total_count ?? null;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          sx={{ color: 'text.primary', mb: 0.5, fontWeight: 600 }}
        >
          Repository Health Check & Feasibility
        </Typography>
        <Typography variant="body2" sx={{ color: STATUS_COLORS.open }}>
          An in-depth analysis of the repository's openness to contributions,
          code health, and community standards.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Left Column: Health Score & Activity */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              height: '100%',
            }}
          >
            {/* Health Score Card */}
            <Card
              sx={{
                p: 3,
                backgroundColor: 'background.default',
                border: `1px solid ${theme.palette.border.light}`,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '280px',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  mb: 2,
                }}
              >
                <CircularProgress
                  variant="determinate"
                  value={score}
                  size={120}
                  thickness={4}
                  sx={{
                    color:
                      score > 80
                        ? STATUS_COLORS.success
                        : score > 50
                          ? STATUS_COLORS.warning
                          : STATUS_COLORS.error,
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    component="div"
                    sx={{
                      color: 'text.primary',
                      fontWeight: 700,
                      fontSize: '32px',
                    }}
                  >
                    {score}%
                  </Typography>
                </Box>
              </Box>
              <Typography
                variant="h6"
                sx={{ color: 'text.primary', mb: 0.5, fontSize: '16px' }}
              >
                Health Score
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: STATUS_COLORS.open,
                  textAlign: 'center',
                  fontSize: '12px',
                }}
              >
                Based on community standards and best practices.
              </Typography>
            </Card>

            {/* Activity & Feasibility Card */}
            <Card
              sx={{
                p: 3,
                backgroundColor: 'background.default',
                border: `1px solid ${theme.palette.border.light}`,
                borderRadius: 2,
                flex: 1,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: 'text.primary',
                  mb: 2,
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <SpeedIcon sx={{ fontSize: 18 }} /> Activity & Feasibility
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant="body2"
                    sx={{ color: STATUS_COLORS.open, fontSize: '13px' }}
                  >
                    Last Push
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      fontSize: '13px',
                    }}
                  >
                    {formatDate(repoData.pushed_at)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant="body2"
                    sx={{ color: STATUS_COLORS.open, fontSize: '13px' }}
                  >
                    Created
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      fontSize: '13px',
                    }}
                  >
                    {formatDate(repoData.created_at)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant="body2"
                    sx={{ color: STATUS_COLORS.open, fontSize: '13px' }}
                  >
                    Status
                  </Typography>
                  <Chip
                    label={repoData.archived ? 'ARCHIVED' : 'ACTIVE'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '10px',
                      bgcolor: repoData.archived
                        ? 'error.dark'
                        : 'success.dark',
                      color: 'text.primary',
                    }}
                  />
                </Box>
              </Box>
              <Divider sx={{ my: 2, borderColor: 'border.light' }} />
              <Typography
                variant="body2"
                sx={{
                  color: STATUS_COLORS.open,
                  fontSize: '13px',
                  lineHeight: 1.6,
                }}
              >
                To start contributing, fork the repository, clone it locally,
                and check the <b>CONTRIBUTING.md</b> file for setup
                instructions.
              </Typography>
            </Card>
          </Box>
        </Grid>

        {/* Right Column: Issue Analysis & Standards */}
        <Grid item xs={12} md={8}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              height: '100%',
            }}
          >
            {/* Issue Analysis Card */}
            <Card
              sx={{
                p: 3,
                backgroundColor: 'background.default',
                border: `1px solid ${theme.palette.border.light}`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'text.primary',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <BugReportIcon sx={{ fontSize: 18 }} /> Issue Analysis
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6} md={6} lg={3}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.common.white, 0.03),
                      border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        color: 'text.primary',
                        fontSize: '24px',
                        mb: 0.5,
                      }}
                    >
                      {openIssuesCount ?? '-'}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: STATUS_COLORS.open, fontSize: '12px' }}
                    >
                      Open Issues
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} md={6} lg={3}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.common.white, 0.03),
                      border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        color: 'text.primary',
                        fontSize: '24px',
                        mb: 0.5,
                      }}
                    >
                      {repoData.forks_count}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: STATUS_COLORS.open, fontSize: '12px' }}
                    >
                      Forks
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} md={6} lg={3}>
                  <Box
                    component="a"
                    href={`https://github.com/${repositoryFullName}/issues?q=is%3Aissue+is%3Aopen+label%3A"good+first+issue"`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.common.white, 0.03),
                      border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                      height: '100%',
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.common.white, 0.08),
                        border: `1px solid ${theme.palette.border.light}`,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 1,
                        mb: 1,
                        minWidth: 0,
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="h4"
                          sx={{
                            color: 'text.primary',
                            fontSize: '24px',
                            mb: 0.5,
                          }}
                        >
                          {goodFirstIssueCount ?? '-'}
                        </Typography>
                        <Typography
                          sx={{
                            color: STATUS_COLORS.open,
                            fontSize: '12px',
                            fontWeight: 600,
                            lineHeight: 1.25,
                            wordBreak: 'break-word',
                          }}
                        >
                          Good First Issues
                        </Typography>
                      </Box>
                      <LaunchIcon
                        sx={{
                          fontSize: 16,
                          color: STATUS_COLORS.open,
                          mt: 0.25,
                          flexShrink: 0,
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontSize: '11px' }}
                    >
                      Perfect for beginners
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} md={6} lg={3}>
                  <Box
                    component="a"
                    href={`https://github.com/${repositoryFullName}/issues?q=is%3Aissue+is%3Aopen+label%3A"help+wanted"`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.common.white, 0.03),
                      border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                      height: '100%',
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.common.white, 0.08),
                        border: `1px solid ${theme.palette.border.light}`,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 1,
                        mb: 1,
                        minWidth: 0,
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="h4"
                          sx={{
                            color: 'text.primary',
                            fontSize: '24px',
                            mb: 0.5,
                          }}
                        >
                          {helpWantedCount ?? '-'}
                        </Typography>
                        <Typography
                          sx={{
                            color: STATUS_COLORS.open,
                            fontSize: '12px',
                            fontWeight: 600,
                            lineHeight: 1.25,
                            wordBreak: 'break-word',
                          }}
                        >
                          Help Wanted
                        </Typography>
                      </Box>
                      <LaunchIcon
                        sx={{
                          fontSize: 16,
                          color: STATUS_COLORS.open,
                          mt: 0.25,
                          flexShrink: 0,
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontSize: '11px' }}
                    >
                      General contributions
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>

            {/* Community Standards Checklist Card */}
            <Card
              sx={{
                p: 0,
                backgroundColor: 'background.default',
                border: `1px solid ${theme.palette.border.light}`,
                borderRadius: 2,
                flex: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${theme.palette.border.light}`,
                  backgroundColor: alpha(theme.palette.common.white, 0.03),
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <PeopleIcon sx={{ fontSize: 18 }} /> Community Standards
                </Typography>
              </Box>

              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {checks.map((check) => (
                    <Grid item xs={12} sm={6} key={check.name}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          bgcolor: 'surface.subtle',
                          border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 2,
                          height: '100%',
                          transition: 'background-color 0.2s',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.common.white, 0.04),
                          },
                        }}
                      >
                        <Box sx={{ mt: 0.5 }}>
                          {check.passed ? (
                            <CheckCircleIcon
                              sx={{
                                color: STATUS_COLORS.success,
                                fontSize: 22,
                              }}
                            />
                          ) : (
                            <CancelIcon
                              sx={{ color: STATUS_COLORS.error, fontSize: 22 }}
                            />
                          )}
                        </Box>
                        <Box>
                          <Typography
                            sx={{
                              color: 'text.primary',
                              fontWeight: 600,
                              fontSize: '14px',
                              mb: 0.5,
                            }}
                          >
                            {check.name}
                          </Typography>
                          <Typography
                            sx={{
                              color: STATUS_COLORS.open,
                              fontSize: '12px',
                              lineHeight: 1.5,
                            }}
                          >
                            {check.description}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RepositoryCheckTab;

import React, { useState, useEffect, useMemo } from 'react';
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
  type Theme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
// For Health Score
import SpeedIcon from '@mui/icons-material/Speed'; // For Activity
import LaunchIcon from '@mui/icons-material/Launch'; // Added import
import PeopleIcon from '@mui/icons-material/People'; // For Community
import BugReportIcon from '@mui/icons-material/BugReport';
import axios from 'axios';
import { STATUS_COLORS } from '../../theme';

interface RepositoryCheckTabProps {
  repositoryFullName: string;
}

interface HealthCheck {
  name: string;
  passed: boolean;
  description: string;
}

interface StatCardProps {
  value: number | string;
  label: string;
  hint: string;
  href?: string;
  theme: Theme;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  hint,
  href,
  theme,
}) => {
  const isLink = Boolean(href);
  const linkProps = isLink
    ? {
        component: 'a' as const,
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
      }
    : {};
  return (
    <Box
      {...linkProps}
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: 1,
        bgcolor: alpha(theme.palette.common.white, 0.03),
        border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
        height: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 1,
        textDecoration: 'none',
        cursor: isLink ? 'pointer' : 'default',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transition: isLink ? 'all 0.2s' : 'none',
        ...(isLink && {
          '&:hover': {
            bgcolor: alpha(theme.palette.common.white, 0.08),
            border: `1px solid ${theme.palette.border.light}`,
            transform: 'translateY(-2px)',
          },
        }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              color: 'text.primary',
              fontSize: { xs: '20px', md: '24px' },
              fontWeight: 600,
              lineHeight: 1.2,
              mb: 0.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {value}
          </Typography>
          <Typography
            sx={{
              color: STATUS_COLORS.open,
              fontSize: '12px',
              fontWeight: 600,
              lineHeight: 1.25,
              overflowWrap: 'break-word',
              hyphens: 'auto',
            }}
          >
            {label}
          </Typography>
        </Box>
        {isLink && (
          <LaunchIcon
            sx={{
              fontSize: 16,
              color: STATUS_COLORS.open,
              mt: 0.25,
              flexShrink: 0,
            }}
          />
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '11px',
          lineHeight: 1.3,
        }}
      >
        {hint}
      </Typography>
    </Box>
  );
};

const RepositoryCheckTab: React.FC<RepositoryCheckTabProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<any>(null);
  const [communityProfile, setCommunityProfile] = useState<any>(null);
  const [fileTree, setFileTree] = useState<string[]>([]);
  const [openIssuesCount, setOpenIssuesCount] = useState<number | null>(null);
  const [goodFirstIssueCount, setGoodFirstIssueCount] = useState<number | null>(
    null,
  );
  const [helpWantedCount, setHelpWantedCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch basic repo data
        const repoRes = await axios.get(
          `https://api.github.com/repos/${repositoryFullName}`,
        );
        setRepoData(repoRes.data);

        // Fetch community profile (health percentage etc)
        // Note: Community profile endpoint might be in preview but commonly available
        try {
          const communityRes = await axios.get(
            `https://api.github.com/repos/${repositoryFullName}/community/profile`,
          );
          setCommunityProfile(communityRes.data);
        } catch (e) {
          console.warn('Community profile not available', e);
        }

        // Fetch file tree for file existence checks (shallow, just top level + .github)
        // We can use the tree API or contents API. Tree is better.
        const branch = repoRes.data.default_branch || 'main';
        const treeRes = await axios.get(
          `https://api.github.com/repos/${repositoryFullName}/git/trees/${branch}?recursive=1`,
        );
        if (treeRes.data.tree) {
          setFileTree(
            treeRes.data.tree.map((node: { path: string }) => node.path),
          );
        }

        // Fetch issue counts
        try {
          const [openIssuesRes, gfiRes, hwRes] = await Promise.all([
            axios.get(
              `https://api.github.com/search/issues?q=repo:${repositoryFullName}+is:issue+is:open&per_page=1`,
            ),
            axios.get(
              `https://api.github.com/search/issues?q=repo:${repositoryFullName}+is:issue+is:open+label:"good+first+issue"&per_page=1`,
            ),
            axios.get(
              `https://api.github.com/search/issues?q=repo:${repositoryFullName}+is:issue+is:open+label:"help+wanted"&per_page=1`,
            ),
          ]);
          setOpenIssuesCount(openIssuesRes.data.total_count);
          setGoodFirstIssueCount(gfiRes.data.total_count);
          setHelpWantedCount(hwRes.data.total_count);
        } catch (e) {
          console.warn('Failed to fetch issue counts', e);
          if (repoRes.data?.open_issues_count !== undefined) {
            setOpenIssuesCount(repoRes.data.open_issues_count);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to fetch repo check data', err);
        setError('Failed to load repository health data.');
      } finally {
        setLoading(false);
      }
    };

    if (repositoryFullName) {
      fetchData();
    }
  }, [repositoryFullName]);

  const checks: HealthCheck[] = useMemo(() => {
    if (!repoData || !fileTree) return [];

    const hasFile = (pattern: RegExp) =>
      fileTree.some((path) => pattern.test(path));

    return [
      {
        name: 'License',
        passed: !!repoData.license,
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
          (communityProfile?.files?.contributing !== null &&
            communityProfile?.files?.contributing !== undefined),
        description: 'Guidelines for new contributors.',
      },
      {
        name: 'Code of Conduct',
        passed:
          hasFile(/^(docs\/)?CODE_OF_CONDUCT\.(md|txt|rst)$/i) ||
          (communityProfile?.files?.code_of_conduct !== null &&
            communityProfile?.files?.code_of_conduct !== undefined),
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
  }, [repoData, communityProfile, fileTree]);

  const score = useMemo(() => {
    if (checks.length === 0) return 0;
    const passed = checks.filter((c) => c.passed).length;
    return Math.round((passed / checks.length) * 100);
  }, [checks]);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, color: 'error.main', textAlign: 'center' }}>{error}</Box>
    );
  }

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
        <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row', md: 'column' },
              gap: 2,
              height: '100%',
              alignItems: 'stretch',
            }}
          >
            {/* Health Score Card */}
            <Card
              sx={{
                p: { xs: 2, md: 3 },
                backgroundColor: 'background.default',
                border: `1px solid ${theme.palette.border.light}`,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: { sm: 1, md: 'unset' },
                minWidth: 0,
                minHeight: { xs: 220, sm: 240, md: 280 },
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
                p: { xs: 2, md: 3 },
                backgroundColor: 'background.default',
                border: `1px solid ${theme.palette.border.light}`,
                borderRadius: 2,
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
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
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: STATUS_COLORS.open,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    Last Push
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      fontSize: '13px',
                      textAlign: 'right',
                      minWidth: 0,
                    }}
                  >
                    {formatDate(repoData.pushed_at)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: STATUS_COLORS.open,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    Created
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      fontSize: '13px',
                      textAlign: 'right',
                      minWidth: 0,
                    }}
                  >
                    {formatDate(repoData.created_at)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: STATUS_COLORS.open,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
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
                      flexShrink: 0,
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
        <Grid item xs={12} md={8} sx={{ minWidth: 0 }}>
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
                p: { xs: 2, md: 3 },
                backgroundColor: 'background.default',
                border: `1px solid ${theme.palette.border.light}`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ mb: { xs: 2, md: 3 } }}>
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

              <Grid container spacing={{ xs: 1.5, md: 2 }}>
                {/* Stat: Open Issues */}
                <Grid item xs={6} md={6} xl={3} sx={{ minWidth: 0 }}>
                  <StatCard
                    value={
                      openIssuesCount !== null
                        ? openIssuesCount
                        : (repoData.open_issues_count ?? '-')
                    }
                    label="Open Issues"
                    hint="Currently open"
                    theme={theme}
                  />
                </Grid>

                {/* Stat: Forks */}
                <Grid item xs={6} md={6} xl={3} sx={{ minWidth: 0 }}>
                  <StatCard
                    value={repoData.forks_count}
                    label="Forks"
                    hint="Total forks"
                    theme={theme}
                  />
                </Grid>

                {/* Action: Good First Issues */}
                <Grid item xs={6} md={6} xl={3} sx={{ minWidth: 0 }}>
                  <StatCard
                    value={
                      goodFirstIssueCount !== null ? goodFirstIssueCount : '-'
                    }
                    label="Good First Issues"
                    hint="Perfect for beginners"
                    href={`https://github.com/${repositoryFullName}/issues?q=is%3Aissue+is%3Aopen+label%3A"good+first+issue"`}
                    theme={theme}
                  />
                </Grid>

                {/* Action: Help Wanted */}
                <Grid item xs={6} md={6} xl={3} sx={{ minWidth: 0 }}>
                  <StatCard
                    value={helpWantedCount !== null ? helpWantedCount : '-'}
                    label="Help Wanted"
                    hint="General contributions"
                    href={`https://github.com/${repositoryFullName}/issues?q=is%3Aissue+is%3Aopen+label%3A"help+wanted"`}
                    theme={theme}
                  />
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

              <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                <Grid container spacing={{ xs: 1.5, md: 2 }}>
                  {checks.map((check) => (
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      key={check.name}
                      sx={{ minWidth: 0 }}
                    >
                      <Box
                        sx={{
                          p: { xs: 1.5, md: 2 },
                          borderRadius: 1,
                          bgcolor: 'surface.subtle',
                          border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: { xs: 1.5, md: 2 },
                          height: '100%',
                          minWidth: 0,
                          transition: 'background-color 0.2s',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.common.white, 0.04),
                          },
                        }}
                      >
                        <Box sx={{ mt: 0.5, flexShrink: 0 }}>
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
                        <Box sx={{ minWidth: 0 }}>
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

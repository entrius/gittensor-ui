import React from 'react';
import { alpha, Avatar, Box, Card, Tooltip, Typography } from '@mui/material';
import type { MinerRepositoryEvaluation } from '../../api/models/Dashboard';
import { tooltipSlotProps } from '../../theme';
import { credibilityColor } from '../../utils/format';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { minerRepositoryPath } from '../../utils';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';

type ViewMode = 'prs' | 'issues';

interface MinerRepoStandingCardProps {
  repo: MinerRepositoryEvaluation;
  viewMode: ViewMode;
}

const FONT_MONO = '"JetBrains Mono", monospace';
const TABULAR_NUMS = '"tnum" 1, "ss01" 1';
const INACTIVE_OPACITY = 0.42;

/** Build the link to a repository's Miners tab. */
const repoMinersHref = (repositoryFullName: string): string =>
  minerRepositoryPath(repositoryFullName, { tab: 'miners' });

/* ── Eligibility marker — dot + word, echoes leaderboard MinerCard ─── */
const EligibilityLabel: React.FC<{ eligible: boolean }> = ({ eligible }) => (
  <Box
    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}
  >
    <Box
      sx={(theme) => ({
        width: 5,
        height: 5,
        borderRadius: '50%',
        backgroundColor: eligible
          ? theme.palette.status.merged
          : alpha(theme.palette.text.tertiary, 0.6),
        flexShrink: 0,
      })}
    />
    <Typography
      sx={(theme) => ({
        fontFamily: FONT_MONO,
        fontSize: '0.7rem',
        fontWeight: 500,
        color: eligible
          ? theme.palette.text.primary
          : theme.palette.text.tertiary,
        letterSpacing: '0.01em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      })}
    >
      {eligible ? 'Eligible' : 'Ineligible'}
    </Typography>
  </Box>
);

/* ── Section overline ─────────────────────────────────────────────── */
const Overline: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'right';
}> = ({ children, align = 'left' }) => (
  <Typography
    sx={(theme) => ({
      fontFamily: FONT_MONO,
      fontSize: '0.58rem',
      fontWeight: 500,
      color: theme.palette.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: '0.16em',
      lineHeight: 1,
      textAlign: align,
    })}
  >
    {children}
  </Typography>
);

/* ── Inline stat: "Merged 142" with subtle separator dot ──────────── */
const InlineStat: React.FC<{
  label: string;
  value: number;
  isLast: boolean;
  eligible: boolean;
}> = ({ label, value, isLast, eligible }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}>
    <Typography
      sx={(theme) => ({
        fontFamily: FONT_MONO,
        fontSize: '0.62rem',
        fontWeight: 500,
        color: theme.palette.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      })}
    >
      {label}
    </Typography>
    <Typography
      sx={(theme) => ({
        fontFamily: FONT_MONO,
        fontSize: '0.88rem',
        fontWeight: 700,
        color: eligible
          ? theme.palette.text.primary
          : alpha(theme.palette.text.tertiary, INACTIVE_OPACITY),
        fontFeatureSettings: TABULAR_NUMS,
        lineHeight: 1,
      })}
    >
      {value.toLocaleString()}
    </Typography>
    {!isLast && (
      <Typography
        sx={(theme) => ({
          fontFamily: FONT_MONO,
          fontSize: '0.82rem',
          color: alpha(theme.palette.text.tertiary, 0.5),
          ml: 0.5,
          lineHeight: 1,
        })}
      >
        ·
      </Typography>
    )}
  </Box>
);

/**
 * One per-repository standing card. Echoes the leaderboard `MinerCard`
 * visual language (header strip, hero metric / credibility split, activity
 * row) but is scoped to a single `miner_evaluations` repository row.
 *
 * Links to that repository's Miners tab. Ineligible repos are muted and
 * surface the server-computed `failedReason`; credibility is shown as a
 * plain number — never compared against a fixed gate.
 */
const MinerRepoStandingCard: React.FC<MinerRepoStandingCardProps> = ({
  repo,
  viewMode,
}) => {
  const isIssueMode = viewMode === 'issues';
  const linkProps = useLinkBehavior<HTMLAnchorElement>(
    repoMinersHref(repo.repositoryFullName),
  );

  const eligible = isIssueMode ? repo.isIssueEligible : repo.isEligible;
  const credibility = isIssueMode ? repo.issueCredibility : repo.credibility;
  const score = isIssueMode ? repo.issueDiscoveryScore : repo.totalScore;
  const owner = repo.repositoryFullName.split('/')[0];
  const repoName =
    repo.repositoryFullName.split('/').slice(1).join('/') ||
    repo.repositoryFullName;

  const segments = isIssueMode
    ? [
        { label: 'Solved', value: repo.totalSolvedIssues },
        { label: 'Valid', value: repo.totalValidSolvedIssues },
        { label: 'Open', value: repo.totalOpenIssues },
      ]
    : [
        { label: 'Merged', value: repo.totalMergedPrs },
        { label: 'Open', value: repo.totalOpenPrs },
        { label: 'Closed', value: repo.totalClosedPrs },
      ];

  return (
    <Card
      component="a"
      {...linkProps}
      sx={(theme) => ({
        ...linkResetSx,
        position: 'relative',
        p: 0,
        backgroundColor: 'transparent',
        border: `1px solid ${theme.palette.border.medium}`,
        borderRadius: 1.5,
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        opacity: eligible ? 1 : 0.72,
        transition:
          'background-color 0.22s ease, border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.status.merged, 0.04),
          borderColor: alpha(theme.palette.status.merged, 0.28),
          transform: 'scale(1.015)',
          boxShadow: `0 8px 24px -6px ${alpha(
            theme.palette.common.black,
            0.18,
          )}`,
          opacity: 1,
        },
        '&:hover .repo-standing-name': {
          textDecoration: 'underline',
          textDecorationColor: alpha(theme.palette.status.merged, 0.55),
          textDecorationThickness: '1px',
          textUnderlineOffset: '3px',
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
      })}
      elevation={0}
    >
      {/* ── Header strip — avatar + repo name + eligibility ──── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          alignItems: 'center',
          columnGap: 1.25,
          px: 2,
          py: 1.5,
        }}
      >
        <Avatar
          src={getRepositoryOwnerAvatarSrc(owner)}
          alt={owner}
          sx={(theme) => ({
            width: 38,
            height: 38,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundColor: theme.palette.surface.subtle,
            filter: eligible ? 'none' : 'grayscale(100%)',
          })}
        />
        <Box
          sx={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.4,
          }}
        >
          <Typography
            className="repo-standing-name"
            title={repo.repositoryFullName}
            sx={(theme) => ({
              fontFamily: FONT_MONO,
              fontSize: '0.9rem',
              fontWeight: 600,
              color: theme.palette.text.primary,
              opacity: eligible ? 1 : INACTIVE_OPACITY,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.005em',
              lineHeight: 1.2,
            })}
          >
            {repoName}
          </Typography>
          <Typography
            sx={(theme) => ({
              fontFamily: FONT_MONO,
              fontSize: '0.66rem',
              color: theme.palette.text.tertiary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            })}
          >
            {owner}
          </Typography>
        </Box>
      </Box>

      {/* ── Hero: score │ credibility ─────────────────────────── */}
      <Box
        sx={(theme) => ({
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'stretch',
          borderTop: `1px solid ${theme.palette.border.light}`,
          borderBottom: `1px solid ${theme.palette.border.light}`,
          backgroundColor: alpha(theme.palette.text.primary, 0.012),
        })}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <Overline>{isIssueMode ? 'Discovery score' : 'Repo score'}</Overline>
          <Typography
            sx={(theme) => ({
              fontFamily: FONT_MONO,
              fontSize: '1.55rem',
              fontWeight: 700,
              color: eligible
                ? theme.palette.text.primary
                : alpha(theme.palette.text.primary, INACTIVE_OPACITY),
              lineHeight: 1,
              letterSpacing: '-0.028em',
              fontFeatureSettings: TABULAR_NUMS,
              mt: 0.7,
            })}
          >
            {score.toFixed(2)}
          </Typography>
        </Box>

        <Box
          sx={(theme) => ({
            px: 2,
            py: 1.5,
            borderLeft: `1px solid ${theme.palette.border.light}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.7,
            minWidth: 92,
          })}
        >
          <Overline align="right">Credibility</Overline>
          <Typography
            sx={{
              fontFamily: FONT_MONO,
              fontSize: '1.1rem',
              fontWeight: 700,
              color: credibilityColor(credibility),
              fontFeatureSettings: TABULAR_NUMS,
              lineHeight: 1,
            }}
          >
            {(credibility * 100).toFixed(1)}%
          </Typography>
        </Box>
      </Box>

      {/* ── Activity row + eligibility verdict ────────────────── */}
      <Box
        sx={{
          px: 2,
          py: 1.4,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box>
          <Overline>{isIssueMode ? 'Issue activity' : 'PR activity'}</Overline>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 1,
              mt: 0.7,
              flexWrap: 'wrap',
            }}
          >
            {segments.map((segment, index) => (
              <InlineStat
                key={segment.label}
                label={segment.label}
                value={segment.value}
                isLast={index === segments.length - 1}
                eligible={eligible}
              />
            ))}
          </Box>
        </Box>

        {eligible ? (
          <EligibilityLabel eligible />
        ) : repo.failedReason ? (
          <Tooltip
            title={repo.failedReason}
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
                minWidth: 0,
              }}
            >
              <Box sx={{ flexShrink: 0, pt: '1px' }}>
                <EligibilityLabel eligible={false} />
              </Box>
              <Typography
                sx={(theme) => ({
                  fontSize: '0.72rem',
                  color: alpha(theme.palette.text.primary, 0.55),
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                })}
              >
                {repo.failedReason}
              </Typography>
            </Box>
          </Tooltip>
        ) : (
          <EligibilityLabel eligible={false} />
        )}
      </Box>
    </Card>
  );
};

export { repoMinersHref };
export default MinerRepoStandingCard;

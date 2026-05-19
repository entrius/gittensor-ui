import React from 'react';
import {
  Box,
  Button,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import { usePullRequestDetails, type CommitLog } from '../../api';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import { parseNumber } from '../../utils/ExplorerUtils';
import { buildMergedPillDefs } from '../../utils/multiplierDefs';

const tipProps = {
  ...tooltipSlotProps,
  tooltip: { sx: { ...tooltipSlotProps.tooltip.sx, maxWidth: 280 } },
};

// Placeholder widths for the multiplier-pill skeletons — varied so the
// loading row reads like a row of pills, not a single progress bar.
const PILL_SKELETON_WIDTHS = [78, 62, 90, 70, 84] as const;

interface MultiplierPillProps {
  label: string;
  value: number;
  tooltip: React.ReactNode;
  format?: 'multiplier' | 'value' | 'percent';
  pillColor?: string;
}

const MultiplierPill: React.FC<MultiplierPillProps> = ({
  label,
  value,
  tooltip,
  format = 'multiplier',
  pillColor,
}) => {
  const color =
    pillColor ??
    (format === 'multiplier'
      ? value === 1
        ? STATUS_COLORS.neutral
        : value > 1
          ? STATUS_COLORS.success
          : STATUS_COLORS.warningOrange
      : STATUS_COLORS.neutral);

  const display =
    format === 'percent'
      ? `${(value * 100).toFixed(1)}%`
      : format === 'value'
        ? parseNumber(value).toFixed(2)
        : `×${parseNumber(value).toFixed(2)}`;

  return (
    <Tooltip title={tooltip} arrow placement="top" slotProps={tipProps}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.25,
          borderRadius: 1,
          border: `1px solid ${alpha(color, 0.25)}`,
          backgroundColor: alpha(color, 0.06),
          cursor: 'pointer',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.62rem',
            color: STATUS_COLORS.neutral,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color,
          }}
        >
          {display}
        </Typography>
      </Box>
    </Tooltip>
  );
};

interface MinerPrScoreDetailProps {
  pr: CommitLog;
  /**
   * Gates the per-PR `/details` fetch — only `true` while the row is open,
   * so collapsed rows never fire N concurrent multiplier-detail requests.
   */
  expanded: boolean;
}

/**
 * Expanded-row content for a single PR in the merged Pull Requests table:
 * the score-multiplier breakdown (pills sourced from the PR details API),
 * a delimited stats line, and links out to the PR detail page / GitHub.
 */
const MinerPrScoreDetail: React.FC<MinerPrScoreDetailProps> = ({
  pr,
  expanded,
}) => {
  const prLinkProps = useLinkBehavior<HTMLAnchorElement>(
    `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
  );

  const isMerged = !!pr.mergedAt;
  const isOpen = !pr.mergedAt && pr.prState !== 'CLOSED';
  const baseScore = parseFloat(pr.baseScore || '0');
  const collateral = parseFloat(pr.collateralScore || '0');

  // Fetch multiplier breakdown only while expanded — avoids N concurrent
  // /details calls per page.
  const { data: prDetails, isLoading: isLoadingDetails } =
    usePullRequestDetails(
      pr.repository,
      pr.pullRequestNumber,
      expanded && isMerged,
    );

  return (
    <Box
      sx={{
        px: 2,
        py: 1.75,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        backgroundColor: 'surface.subtle',
        borderBottom: '1px solid',
        borderColor: 'border.subtle',
      }}
    >
      {/* Score multiplier chips — sourced from the PR details API. While the
          fetch is in flight, skeletons hold the pills' space. */}
      {isMerged && (prDetails || isLoadingDetails) && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
            alignItems: 'center',
          }}
        >
          {prDetails
            ? buildMergedPillDefs(prDetails).map((def) => (
                <MultiplierPill
                  key={def.key}
                  label={def.label}
                  value={def.value}
                  format={def.format}
                  tooltip={
                    <Stack direction="column">
                      <Typography variant="tooltipLabel">
                        {def.tooltipTitle}
                      </Typography>
                      <Typography variant="tooltipDesc">
                        {def.tooltipDesc}
                      </Typography>
                    </Stack>
                  }
                />
              ))
            : PILL_SKELETON_WIDTHS.map((width, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  animation="wave"
                  width={width}
                  height={23}
                  sx={{ borderRadius: 1, bgcolor: 'border.light' }}
                />
              ))}
        </Box>
      )}

      {/* Stats row with delimiter */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {[
          baseScore > 0 && `base ${baseScore.toFixed(2)}`,
          `+${pr.additions} / -${pr.deletions}`,
          `${pr.commitCount} commit${pr.commitCount !== 1 ? 's' : ''}`,
          pr.tokenScore != null &&
            `tokens ${parseNumber(pr.tokenScore).toFixed(2)}`,
          pr.totalNodesScored != null &&
            parseNumber(pr.totalNodesScored) > 0 &&
            `${pr.totalNodesScored} nodes`,
          pr.structuralCount != null &&
            parseNumber(pr.structuralCount) > 0 &&
            `${pr.structuralCount} structural (${parseNumber(pr.structuralScore).toFixed(2)})`,
          pr.leafCount != null &&
            parseNumber(pr.leafCount) > 0 &&
            `${pr.leafCount} leaf (${parseNumber(pr.leafScore).toFixed(2)})`,
        ]
          .filter(Boolean)
          .map((stat, i, arr) => (
            <React.Fragment key={i}>
              <Typography
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  color: (t) => alpha(t.palette.text.primary, 0.4),
                }}
              >
                {stat}
              </Typography>
              {i < arr.length - 1 && (
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.65rem',
                    color: (t) => alpha(t.palette.text.primary, 0.2),
                    mx: 0.25,
                  }}
                >
                  ·
                </Typography>
              )}
            </React.Fragment>
          ))}
        {isOpen && collateral > 0 && (
          <>
            <Typography
              component="span"
              sx={{
                fontSize: '0.65rem',
                color: (t) => alpha(t.palette.text.primary, 0.2),
                mx: 0.25,
              }}
            >
              ·
            </Typography>
            <Typography
              component="span"
              sx={{
                fontSize: '0.65rem',
                color: STATUS_COLORS.warningOrange,
              }}
            >
              collateral: -{collateral.toFixed(4)}
            </Typography>
          </>
        )}
      </Box>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
        <Button
          size="small"
          startIcon={<OpenInNewIcon sx={{ fontSize: '0.85rem' }} />}
          component="a"
          {...prLinkProps}
          onClick={(e) => {
            e.stopPropagation();
            prLinkProps.onClick(e);
          }}
          sx={{
            ...linkResetSx,
            fontSize: '0.65rem',
            textTransform: 'none',
            color: 'primary.main',
            px: 1,
            py: 0.25,
            minWidth: 'auto',
            '&:hover': { backgroundColor: 'surface.elevated' },
          }}
        >
          PR Details
        </Button>
        <Button
          size="small"
          startIcon={<GitHubIcon sx={{ fontSize: '0.85rem' }} />}
          component="a"
          href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          sx={{
            fontSize: '0.65rem',
            textTransform: 'none',
            color: (t) => alpha(t.palette.text.primary, 0.5),
            px: 1,
            py: 0.25,
            minWidth: 'auto',
            '&:hover': {
              backgroundColor: 'surface.elevated',
              color: 'text.primary',
            },
          }}
        >
          GitHub
        </Button>
      </Box>
    </Box>
  );
};

export default MinerPrScoreDetail;

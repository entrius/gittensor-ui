import React from 'react';
import {
  Card,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  alpha,
  Tooltip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReactECharts from 'echarts-for-react';
import { usePullRequestDetails } from '../../api';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import theme, {
  CHART_COLORS,
  STATUS_COLORS,
  TEXT_OPACITY,
  tooltipSlotProps,
} from '../../theme';
import { buildMultiplierGrid } from '../../utils/multiplierDefs';

interface PRDetailsCardProps {
  repository: string;
  pullRequestNumber: number;
  hideHeader?: boolean;
}

const PRDetailsCard: React.FC<PRDetailsCardProps> = ({
  repository,
  pullRequestNumber,
  hideHeader = false,
}) => {
  // Fetch detailed PR data directly
  const { data: prDetails, isLoading: isDetailsLoading } =
    usePullRequestDetails(repository, pullRequestNumber);

  const repoLinkProps = useLinkBehavior<HTMLAnchorElement>(
    `/miners/repository?name=${encodeURIComponent(repository)}`,
    { state: { backLabel: `Back to PR #${pullRequestNumber}` } },
  );
  if (isDetailsLoading) {
    return (
      <Card
        sx={{
          backgroundColor: alpha(theme.palette.common.white, 0.02),
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'border.subtle',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (!prDetails) {
    return (
      <Card
        sx={{
          backgroundColor: alpha(theme.palette.common.white, 0.02),
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'border.subtle',
          p: 4,
        }}
      >
        <Typography
          sx={{
            color: alpha(STATUS_COLORS.error, 0.9),
            fontSize: '0.9rem',
          }}
        >
          Pull request not found.
        </Typography>
      </Card>
    );
  }

  const [owner] = repository.split('/');
  const isOpenPR = prDetails.prState === 'OPEN';
  const multipliers = buildMultiplierGrid(prDetails, isOpenPR);
  const structuralScoreNum = parseFloat(String(prDetails.structuralScore ?? 0));
  const leafScoreNum = parseFloat(String(prDetails.leafScore ?? 0));
  const showTokenDonut = structuralScoreNum > 0 || leafScoreNum > 0;
  const tokenScoreValue = parseFloat(prDetails.tokenScore ?? '0');
  type DetailItem = {
    label: string;
    value: string;
    subValue?: string;
    tooltip?: string;
    additions?: number;
    deletions?: number;
    isMonospace?: boolean;
  };
  const detailItems: DetailItem[] = [
    {
      label: 'Base Score',
      value: parseFloat(prDetails.baseScore ?? '0').toFixed(2),
    },
    {
      label: 'Tokens Scored',
      value: (prDetails.totalNodesScored ?? 0).toLocaleString(),
    },
    { label: 'Token Score', value: tokenScoreValue.toFixed(2) },
    {
      label: 'Structural',
      value: String(prDetails.structuralCount ?? '-'),
      subValue:
        prDetails.structuralScore != null
          ? `Score ${structuralScoreNum.toFixed(2)}`
          : undefined,
      tooltip:
        'Functions, classes, and modules scored via AST analysis. Structural nodes carry more weight per node because they represent high-value code organization.',
    },
    {
      label: 'Leaf',
      value: String(prDetails.leafCount ?? '-'),
      subValue:
        prDetails.leafScore != null
          ? `Score ${leafScoreNum.toFixed(2)}`
          : undefined,
      tooltip:
        'Individual statements and expressions scored via AST analysis. More leaf nodes means a larger diff, but structural nodes contribute more score per node.',
    },
    {
      label: 'Changes',
      value: '',
      additions: prDetails.additions,
      deletions: prDetails.deletions,
    },
    { label: 'Commits', value: String(prDetails.commits ?? '-') },
    ...(prDetails.hotkey
      ? [{ label: 'Hotkey', value: prDetails.hotkey, isMonospace: true }]
      : []),
  ];
  const tokenDonutOption = showTokenDonut
    ? {
        backgroundColor: 'transparent',
        title: {
          text: tokenScoreValue.toFixed(2),
          subtext: 'Token Score',
          left: 'center',
          top: '38%',
          textStyle: {
            color: theme.palette.text.primary,
            fontSize: 24,
            fontWeight: 'bold',
          },
          subtextStyle: {
            color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
            fontSize: 11,
            fontWeight: 500,
          },
        },
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
          backgroundColor: alpha(theme.palette.common.black, 0.9),
          borderColor: alpha(theme.palette.common.white, 0.15),
          borderWidth: 1,
          textStyle: { color: theme.palette.text.primary },
        },
        series: [
          {
            name: 'Token Composition',
            type: 'pie',
            radius: ['58%', '72%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 6,
              borderColor: theme.palette.background.paper,
              borderWidth: 3,
            },
            label: { show: false, position: 'center' },
            emphasis: { label: { show: false }, scale: true, scaleSize: 5 },
            labelLine: { show: false },
            data: [
              {
                value: structuralScoreNum,
                name: 'Structural',
                itemStyle: { color: CHART_COLORS.merged },
              },
              {
                value: leafScoreNum,
                name: 'Leaf',
                itemStyle: { color: CHART_COLORS.open },
              },
            ],
          },
        ],
      }
    : null;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: 'transparent',
        p: 3,
      }}
      elevation={0}
    >
      {/* PR Header */}
      {!hideHeader && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            component="a"
            {...repoLinkProps}
            sx={{
              ...linkResetSx,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            <Avatar
              src={`https://avatars.githubusercontent.com/${owner}`}
              alt={owner}
              sx={{
                width: 64,
                height: 64,
                border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                backgroundColor:
                  owner === 'opentensor'
                    ? theme.palette.common.white
                    : owner === 'bitcoin'
                      ? '#F7931A'
                      : 'transparent',
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: 'text.primary',
                  fontSize: '1.3rem',
                  fontWeight: 500,
                }}
              >
                #{pullRequestNumber}
              </Typography>
              {(() => {
                const statusColor =
                  prDetails.prState === 'CLOSED'
                    ? theme.palette.status.closed
                    : prDetails.prState === 'MERGED'
                      ? theme.palette.status.merged
                      : theme.palette.status.open;
                return (
                  <Box
                    sx={{
                      display: 'inline-block',
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      backgroundColor: alpha(statusColor, 0.2),
                      border: '1px solid',
                      borderColor: alpha(statusColor, 0.4),
                    }}
                  >
                    <Typography
                      sx={{
                        color: statusColor,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {prDetails.prState}
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
            <Typography
              sx={{
                color: 'text.primary',
                fontSize: '1rem',
                fontWeight: 400,
                mb: 0.5,
              }}
            >
              {prDetails.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                component="a"
                {...repoLinkProps}
                sx={{
                  ...linkResetSx,
                  color: alpha(
                    theme.palette.common.white,
                    TEXT_OPACITY.tertiary,
                  ),
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                  },
                }}
              >
                {repository}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          border: `1px solid ${theme.palette.border.light}`,
          borderRadius: 3,
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          backgroundColor: alpha(theme.palette.common.white, 0.015),
        }}
      >
        <Typography
          sx={{
            color: alpha(theme.palette.common.white, TEXT_OPACITY.secondary),
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontWeight: 600,
            mb: 2,
          }}
        >
          Score Story
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: { md: 'center' },
          }}
        >
          {multipliers.map((m, index) => {
            const numeric = parseFloat(m.value);
            const accent = isNaN(numeric)
              ? theme.palette.text.tertiary
              : numeric > 1
                ? STATUS_COLORS.success
                : numeric < 1
                  ? STATUS_COLORS.warningOrange
                  : theme.palette.text.tertiary;
            const chip = (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.75,
                  py: 1,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(accent, 0.35)}`,
                  backgroundColor: alpha(accent, 0.1),
                  cursor: m.isCredibility ? 'help' : 'default',
                }}
              >
                <Typography
                  sx={{
                    color: alpha(
                      theme.palette.common.white,
                      TEXT_OPACITY.secondary,
                    ),
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                  }}
                >
                  {m.label}
                </Typography>
                <Typography
                  sx={{
                    color: accent,
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  {m.value}
                </Typography>
                {m.isCredibility && (
                  <InfoOutlinedIcon
                    sx={{ fontSize: '0.85rem', color: accent, opacity: 0.7 }}
                  />
                )}
              </Box>
            );
            return m.isCredibility ? (
              <Tooltip
                key={index}
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography
                      sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1 }}
                    >
                      Credibility Multiplier
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        color: alpha(theme.palette.common.white, 0.9),
                      }}
                    >
                      Based on your PR success rate, scaled to reward
                      consistency.
                    </Typography>
                  </Box>
                }
                arrow
                placement="top"
                slotProps={tooltipSlotProps}
              >
                {chip}
              </Tooltip>
            ) : (
              <React.Fragment key={index}>{chip}</React.Fragment>
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: showTokenDonut ? 'minmax(0, 1fr) 220px' : '1fr',
          },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Box
          sx={{
            border: `1px solid ${theme.palette.border.light}`,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {detailItems.map((item, index, arr) => (
            <Box
              key={index}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
                alignItems: 'center',
                rowGap: 0.5,
                columnGap: 2,
                px: { xs: 2, sm: 2.5 },
                py: 1.5,
                borderBottom:
                  index < arr.length - 1
                    ? `1px solid ${theme.palette.border.subtle}`
                    : undefined,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.02),
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Typography
                  sx={{
                    color: alpha(
                      theme.palette.common.white,
                      TEXT_OPACITY.tertiary,
                    ),
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </Typography>
                {item.tooltip && (
                  <Tooltip
                    title={item.tooltip}
                    arrow
                    slotProps={tooltipSlotProps}
                  >
                    <InfoOutlinedIcon
                      sx={{ fontSize: '0.75rem', cursor: 'help', opacity: 0.5 }}
                    />
                  </Tooltip>
                )}
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}
              >
                {item.additions !== undefined &&
                item.deletions !== undefined ? (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color: alpha(theme.palette.diff.additions, 0.9),
                        fontSize: '1rem',
                        fontWeight: 600,
                      }}
                    >
                      +{item.additions}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        color: alpha(
                          theme.palette.common.white,
                          TEXT_OPACITY.muted,
                        ),
                        fontSize: '1rem',
                      }}
                    >
                      /
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        color: alpha(theme.palette.diff.deletions, 0.9),
                        fontSize: '1rem',
                        fontWeight: 600,
                      }}
                    >
                      -{item.deletions}
                    </Typography>
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      color: theme.palette.text.primary,
                      fontSize: '1rem',
                      fontWeight: 600,
                      fontFamily: item.isMonospace ? 'monospace' : undefined,
                      wordBreak: 'break-all',
                    }}
                  >
                    {item.value}
                  </Typography>
                )}
                {item.subValue && (
                  <Typography
                    sx={{
                      color: alpha(
                        theme.palette.common.white,
                        TEXT_OPACITY.tertiary,
                      ),
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}
                  >
                    {item.subValue}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
        {showTokenDonut && tokenDonutOption && (
          <Box
            sx={{
              border: `1px solid ${theme.palette.border.light}`,
              borderRadius: 3,
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                color: alpha(
                  theme.palette.common.white,
                  TEXT_OPACITY.secondary,
                ),
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600,
                mb: 1,
                alignSelf: 'flex-start',
              }}
            >
              Token Composition
            </Typography>
            <Box sx={{ width: '100%', height: 160 }}>
              <ReactECharts
                option={tokenDonutOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
                notMerge
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                mt: 1,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {[
                { label: 'Structural', color: CHART_COLORS.merged },
                { label: 'Leaf', color: CHART_COLORS.open },
              ].map(({ label, color }) => (
                <Box
                  key={label}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: color,
                    }}
                  />
                  <Typography
                    sx={{
                      color: alpha(
                        theme.palette.common.white,
                        TEXT_OPACITY.tertiary,
                      ),
                      fontSize: '0.7rem',
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default PRDetailsCard;

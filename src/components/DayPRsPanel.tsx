import React, { useMemo } from 'react';
import { Box, Card, Typography, alpha, useTheme } from '@mui/material';
import { format, parseISO } from 'date-fns';
import type { CommitLog } from '../api';
import { LinkBox } from './common/linkBehavior';
import { STATUS_COLORS, TEXT_OPACITY, scrollbarSx } from '../theme';
import { getPrHref } from '../routes.helpers';

interface DayPRsPanelProps {
  date: string;
  prs: CommitLog[];
  username: string;
}

const prStateColor = (pr: CommitLog) => {
  if (pr.mergedAt) return STATUS_COLORS.merged;
  if (pr.prState === 'CLOSED') return STATUS_COLORS.closed;
  return STATUS_COLORS.info;
};

const prStateLabel = (pr: CommitLog) => {
  if (pr.mergedAt) return 'Merged';
  if (pr.prState === 'CLOSED') return 'Closed';
  return 'Open';
};

const DayPRsPanel: React.FC<DayPRsPanelProps> = ({ date, prs, username }) => {
  const theme = useTheme();

  const dayPRs = useMemo(() => {
    return prs
      .filter((pr) => {
        if (!pr.mergedAt) return false;
        const d = new Date(pr.mergedAt);
        if (isNaN(d.getTime())) return false;
        return format(d, 'yyyy-MM-dd') === date;
      })
      .sort((a, b) => {
        const ta = a.mergedAt ? new Date(a.mergedAt).getTime() : 0;
        const tb = b.mergedAt ? new Date(b.mergedAt).getTime() : 0;
        return tb - ta;
      });
  }, [date, prs]);

  const headerLabel = format(parseISO(date), 'MMMM d, yyyy');

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'surface.subtle',
        }}
      >
        <Typography
          sx={{
            color: 'text.primary',
            fontSize: '0.95rem',
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          Contribution activity
        </Typography>
        <Typography
          sx={{
            color: alpha(theme.palette.common.white, TEXT_OPACITY.faint),
            fontSize: '0.75rem',
            mt: 0.25,
          }}
        >
          {headerLabel}
        </Typography>
      </Box>

      {dayPRs.length === 0 ? (
        <Box sx={{ px: 2.5, py: 4, textAlign: 'center' }}>
          <Typography
            sx={{
              color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
              fontSize: '0.85rem',
            }}
          >
            {username} had no activity during this period.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            maxHeight: 420,
            overflowY: 'auto',
            ...scrollbarSx,
          }}
        >
          {dayPRs.map((pr, idx) => {
            const dotColor = prStateColor(pr);
            const stateLabel = prStateLabel(pr);
            const detailsHref = getPrHref(pr.repository, pr.pullRequestNumber);
            const timeLabel = pr.mergedAt
              ? format(new Date(pr.mergedAt), 'h:mm a')
              : '';
            return (
              <LinkBox
                key={`${pr.repository}-${pr.pullRequestNumber}-${idx}`}
                href={detailsHref}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  px: 2.5,
                  py: 1.5,
                  borderBottom:
                    idx === dayPRs.length - 1 ? 'none' : '1px solid',
                  borderColor: 'border.light',
                  transition: 'background-color 0.15s',
                  '&:hover': {
                    backgroundColor: 'surface.subtle',
                    '& .pr-title': {
                      textDecoration: 'underline',
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                    mt: '6px',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.25,
                    }}
                  >
                    <Typography
                      sx={{
                        color: theme.palette.status.info,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {pr.repository}#{pr.pullRequestNumber}
                    </Typography>
                    <Typography
                      sx={{
                        color: alpha(
                          theme.palette.common.white,
                          TEXT_OPACITY.faint,
                        ),
                        fontSize: '0.7rem',
                        flexShrink: 0,
                      }}
                    >
                      · {stateLabel}
                      {timeLabel ? ` · ${timeLabel}` : ''}
                    </Typography>
                  </Box>
                  <Typography
                    className="pr-title"
                    sx={{
                      color: 'text.primary',
                      fontSize: '0.85rem',
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {pr.pullRequestTitle}
                  </Typography>
                </Box>
              </LinkBox>
            );
          })}
        </Box>
      )}
    </Card>
  );
};

export default DayPRsPanel;

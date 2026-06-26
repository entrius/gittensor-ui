/**
 * Change-history tab: the audit trail of hyperparameter edits for a repository
 * (GET /repos/:repo/config-history via useRepositoryConfigHistory), newest first.
 * Each entry shows who edited it (maintainer vs admin), when, an optional note,
 * and a per-changed-key before -> after diff.
 */
import React from 'react';
import { alpha, Box, Card, Chip, Skeleton, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { useRepositoryConfigHistory } from '../../api';
import type { RepositoryConfigEdit } from '../../api/ReposApi';
import { formatDate } from '../../utils/format';
import { STATUS_COLORS } from '../../theme';

interface Props {
  repositoryFullName: string;
}

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const formatTimestamp = (iso: string): string => {
  const date = formatDate(iso);
  const time = new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} · ${time}`;
};

const ActorChip: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => (
  <Chip
    label={isAdmin ? 'Admin' : 'Maintainer'}
    sx={{
      height: 18,
      fontSize: '0.6rem',
      fontWeight: 700,
      letterSpacing: '0.04em',
      bgcolor: isAdmin
        ? alpha(STATUS_COLORS.warningOrange, 0.15)
        : alpha(STATUS_COLORS.info, 0.15),
      color: isAdmin ? STATUS_COLORS.warningOrange : STATUS_COLORS.info,
      border: '1px solid',
      borderColor: isAdmin
        ? alpha(STATUS_COLORS.warningOrange, 0.4)
        : alpha(STATUS_COLORS.info, 0.4),
      '& .MuiChip-label': { px: 0.75 },
    }}
  />
);

/** One audit entry: actor, time, note, and the before -> after diff per key. */
const EditEntry: React.FC<{ edit: RepositoryConfigEdit }> = ({ edit }) => {
  const before = edit.configBefore ?? {};
  const after = edit.configAfter ?? {};
  const keys =
    edit.changedKeys && edit.changedKeys.length > 0 ? edit.changedKeys : [];
  const lifecycle =
    edit.configBefore === null
      ? 'created'
      : edit.configAfter === null
        ? 'deleted'
        : null;

  return (
    <Card sx={{ p: { xs: 2, md: 2.5 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {edit.editorLogin ?? `github:${edit.editorGithubId}`}
          </Typography>
          <ActorChip isAdmin={edit.isAdmin} />
          {lifecycle && (
            <Chip
              label={lifecycle}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                textTransform: 'uppercase',
              }}
            />
          )}
        </Box>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          {formatTimestamp(edit.createdAt)}
        </Typography>
      </Box>

      {edit.note && (
        <Typography
          sx={{
            fontSize: '0.78rem',
            color: 'text.secondary',
            fontStyle: 'italic',
            mt: 1,
          }}
        >
          “{edit.note}”
        </Typography>
      )}

      {lifecycle !== 'created' && keys.length > 0 && (
        <Box
          sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}
        >
          {keys.map((key) => (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
                flexWrap: 'wrap',
                fontSize: '0.75rem',
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.72rem',
                  color: 'text.primary',
                  fontWeight: 600,
                }}
              >
                {key}
              </Typography>
              <Typography
                component="span"
                sx={{ color: 'text.secondary', fontSize: '0.72rem' }}
              >
                {formatValue(before[key])}
              </Typography>
              <Typography component="span" sx={{ color: 'text.secondary' }}>
                →
              </Typography>
              <Typography
                component="span"
                sx={{ color: STATUS_COLORS.info, fontSize: '0.72rem' }}
              >
                {formatValue(after[key])}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
};

const RepositoryConfigHistoryTab: React.FC<Props> = ({
  repositoryFullName,
}) => {
  const { data, isLoading } = useRepositoryConfigHistory(repositoryFullName);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={110}
            sx={{ bgcolor: 'surface.light', borderRadius: 3 }}
          />
        ))}
      </Box>
    );
  }

  const edits = data ?? [];
  const latest = edits[0];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Box>
          <Typography variant="sectionTitle" sx={{ fontSize: '1.05rem' }}>
            Change history
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {latest
              ? `Last edited by ${latest.editorLogin ?? `github:${latest.editorGithubId}`} on ${formatTimestamp(latest.createdAt)}.`
              : 'Audit trail of hyperparameter edits made through the API.'}
          </Typography>
        </Box>
      </Box>

      {edits.length === 0 ? (
        <Typography
          sx={{ color: 'text.secondary', fontSize: '0.85rem', py: 4 }}
        >
          No hyperparameter edits have been recorded for this repository yet.
        </Typography>
      ) : (
        edits.map((edit) => <EditEntry key={edit.id} edit={edit} />)
      )}
    </Box>
  );
};

export default RepositoryConfigHistoryTab;

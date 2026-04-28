import React from 'react';
import { Box, Card, Tooltip, Typography, alpha } from '@mui/material';
import { Check, Close } from '@mui/icons-material';

export interface LanguageRow {
  extension: string;
  language: string | null;
  weight: string;
}

interface LanguageCardProps {
  lang: LanguageRow;
  maxWeight: number;
}

export const LanguageCard: React.FC<LanguageCardProps> = ({
  lang,
  maxWeight,
}) => {
  const weightValue = parseFloat(lang.weight) || 0;
  const weightPct =
    maxWeight > 0
      ? Math.max(0, Math.min(100, (weightValue / maxWeight) * 100))
      : 0;
  const hasTokenScoring = !!lang.language;

  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        p: 2,
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        backgroundColor: theme.palette.surface.transparent,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      })}
    >
      {/* Extension + token scoring */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'text.primary' }}
        >
          {lang.extension}
        </Typography>
        <Tooltip
          title={
            hasTokenScoring
              ? 'Token scoring supported — AST parsing for accurate contribution measurement'
              : 'Token scoring not supported'
          }
          arrow
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {hasTokenScoring ? (
              <Check
                sx={(theme) => ({
                  fontSize: '1.1rem',
                  color: theme.palette.status.success,
                })}
              />
            ) : (
              <Close
                sx={(theme) => ({
                  fontSize: '1.1rem',
                  color: theme.palette.status.error,
                })}
              />
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Language name */}
      <Typography
        sx={(theme) => ({
          fontSize: '0.85rem',
          color: lang.language
            ? 'text.secondary'
            : alpha(theme.palette.common.white, 0.3),
          flex: 1,
        })}
      >
        {lang.language ?? '—'}
      </Typography>

      {/* Weight + bar */}
      <Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: 'text.tertiary',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Weight
          </Typography>
          <Typography
            sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }}
          >
            {lang.weight}
          </Typography>
        </Box>
        <Box
          aria-hidden="true"
          sx={(theme) => ({
            position: 'relative',
            height: 4,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.text.primary, 0.08),
            overflow: 'hidden',
          })}
        >
          <Box
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              width: `${weightPct}%`,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            })}
          />
        </Box>
      </Box>
    </Card>
  );
};

export default LanguageCard;

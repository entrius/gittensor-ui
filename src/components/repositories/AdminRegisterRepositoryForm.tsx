/**
 * Admin-only direct repository registration (POST /repos). Unlike the public
 * request form on this page (which emails the team), this writes straight to the
 * das registry and is gated on the admin session. Initial config fields are
 * optional — anything left blank is omitted and can be set later via the
 * hyperparameters edit form. Bounds reuse repoConfig.ts (TOP_LEVEL_FIELD_DEFS).
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useRegisterRepository } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import {
  TOP_LEVEL_FIELD_DEFS,
  boundsLabel,
  validateFieldValue,
} from '../../utils/repoConfig';

const FULL_NAME_RE = /^[^/\s]+\/[^/\s]+$/;

const AdminRegisterRepositoryForm: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const mutation = useRegisterRepository();

  const [fullName, setFullName] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  const fullNameError =
    fullName.trim() !== '' && !FULL_NAME_RE.test(fullName.trim())
      ? 'Use the form owner/repo'
      : undefined;

  // Validate only the optional config fields the admin actually filled in.
  const fieldErrors = useMemo(() => {
    const e: Record<string, string> = {};
    for (const def of TOP_LEVEL_FIELD_DEFS) {
      const raw = values[def.key] ?? '';
      if (raw.trim() === '') continue;
      const err = validateFieldValue(def, raw);
      if (err) e[def.key] = err;
    }
    return e;
  }, [values]);

  const canSubmit =
    FULL_NAME_RE.test(fullName.trim()) &&
    Object.keys(fieldErrors).length === 0 &&
    !mutation.isPending;

  if (!isAdmin) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const config: Record<string, number> = {};
    for (const def of TOP_LEVEL_FIELD_DEFS) {
      const raw = values[def.key] ?? '';
      if (raw.trim() !== '') config[def.key] = Number(raw);
    }
    mutation.mutate(
      { fullName: fullName.trim(), config },
      {
        onSuccess: () =>
          navigate(
            `/miners/repository?name=${encodeURIComponent(fullName.trim())}&tab=hyperparameters`,
          ),
      },
    );
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={(theme) => ({
        mb: 3,
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        border: `1px solid ${theme.palette.border.medium}`,
        backgroundColor: theme.palette.surface.subtle,
      })}
    >
      <Typography
        sx={(theme) => ({
          color: theme.palette.text.secondary,
          fontSize: '0.66rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          mb: 2,
        })}
      >
        Admin — register a repository directly
      </Typography>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(mutation.error?.response?.data as { message?: string })?.message ??
            'Failed to register the repository.'}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <TextField
          label="Repository full name"
          required
          fullWidth
          value={fullName}
          placeholder="owner/repo"
          onChange={(e) => setFullName(e.target.value)}
          error={Boolean(fullNameError)}
          helperText={fullNameError ?? 'e.g. entrius/gittensor'}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          {TOP_LEVEL_FIELD_DEFS.map((def) => (
            <TextField
              key={def.key}
              size="small"
              type="number"
              label={`${def.label} (optional)`}
              value={values[def.key] ?? ''}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [def.key]: e.target.value }))
              }
              error={Boolean(fieldErrors[def.key])}
              helperText={
                fieldErrors[def.key] ??
                `${def.key}${boundsLabel(def) ? ` · ${boundsLabel(def)}` : ''}`
              }
              fullWidth
            />
          ))}
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 3, justifyContent: 'flex-end' }}
      >
        <Button type="submit" variant="contained" disabled={!canSubmit}>
          {mutation.isPending ? 'Registering…' : 'Register repository'}
        </Button>
      </Stack>
    </Box>
  );
};

export default AdminRegisterRepositoryForm;

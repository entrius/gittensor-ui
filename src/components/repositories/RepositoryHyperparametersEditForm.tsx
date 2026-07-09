/**
 * Editable form for a repository's hyperparameters (PATCH /repos/:repo/config).
 *
 * Reuses the field defs/bounds from repoConfig.ts so the inputs, bounds hints and
 * client-side validation match the das config-validation.ts contract. Only the
 * fields the user actually changed are sent, so:
 *   - a maintainer's once-a-day cooldown isn't spent on a no-op save, and
 *   - fields left at their global default don't get frozen into overrides.
 *
 * emission_share is admin-only (read-only chip for maintainers). Nested
 * time_decay is sent in full when any of its knobs change, because das merges
 * config one level deep and would otherwise drop the untouched siblings.
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useUpdateRepositoryConfig } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import type { RepositoryConfig } from '../../api/models/Dashboard';
import {
  ELIGIBILITY_FIELD_DEFS,
  SCORING_FIELD_DEFS,
  TIME_DECAY_FIELD_DEFS,
  TOP_LEVEL_FIELD_DEFS,
  boundsLabel,
  validateFieldValue,
  type RepoConfigFieldDef,
} from '../../utils/repoConfig';

interface Props {
  repositoryFullName: string;
  config: RepositoryConfig;
  onClose: () => void;
}

const TOP_LEVEL_ACCESSORS: Record<string, keyof RepositoryConfig> = {
  emission_share: 'emissionShare',
  issue_discovery_share: 'issueDiscoveryShare',
  maintainer_cut: 'maintainerCut',
  default_label_multiplier: 'defaultLabelMultiplier',
  fixed_base_score: 'fixedBaseScore',
};

const numToInput = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
};

/** Initial input string for a field, reading the repo's stored value or default. */
function initialFor(
  def: RepoConfigFieldDef,
  config: RepositoryConfig,
  group: 'top' | 'eligibility' | 'scoring' | 'timeDecay',
): string {
  if (group === 'top') {
    const raw = config[TOP_LEVEL_ACCESSORS[def.key]];
    // fixed_base_score is nullable — empty means "not set".
    if (def.key === 'fixed_base_score') return numToInput(raw);
    return numToInput(raw ?? def.default);
  }
  let raw: unknown;
  if (group === 'eligibility')
    raw = (config.eligibility as Record<string, unknown> | undefined)?.[
      def.key
    ];
  else if (group === 'scoring')
    raw = (config.scoring as Record<string, unknown> | undefined)?.[def.key];
  else
    raw = (config.scoring?.time_decay as Record<string, unknown> | undefined)?.[
      def.key
    ];
  return numToInput(raw ?? def.default);
}

const RepositoryHyperparametersEditForm: React.FC<Props> = ({
  repositoryFullName,
  config,
  onClose,
}) => {
  const { isAdmin } = useAuth();
  const mutation = useUpdateRepositoryConfig(repositoryFullName);

  // Flat value map keyed by `${group}.${key}` so every input is independent.
  const initialValues = useMemo(() => {
    const v: Record<string, string> = {};
    for (const def of TOP_LEVEL_FIELD_DEFS)
      v[`top.${def.key}`] = initialFor(def, config, 'top');
    for (const def of ELIGIBILITY_FIELD_DEFS)
      v[`eligibility.${def.key}`] = initialFor(def, config, 'eligibility');
    for (const def of SCORING_FIELD_DEFS)
      v[`scoring.${def.key}`] = initialFor(def, config, 'scoring');
    for (const def of TIME_DECAY_FIELD_DEFS)
      v[`timeDecay.${def.key}`] = initialFor(def, config, 'timeDecay');
    return v;
  }, [config]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [trusted, setTrusted] = useState<boolean>(
    Boolean(config.trustedLabelPipeline),
  );
  const initialBranches = (config.additionalAcceptableBranches ?? []).join(
    ', ',
  );
  const [branches, setBranches] = useState<string>(initialBranches);
  const [note, setNote] = useState<string>('');

  const setValue = (id: string, val: string) =>
    setValues((prev) => ({ ...prev, [id]: val }));

  // Per-field validation errors (fixed_base_score may be empty = cleared).
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const check = (id: string, def: RepoConfigFieldDef, optional = false) => {
      const raw = values[id] ?? '';
      if (optional && raw.trim() === '') return;
      const err = validateFieldValue(def, raw);
      if (err) e[id] = err;
    };
    for (const def of TOP_LEVEL_FIELD_DEFS) {
      if (def.key === 'emission_share' && !isAdmin) continue;
      check(`top.${def.key}`, def, def.key === 'fixed_base_score');
    }
    for (const def of ELIGIBILITY_FIELD_DEFS)
      check(`eligibility.${def.key}`, def);
    for (const def of SCORING_FIELD_DEFS) check(`scoring.${def.key}`, def);
    for (const def of TIME_DECAY_FIELD_DEFS) check(`timeDecay.${def.key}`, def);
    return e;
  }, [values, isAdmin]);

  const hasErrors = Object.keys(errors).length > 0;

  // Build a snake_case patch of only the fields that actually changed.
  const patch = useMemo(() => {
    const out: Record<string, unknown> = {};

    // Top-level scalars.
    for (const def of TOP_LEVEL_FIELD_DEFS) {
      const id = `top.${def.key}`;
      if (values[id] === initialValues[id]) continue;
      if (def.key === 'emission_share' && !isAdmin) continue;
      if (def.key === 'fixed_base_score') {
        out[def.key] = values[id].trim() === '' ? null : Number(values[id]);
      } else {
        out[def.key] = Number(values[id]);
      }
    }

    // Eligibility (das merges this object one level deep — partial is fine).
    const eligibility: Record<string, number> = {};
    for (const def of ELIGIBILITY_FIELD_DEFS) {
      const id = `eligibility.${def.key}`;
      if (values[id] !== initialValues[id])
        eligibility[def.key] = Number(values[id]);
    }
    if (Object.keys(eligibility).length) out.eligibility = eligibility;

    // Scoring scalars + time_decay. time_decay is sent whole when any knob
    // changes (one-level merge would drop untouched siblings otherwise).
    const scoring: Record<string, unknown> = {};
    for (const def of SCORING_FIELD_DEFS) {
      const id = `scoring.${def.key}`;
      if (values[id] !== initialValues[id])
        scoring[def.key] = Number(values[id]);
    }
    const timeDecayChanged = TIME_DECAY_FIELD_DEFS.some(
      (def) =>
        values[`timeDecay.${def.key}`] !==
        initialValues[`timeDecay.${def.key}`],
    );
    if (timeDecayChanged) {
      const td: Record<string, number> = {};
      for (const def of TIME_DECAY_FIELD_DEFS)
        td[def.key] = Number(values[`timeDecay.${def.key}`]);
      scoring.time_decay = td;
    }
    if (Object.keys(scoring).length) out.scoring = scoring;

    // Boolean + branches.
    if (trusted !== Boolean(config.trustedLabelPipeline))
      out.trusted_label_pipeline = trusted;
    if (branches !== initialBranches) {
      out.additional_acceptable_branches = branches
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);
    }
    return out;
  }, [
    values,
    initialValues,
    isAdmin,
    trusted,
    branches,
    config,
    initialBranches,
  ]);

  const isDirty = Object.keys(patch).length > 0;

  const handleSave = () => {
    if (!isDirty || hasErrors) return;
    mutation.mutate(
      { config: patch, note: note.trim() || undefined },
      { onSuccess: () => onClose() },
    );
  };

  const renderField = (def: RepoConfigFieldDef, group: string) => {
    const id = `${group}.${def.key}`;
    const bounds = boundsLabel(def);
    return (
      <TextField
        key={id}
        size="small"
        type="number"
        label={def.label}
        value={values[id] ?? ''}
        onChange={(e) => setValue(id, e.target.value)}
        error={Boolean(errors[id])}
        helperText={errors[id] ?? `${def.key}${bounds ? ` · ${bounds}` : ''}`}
        fullWidth
      />
    );
  };

  const grid = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
    gap: 2,
  } as const;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {mutation.isError && (
        <Alert severity="error">
          {(mutation.error?.response?.data as { message?: string })?.message ??
            'Failed to save changes. You may lack write access or be within the edit cooldown.'}
        </Alert>
      )}

      <Card sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography
          variant="sectionTitle"
          sx={{ fontSize: '0.95rem', mb: 1.5 }}
        >
          Emission &amp; pools
        </Typography>
        <Box sx={grid}>
          {TOP_LEVEL_FIELD_DEFS.map((def) => {
            if (def.key === 'emission_share' && !isAdmin) {
              return (
                <TextField
                  key="top.emission_share"
                  size="small"
                  label="Emission share"
                  value={values['top.emission_share'] ?? ''}
                  helperText="Admin-only field"
                  disabled
                  fullWidth
                />
              );
            }
            return renderField(def, 'top');
          })}
        </Box>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Switch
              checked={trusted}
              onChange={(e) => setTrusted(e.target.checked)}
            />
          }
          label="Trusted label pipeline"
        />
        <TextField
          sx={{ mt: 1 }}
          size="small"
          label="Scorable branches (comma-separated)"
          value={branches}
          onChange={(e) => setBranches(e.target.value)}
          helperText="Extra branches beyond the default branch, e.g. test, develop"
          fullWidth
        />
      </Card>

      <Card sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography
          variant="sectionTitle"
          sx={{ fontSize: '0.95rem', mb: 1.5 }}
        >
          Eligibility
        </Typography>
        <Box sx={grid}>
          {ELIGIBILITY_FIELD_DEFS.map((def) => renderField(def, 'eligibility'))}
        </Box>
      </Card>

      <Card sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography
          variant="sectionTitle"
          sx={{ fontSize: '0.95rem', mb: 1.5 }}
        >
          Scoring
        </Typography>
        <Box sx={grid}>
          {SCORING_FIELD_DEFS.map((def) => renderField(def, 'scoring'))}
        </Box>
      </Card>

      <Card sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography
          variant="sectionTitle"
          sx={{ fontSize: '0.95rem', mb: 1.5 }}
        >
          Time decay
        </Typography>
        <Box sx={grid}>
          {TIME_DECAY_FIELD_DEFS.map((def) => renderField(def, 'timeDecay'))}
        </Box>
      </Card>

      <Divider sx={{ borderColor: 'border.light' }} />

      <TextField
        size="small"
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        helperText="Recorded in the change history."
        fullWidth
        multiline
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isDirty || hasErrors || mutation.isPending}
        >
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        {!isDirty && (
          <Chip
            label="No changes"
            size="small"
            sx={{ color: 'text.secondary' }}
          />
        )}
      </Box>
    </Box>
  );
};

export default RepositoryHyperparametersEditForm;

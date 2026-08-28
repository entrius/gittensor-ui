import React from 'react';
import {
  Box,
  ButtonBase,
  Link,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { ServingRelease } from '../../api';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';
import { TEXT_OPACITY, scrollbarSx, tooltipSlotProps } from '../../theme';

// Images for every blessed runtime/model live under the entrius org; the release row says which one to pull.
const DOCKER_HUB_URL = 'https://hub.docker.com/u/entrius';

const MONO = '"JetBrains Mono", monospace';

/** The exact commands miners run — the runtime and, beside it, the attest container that answers the validators'
 *  hardware challenge on every GPU of the box. Kept in one place so docs can link here. */
export const buildSparkinferRunCommand = (release: ServingRelease): string =>
  [
    `docker run -d --name sparkinfer --gpus all --restart unless-stopped -p 127.0.0.1:8080:8080 -v sparkmodels:/opt/sparkinfer/models -e MODEL_SHA256=${release.modelSha256} -e SPARKINFER_DETERMINISTIC=1 ${release.image}`,
    release.attestImage
      ? `docker run -d --name gt-attest --gpus all --restart unless-stopped -p 127.0.0.1:8081:8081 ${release.attestImage}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

const CopyButton: React.FC<{ text: string; label: string }> = ({
  text,
  label,
}) => {
  const { copied, copy, liveRegion } = useClipboardCopy({
    copiedMessage: `${label} copied to clipboard`,
  });
  return (
    <>
      <Tooltip
        title={copied ? 'Copied' : `Copy ${label}`}
        arrow
        placement="top"
        slotProps={tooltipSlotProps}
      >
        <ButtonBase
          onClick={() => void copy(text)}
          aria-label={`Copy ${label}`}
          sx={{
            p: 0.5,
            borderRadius: '4px',
            color: (t) =>
              copied
                ? t.palette.status.success
                : alpha(t.palette.text.primary, 0.55),
            '&:hover': { color: (t) => t.palette.text.primary },
            '&:focus-visible': {
              outline: (t) => `2px solid ${t.palette.primary.main}`,
            },
          }}
        >
          {copied ? (
            <CheckIcon sx={{ fontSize: '1rem' }} />
          ) : (
            <ContentCopyIcon sx={{ fontSize: '1rem' }} />
          )}
        </ButtonBase>
      </Tooltip>
      {liveRegion}
    </>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  copyable?: boolean;
}> = ({ label, value, copyable = false }) => {
  const theme = useTheme();
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="dataLabel"
        sx={{
          display: 'block',
          color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
        <Typography
          component="span"
          sx={{
            fontFamily: MONO,
            fontSize: '0.82rem',
            overflowWrap: 'anywhere',
            minWidth: 0,
          }}
        >
          {value}
        </Typography>
        {copyable ? <CopyButton text={value} label={label} /> : null}
      </Stack>
    </Box>
  );
};

/**
 * The validator-enforced runtime/model pin. This is the canonical place
 * miners get the pin and digest — docs link here — so nothing is hard-coded.
 */
export const ComputeReleaseCard: React.FC<{ release: ServingRelease }> = ({
  release,
}) => {
  const theme = useTheme();
  const command = buildSparkinferRunCommand(release);
  const muted = alpha(theme.palette.common.white, TEXT_OPACITY.muted);
  return (
    <Box
      component="section"
      aria-labelledby="compute-release-title"
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 2.5 },
      }}
    >
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 1.5 }}
      >
        <Typography
          id="compute-release-title"
          variant="sectionTitle"
          component="h2"
        >
          Current release
        </Typography>
        <Typography variant="caption" sx={{ color: muted }}>
          Enforced by the validator this round — pin exactly this.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.5, sm: 2 },
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          mb: 2,
        }}
      >
        <Field label="Model" value={release.modelId} />
        <Field label="Runtime pin" value={release.runtimePin} copyable />
        <Field label="Model file" value={release.modelFile} />
        <Field label="Image" value={release.image} copyable />
      </Box>
      {release.attestImage && (
        <Box sx={{ mb: 2 }}>
          <Field label="Attest image" value={release.attestImage} copyable />
        </Box>
      )}
      <Box sx={{ mb: 2 }}>
        <Field label="Model SHA-256" value={release.modelSha256} copyable />
      </Box>

      <Typography
        variant="dataLabel"
        sx={{ display: 'block', color: muted, mb: 0.5 }}
      >
        Run it
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          borderRadius: 2,
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: theme.palette.surface.subtle,
          px: 1.5,
          py: 1,
        }}
      >
        <Box
          component="pre"
          sx={{
            m: 0,
            flex: 1,
            minWidth: 0,
            overflowX: 'hidden',
            fontFamily: MONO,
            fontSize: '0.78rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            ...scrollbarSx,
          }}
        >
          <code>{command}</code>
        </Box>
        <CopyButton text={command} label="docker commands" />
      </Box>

      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 1.5 }}>
        {[{ label: 'Docker Hub', href: DOCKER_HUB_URL }].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.8rem',
              color: theme.palette.status.info,
            }}
          >
            {link.label}
            <OpenInNewIcon sx={{ fontSize: '0.85rem' }} aria-hidden />
          </Link>
        ))}
      </Stack>
    </Box>
  );
};

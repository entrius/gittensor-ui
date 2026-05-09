import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { isRepoTracked } from '../api';
import { useLinkBehavior } from '../components/common/linkBehavior';
import { Page } from '../components/layout';
import { SEO } from '../components';

type VerifyResult =
  | { tracked: true }
  | { tracked: false; reason: 'not-installed' | 'transient' | 'bad-url' };

const extractRepoFullName = (url: string): string | null => {
  const match = url
    .trim()
    .match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/i);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
};

const verifyRepoTracked = async (repoUrl: string): Promise<VerifyResult> => {
  const fullName = extractRepoFullName(repoUrl);
  if (!fullName) return { tracked: false, reason: 'bad-url' };
  try {
    const tracked = await isRepoTracked(fullName);
    return tracked
      ? { tracked: true }
      : { tracked: false, reason: 'not-installed' };
  } catch {
    return { tracked: false, reason: 'transient' };
  }
};

type FieldKey =
  | 'repoUrl'
  | 'description'
  | 'githubHandle'
  | 'otherSocial'
  | 'email'
  | 'appInstalled';

type FieldErrors = Partial<Record<FieldKey, string>>;

const validators: Record<
  FieldKey,
  (value: string | boolean) => string | undefined
> = {
  repoUrl: (value) => {
    const trimmed = String(value).trim();
    if (!trimmed) return 'Repository URL is required.';
    if (!/^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(trimmed)) {
      return 'Use the full GitHub URL, e.g. https://github.com/owner/repo';
    }
    return undefined;
  },
  description: (value) =>
    String(value).trim() ? undefined : 'Short description is required.',
  githubHandle: (value) =>
    String(value).trim() ? undefined : 'GitHub handle is required.',
  otherSocial: (value) =>
    String(value).trim() ? undefined : 'Another link or handle is required.',
  email: (value) => {
    const trimmed = String(value).trim();
    if (!trimmed) return 'Contact email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Enter a valid email address.';
    }
    return undefined;
  },
  appInstalled: (value) =>
    value ? undefined : 'Install the GitHub App before submitting.',
};

const RepositoryRegistrationPage: React.FC = () => {
  const installAppLink = useLinkBehavior<HTMLAnchorElement>(
    'https://github.com/apps/gittensor-mirror',
  );
  const docsLink = useLinkBehavior<HTMLAnchorElement>(
    'https://docs.gittensor.io',
  );

  const [repoUrl, setRepoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [githubHandle, setGithubHandle] = useState('');
  const [otherSocial, setOtherSocial] = useState('');
  const [email, setEmail] = useState('');
  const [appInstalled, setAppInstalled] = useState(false);

  const [botcheck, setBotcheck] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateField = (key: FieldKey, value: string | boolean) => {
    const message = validators[key](value);
    setErrors((prev) => ({ ...prev, [key]: message }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: FieldErrors = {
      repoUrl: validators.repoUrl(repoUrl),
      description: validators.description(description),
      githubHandle: validators.githubHandle(githubHandle),
      otherSocial: validators.otherSocial(otherSocial),
      email: validators.email(email),
      appInstalled: validators.appInstalled(appInstalled),
    };
    const filtered: FieldErrors = {};
    (Object.keys(next) as FieldKey[]).forEach((key) => {
      const message = next[key];
      if (message) filtered[key] = message;
    });
    setErrors(filtered);
    if (Object.keys(filtered).length > 0) return;

    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      setSubmitError(
        'Form is not configured. Please contact the team directly.',
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const verification = await verifyRepoTracked(repoUrl);
    if (!verification.tracked) {
      setSubmitting(false);
      if (verification.reason === 'transient') {
        setSubmitError(
          "We couldn't verify your repository right now. Please try again in a moment.",
        );
      } else if (verification.reason === 'bad-url') {
        setSubmitError(
          'Could not parse the repository URL. Use the form https://github.com/owner/repo.',
        );
      } else {
        setSubmitError(
          "We don't see the Gittensor Mirror App installed on this repository. Install the App in Step 1 above and try again.",
        );
      }
      return;
    }

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Repository registration: ${repoUrl}`,
          from_name: 'Gittensor Registration Form',
          repository_url: repoUrl,
          description,
          github_handle: githubHandle,
          other_handle: otherSocial,
          contact_email: email,
          app_installed_confirmed: appInstalled,
          // Honeypot — bots fill this, humans don't see it.
          botcheck,
        }),
      });
      const data = (await response.json()) as { success?: boolean };
      if (!data.success) {
        throw new Error('Submission failed.');
      }
      setSubmitted(true);
    } catch {
      setSubmitError(
        'Something went wrong submitting your registration. Please try again, or email the team directly.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Page title="Registration submitted">
        <SEO
          title="Registration submitted - Gittensor"
          description="Thanks for registering your repository with Gittensor."
        />
        <Box
          sx={{
            maxWidth: 640,
            mx: 'auto',
            width: '100%',
            py: { xs: 6, md: 8 },
            px: { xs: 2, md: 0 },
            textAlign: 'center',
          }}
        >
          <CheckCircleOutlineIcon
            sx={(theme) => ({
              color: theme.palette.status.merged,
              fontSize: 56,
              mb: 2,
            })}
          />
          <Typography
            sx={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: { xs: '1.85rem', md: '2.2rem' },
              lineHeight: 1.1,
              mb: 2,
            }}
          >
            Registration received.
          </Typography>
          <Typography
            sx={(theme) => ({
              color: alpha(theme.palette.text.primary, 0.68),
              fontSize: '0.95rem',
              lineHeight: 1.6,
              mb: 4,
            })}
          >
            We&apos;ll review your submission and reach out at{' '}
            <Box component="strong">{email}</Box>. In the meantime, the public
            repositories list shows everything currently scored.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="center"
          >
            <Button
              component="a"
              href="/"
              variant="outlined"
              sx={(theme) => ({
                minHeight: 44,
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 800,
                borderColor: theme.palette.border.medium,
                color: theme.palette.text.primary,
              })}
            >
              Back to home
            </Button>
            <Button
              component="a"
              href="/repositories"
              variant="contained"
              sx={(theme) => ({
                minHeight: 44,
                borderRadius: 1.5,
                backgroundColor: theme.palette.status.merged,
                color: theme.palette.common.black,
                textTransform: 'none',
                fontWeight: 900,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.status.merged, 0.9),
                },
              })}
            >
              View repositories
            </Button>
          </Stack>
        </Box>
      </Page>
    );
  }

  return (
    <Page title="Register Your Repository">
      <SEO
        title="Register Your Repository - Gittensor"
        description="Submit your repository to be recognized by the Gittensor network."
      />
      <Box
        sx={{
          maxWidth: 640,
          mx: 'auto',
          width: '100%',
          py: { xs: 3, md: 5 },
          px: { xs: 2, md: 0 },
        }}
      >
        <Stack spacing={1.5} sx={{ mb: 4 }}>
          <Typography
            sx={(theme) => ({
              color: theme.palette.text.secondary,
              fontSize: '0.66rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            })}
          >
            For repository maintainers
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: { xs: '2rem', md: '2.45rem' },
              lineHeight: 1.05,
            }}
          >
            Register your repository.
          </Typography>
          <Typography
            sx={(theme) => ({
              color: alpha(theme.palette.text.primary, 0.68),
              fontSize: '0.95rem',
              lineHeight: 1.6,
            })}
          >
            Get your repo recognized so the network&apos;s miners can contribute
            pull requests against your open issues. Two steps: install the
            GitHub App, then fill out the form below.
          </Typography>
        </Stack>

        <Box
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
              mb: 1,
            })}
          >
            Step 1 — install the GitHub App
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.6, mb: 2 }}>
            Install the Gittensor Mirror App on the repository (or organization)
            you want to register. Read-only access only.
          </Typography>
          <Button
            component="a"
            {...installAppLink}
            variant="outlined"
            endIcon={<OpenInNewIcon />}
            sx={(theme) => ({
              minHeight: 44,
              borderRadius: 1.5,
              borderColor: theme.palette.border.medium,
              color: theme.palette.text.primary,
              textTransform: 'none',
              fontWeight: 800,
            })}
          >
            Install the GitHub App
          </Button>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={(theme) => ({
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
            Step 2 — tell us about the repo
          </Typography>

          {submitError && (
            <Alert
              severity="error"
              role="alert"
              sx={{ mb: 2 }}
              onClose={() => setSubmitError(null)}
            >
              {submitError}
            </Alert>
          )}

          {/* Honeypot — visually hidden, ignored by humans, filled by naive bots. */}
          <input
            type="text"
            name="botcheck"
            value={botcheck}
            onChange={(event) => setBotcheck(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-9999px',
              width: 1,
              height: 1,
              opacity: 0,
            }}
          />

          <Stack spacing={2.5}>
            <TextField
              label="Repository URL"
              required
              fullWidth
              value={repoUrl}
              placeholder="https://github.com/owner/repo"
              onChange={(event) => setRepoUrl(event.target.value)}
              onBlur={() => validateField('repoUrl', repoUrl)}
              error={Boolean(errors.repoUrl)}
              helperText={errors.repoUrl ?? ' '}
              inputProps={{ inputMode: 'url' }}
              FormHelperTextProps={
                errors.repoUrl ? { role: 'alert' } : undefined
              }
            />
            <TextField
              label="Short description"
              required
              fullWidth
              value={description}
              placeholder="One sentence about what your project does"
              onChange={(event) => setDescription(event.target.value)}
              onBlur={() => validateField('description', description)}
              error={Boolean(errors.description)}
              helperText={errors.description ?? ' '}
              FormHelperTextProps={
                errors.description ? { role: 'alert' } : undefined
              }
            />
            <TextField
              label="Your GitHub handle"
              required
              fullWidth
              value={githubHandle}
              placeholder="yourhandle"
              onChange={(event) => setGithubHandle(event.target.value)}
              onBlur={() => validateField('githubHandle', githubHandle)}
              error={Boolean(errors.githubHandle)}
              helperText={errors.githubHandle ?? ' '}
              FormHelperTextProps={
                errors.githubHandle ? { role: 'alert' } : undefined
              }
            />
            <TextField
              label="Another link or handle"
              required
              fullWidth
              value={otherSocial}
              placeholder="Twitter, LinkedIn, personal site, etc."
              onChange={(event) => setOtherSocial(event.target.value)}
              onBlur={() => validateField('otherSocial', otherSocial)}
              error={Boolean(errors.otherSocial)}
              helperText={errors.otherSocial ?? ' '}
              FormHelperTextProps={
                errors.otherSocial ? { role: 'alert' } : undefined
              }
            />
            <TextField
              label="Contact email"
              required
              fullWidth
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => validateField('email', email)}
              error={Boolean(errors.email)}
              helperText={errors.email ?? ' '}
              inputProps={{ inputMode: 'email' }}
              FormHelperTextProps={errors.email ? { role: 'alert' } : undefined}
            />
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={appInstalled}
                    onChange={(event) => {
                      setAppInstalled(event.target.checked);
                      validateField('appInstalled', event.target.checked);
                    }}
                  />
                }
                label="I have installed the Gittensor Mirror GitHub App on this repository."
                sx={{ alignItems: 'flex-start' }}
              />
              {errors.appInstalled && (
                <Typography
                  role="alert"
                  sx={(theme) => ({
                    color: theme.palette.error.main,
                    fontSize: '0.75rem',
                    mt: 0.5,
                    ml: 4,
                  })}
                >
                  {errors.appInstalled}
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mt: 4, justifyContent: 'flex-end' }}
          >
            <Button
              component="a"
              {...docsLink}
              variant="outlined"
              endIcon={<OpenInNewIcon />}
              sx={(theme) => ({
                minHeight: 44,
                borderRadius: 1.5,
                borderColor: theme.palette.border.medium,
                color: theme.palette.text.primary,
                textTransform: 'none',
                fontWeight: 800,
              })}
            >
              Read the docs
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={(theme) => ({
                minHeight: 44,
                borderRadius: 1.5,
                backgroundColor: theme.palette.status.merged,
                color: theme.palette.common.black,
                textTransform: 'none',
                fontWeight: 900,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.status.merged, 0.9),
                },
                '&.Mui-disabled': {
                  backgroundColor: alpha(theme.palette.status.merged, 0.5),
                  color: theme.palette.common.black,
                },
              })}
            >
              {submitting ? 'Submitting…' : 'Submit registration'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Page>
  );
};

export default RepositoryRegistrationPage;

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { useSelfIdentity } from '../../hooks/useSelfIdentity';

/**
 * Local-only "This is me" setup (GitHub username + optional hotkey).
 */
const SelfIdentityPanel: React.FC = () => {
  const { githubLogin, hotkey, hasConfigured, setIdentity, clear } =
    useSelfIdentity();
  const [draftGh, setDraftGh] = useState(githubLogin);
  const [draftHk, setDraftHk] = useState(hotkey);

  useEffect(() => {
    setDraftGh(githubLogin);
    setDraftHk(hotkey);
  }, [githubLogin, hotkey]);

  const handleSave = () => {
    setIdentity({ githubLogin: draftGh, hotkey: draftHk });
  };

  return (
    <Box
      sx={{
        py: 2,
        px: 0,
        borderTop: (t) => `1px solid ${t.palette.border.medium}`,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          mb: 0.75,
        }}
      >
        This is me
      </Typography>
      <Typography
        sx={{
          fontSize: '0.65rem',
          color: (t) => alpha(t.palette.text.primary, 0.45),
          lineHeight: 1.45,
          mb: 1.25,
        }}
      >
        Highlight your rows in lists and activity. Stored only in this browser.
      </Typography>
      <Stack spacing={1.25}>
        <TextField
          size="small"
          fullWidth
          label="GitHub username"
          placeholder="octocat"
          value={draftGh}
          onChange={(e) => setDraftGh(e.target.value)}
          autoComplete="username"
          inputProps={{ spellCheck: false }}
          sx={{
            '& .MuiInputBase-input': { fontSize: '0.8rem' },
            '& .MuiInputLabel-root': { fontSize: '0.75rem' },
          }}
        />
        <TextField
          size="small"
          fullWidth
          label="Hotkey (optional)"
          placeholder="Subnet hotkey"
          value={draftHk}
          onChange={(e) => setDraftHk(e.target.value)}
          autoComplete="off"
          inputProps={{ spellCheck: false }}
          sx={{
            '& .MuiInputBase-input': { fontSize: '0.75rem' },
            '& .MuiInputLabel-root': { fontSize: '0.75rem' },
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            onClick={handleSave}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            Save
          </Button>
          {hasConfigured && (
            <Button
              size="small"
              onClick={clear}
              sx={{
                textTransform: 'none',
                fontSize: '0.72rem',
                color: 'text.secondary',
              }}
            >
              Clear
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default SelfIdentityPanel;

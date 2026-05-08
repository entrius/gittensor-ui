import { type SxProps, type Theme, alpha } from '@mui/material/styles';

type ThemeSxFactory = (theme: Theme) => SxProps<Theme>;
type FontSxFactory = (theme: Theme, mono: string) => SxProps<Theme>;

export const sectionContainerSx: ThemeSxFactory = (
  theme: Theme,
): SxProps<Theme> => ({
  width: '100%',
  p: { xs: 1.45, sm: 1.65 },
  borderRadius: 3,
  border: `1px solid ${theme.palette.border.light}`,
  backgroundColor: 'transparent',
});

export const sectionTitleSx: FontSxFactory = (
  theme: Theme,
  mono: string,
): SxProps<Theme> => ({
  mb: 1.25,
  color: theme.palette.text.primary,
  fontFamily: mono,
  fontSize: { xs: '1.02rem', sm: '1.1rem' },
  fontWeight: 700,
});

export const loaderContainerSx: SxProps<Theme> = {
  minHeight: 120,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const emptyMessageSx = (mono: string): SxProps<Theme> => ({
  color: 'text.secondary',
  fontFamily: mono,
  fontSize: '0.8rem',
});

export const repoCardContainerSx: ThemeSxFactory = (
  theme: Theme,
): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  p: 1.5,
  borderRadius: 2.5,
  border: `1px solid ${theme.palette.border.light}`,
});

export const repoHeaderSx: ThemeSxFactory = (theme: Theme): SxProps<Theme> => ({
  mb: 1,
  pb: 1,
  borderBottom: `1px solid ${theme.palette.border.light}`,
  cursor: 'pointer',
  '&:hover .repo-name': { color: theme.palette.status.merged },
});

export const repoAvatarSx: FontSxFactory = (
  theme: Theme,
  mono: string,
): SxProps<Theme> => ({
  width: 36,
  height: 36,
  fontSize: '0.8rem',
  fontFamily: mono,
  bgcolor: theme.palette.surface.light,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.border.light}`,
  flexShrink: 0,
  '& .MuiSvgIcon-root': { fontSize: 18 },
});

export const repoNameSx: FontSxFactory = (
  theme: Theme,
  mono: string,
): SxProps<Theme> => ({
  color: theme.palette.text.primary,
  fontFamily: mono,
  fontSize: '0.88rem',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  transition: 'color 0.15s',
});

export const repoSubtitleSx: FontSxFactory = (
  theme: Theme,
  mono: string,
): SxProps<Theme> => ({
  mt: 0.15,
  color: alpha(theme.palette.text.primary, 0.45),
  fontFamily: mono,
  fontSize: '0.68rem',
  lineHeight: 1.2,
});

export const scoreHighlightSx: ThemeSxFactory = (
  theme: Theme,
): SxProps<Theme> => ({
  color: alpha(theme.palette.diff.additions, 0.8),
  fontWeight: 600,
});

export const prRowContainerSx: ThemeSxFactory = (
  theme: Theme,
): SxProps<Theme> => ({
  px: 1,
  py: 0.65,
  mx: -1,
  borderRadius: 1.5,
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  '&:hover': { backgroundColor: alpha(theme.palette.text.primary, 0.05) },
});

export const prTitleSx: FontSxFactory = (
  theme: Theme,
  mono: string,
): SxProps<Theme> => ({
  color: theme.palette.text.primary,
  fontFamily: mono,
  fontSize: '0.78rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.35,
});

export const prNumberSx: ThemeSxFactory = (theme: Theme): SxProps<Theme> => ({
  color: alpha(theme.palette.text.primary, 0.35),
});

export const prScoreSx: FontSxFactory = (
  theme: Theme,
  mono: string,
): SxProps<Theme> => ({
  color: alpha(theme.palette.diff.additions, 0.85),
  fontFamily: mono,
  fontSize: '0.68rem',
  fontWeight: 700,
});

export const prChangesSx: FontSxFactory = (
  theme: Theme,
  mono: string,
): SxProps<Theme> => ({
  color: alpha(theme.palette.text.primary, 0.35),
  fontFamily: mono,
  fontSize: '0.65rem',
});

export const prDeletionsSx: ThemeSxFactory = (
  theme: Theme,
): SxProps<Theme> => ({
  color: alpha(theme.palette.diff.deletions, 0.7),
});

export const prAuthorSx: FontSxFactory = (
  theme: Theme,
  mono: string,
): SxProps<Theme> => ({
  color: alpha(theme.palette.text.primary, 0.4),
  fontFamily: mono,
  fontSize: '0.65rem',
});

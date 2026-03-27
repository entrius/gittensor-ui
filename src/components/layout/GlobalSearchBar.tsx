import React, { useEffect, useState } from 'react';
import {
  Box,
  ButtonBase,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type Theme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSearchResults } from '../../pages/search/searchData';

const QUICK_RESULT_LIMIT = 3;
const DROPDOWN_CLOSE_DELAY_MS = 150;

// Quick-search dropdown styles.
const resultRowSx = (theme: Theme) => ({
  width: '100%',
  textAlign: 'left',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  p: 1.1,
  borderRadius: '8px',
  border: `1px solid ${theme.palette.border.subtle}`,
  backgroundColor: theme.palette.surface.subtle,
  '&:hover': {
    backgroundColor: theme.palette.surface.light,
    borderColor: theme.palette.border.light,
  },
});

const resultSubtitleSx = (theme: Theme) => ({
  color: theme.palette.text.secondary,
  fontFamily: theme.typography.mono.fontFamily,
});

type SearchSectionLabelProps = {
  label: string;
  hasResultsAbove?: boolean;
};

const SearchSectionLabel: React.FC<SearchSectionLabelProps> = ({
  label,
  hasResultsAbove = false,
}) => (
  <Typography
    sx={(theme) => ({
      px: 0.5,
      py: 0.25,
      pt: hasResultsAbove ? 0.75 : 0.25,
      ...theme.typography.monoSmall,
      color: theme.palette.text.secondary,
      letterSpacing: '0.06em',
    })}
  >
    {label}
  </Typography>
);

type SearchResultRowProps = {
  title: string;
  subtitle: string;
  onClick: () => void;
};

const SearchResultRow: React.FC<SearchResultRowProps> = ({
  title,
  subtitle,
  onClick,
}) => (
  <ButtonBase
    sx={resultRowSx}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    <Box>
      <Typography
        sx={(theme) => ({
          color: theme.palette.text.primary,
          fontFamily: theme.typography.mono.fontFamily,
          fontSize: '0.92rem',
        })}
      >
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" sx={resultSubtitleSx}>
          {subtitle}
        </Typography>
      ) : null}
    </Box>
    <ArrowForwardIcon fontSize="small" />
  </ButtonBase>
);

const SearchEmptyState: React.FC = () => (
  <Box
    sx={(theme) => ({
      px: 1,
      py: 2,
      borderRadius: '8px',
      border: `1px solid ${theme.palette.border.subtle}`,
      backgroundColor: theme.palette.surface.subtle,
    })}
  >
    <Typography
      sx={(theme) => ({
        color: theme.palette.text.primary,
        fontFamily: theme.typography.mono.fontFamily,
        fontSize: '0.82rem',
      })}
    >
      No quick matches found.
    </Typography>
    <Typography variant="caption" sx={resultSubtitleSx}>
      Press Enter to search all results.
    </Typography>
  </Box>
);

type SearchActionRowProps = {
  label: string;
  onClick: () => void;
};

const SearchActionRow: React.FC<SearchActionRowProps> = ({
  label,
  onClick,
}) => (
  <ButtonBase
    sx={resultRowSx}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    <Typography
      sx={(theme) => ({
        color: theme.palette.primary.main,
        fontSize: '0.9rem',
        fontFamily: theme.typography.mono.fontFamily,
      })}
    >
      {label}
    </Typography>
    <ArrowForwardIcon fontSize="small" />
  </ButtonBase>
);

const getMinerSubtitle = (miner: {
  currentTier: string;
  leaderboardRank: number;
}) => {
  const parts: string[] = [];

  if (miner.leaderboardRank > 0) {
    parts.push(`Rank #${miner.leaderboardRank}`);
  }

  const currentTier = miner.currentTier.trim();

  if (currentTier) {
    parts.push(currentTier);
  }

  return parts.join(' · ');
};

const GlobalSearchBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname === '/search';
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Activate dataset loading after search interaction or on the /search page.
  const [isSearchActivated, setIsSearchActivated] = useState(isSearchPage);

  // Reuse cached search datasets and derive quick results after activation.
  const {
    datasets,
    hasQuery,
    minerResults,
    repositoryResults,
    prResults,
    issueResults,
  } = useSearchResults(
    query,
    {
      miners: QUICK_RESULT_LIMIT,
      repositories: QUICK_RESULT_LIMIT,
      prs: QUICK_RESULT_LIMIT,
      issues: QUICK_RESULT_LIMIT,
    },
    isSearchActivated || isSearchPage,
    'quick',
  );

  const isLoading =
    datasets.miners.isLoading ||
    datasets.repositories.isLoading ||
    datasets.prs.isLoading ||
    datasets.issues.isLoading;

  const hasAnyResults =
    minerResults.length > 0 ||
    repositoryResults.length > 0 ||
    prResults.length > 0 ||
    issueResults.length > 0;

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!isSearchPage) return;
    const qFromUrl = searchParams.get('q') || '';
    setQuery((prev) => (prev === qFromUrl ? prev : qFromUrl));
  }, [isSearchPage, searchParams]);

  const updateSearchPageQuery = (value: string) => {
    if (!isSearchPage) return;

    const params = new URLSearchParams(searchParams);
    const trimmedValue = value.trim();

    if (trimmedValue) {
      params.set('q', trimmedValue);
    } else {
      params.delete('q');
    }
    setSearchParams(params, { replace: true });
  };

  const handleOpenSearchPage = () => {
    if (!trimmedQuery) return;
    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    setIsDropdownOpen(false);
  };

  const showDropdown = !isSearchPage && isDropdownOpen && hasQuery;
  const closeDropdown = () => setIsDropdownOpen(false);

  const navigateAndClose = (path: string) => {
    navigate(path);
    closeDropdown();
  };

  const clearQuery = () => {
    setQuery('');
    updateSearchPageQuery('');
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 900 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search miners, repositories, PRs, issues..."
        value={query}
        autoComplete="off"
        onFocus={() => {
          setIsSearchActivated(true);
          setIsDropdownOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setIsDropdownOpen(false), DROPDOWN_CLOSE_DELAY_MS);
        }}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          updateSearchPageQuery(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleOpenSearchPage();
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon
                sx={(theme) => ({
                  color: theme.palette.text.secondary,
                  fontSize: '1rem',
                })}
              />
            </InputAdornment>
          ),
          endAdornment: query ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={clearQuery}
                edge="end"
                aria-label="clear search"
                sx={(theme) => ({ color: theme.palette.text.secondary })}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        sx={(theme) => ({
          '& .MuiOutlinedInput-root': {
            color: theme.palette.text.primary,
            fontFamily: theme.typography.mono.fontFamily,
            backgroundColor: theme.palette.surface.subtle,
            fontSize: '0.85rem',
            borderRadius: 2,
            '& fieldset': { borderColor: theme.palette.border.light },
            '&:hover fieldset': { borderColor: theme.palette.border.medium },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.primary.main,
            },
          },
          '& .MuiInputBase-input::placeholder': {
            fontFamily: theme.typography.mono.fontFamily,
            fontSize: '0.8rem',
            opacity: 0.75,
          },
        })}
      />

      {showDropdown && (
        <Paper
          elevation={0}
          sx={(theme) => ({
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 1200,
            p: 1.2,
            border: `1px solid ${theme.palette.border.light}`,
            borderRadius: 2,
            backgroundColor: theme.palette.background.default,
            maxHeight: 'min(420px, calc(100vh - 96px))',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.border.light,
              borderRadius: 1,
            },
          })}
        >
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}

          {!isLoading && (
            <Stack spacing={0.5} sx={{ pb: 0.5 }}>
              {minerResults.length > 0 && (
                <>
                  <SearchSectionLabel label="Miners" />
                  {minerResults.map((miner) => (
                    <SearchResultRow
                      key={`miner-${miner.githubId}`}
                      title={miner.githubUsername || miner.githubId}
                      subtitle={getMinerSubtitle(miner)}
                      onClick={() =>
                        navigateAndClose(
                          `/miners/details?githubId=${encodeURIComponent(miner.githubId)}`,
                        )
                      }
                    />
                  ))}
                </>
              )}

              {repositoryResults.length > 0 && (
                <>
                  <SearchSectionLabel
                    label="Repositories"
                    hasResultsAbove={minerResults.length > 0}
                  />
                  {repositoryResults.map((repo) => (
                    <SearchResultRow
                      key={`repo-${repo.fullName}`}
                      title={repo.fullName}
                      subtitle={
                        repo.tier ? `${repo.owner} · ${repo.tier}` : repo.owner
                      }
                      onClick={() =>
                        navigateAndClose(
                          `/miners/repository?name=${encodeURIComponent(repo.fullName)}`,
                        )
                      }
                    />
                  ))}
                </>
              )}

              {prResults.length > 0 && (
                <>
                  <SearchSectionLabel
                    label="Pull Requests"
                    hasResultsAbove={
                      minerResults.length > 0 || repositoryResults.length > 0
                    }
                  />
                  {prResults.map((pr) => (
                    <SearchResultRow
                      key={`pr-${pr.repository}-${pr.pullRequestNumber}`}
                      title={`${pr.repository} #${pr.pullRequestNumber}`}
                      subtitle={pr.pullRequestTitle}
                      onClick={() =>
                        navigateAndClose(
                          `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                        )
                      }
                    />
                  ))}
                </>
              )}

              {issueResults.length > 0 && (
                <>
                  <SearchSectionLabel
                    label="Issues"
                    hasResultsAbove={
                      minerResults.length > 0 ||
                      repositoryResults.length > 0 ||
                      prResults.length > 0
                    }
                  />
                  {issueResults.map((issue) => (
                    <SearchResultRow
                      key={`issue-${issue.id}`}
                      title={
                        issue.title ||
                        `${issue.repositoryFullName} #${issue.issueNumber}`
                      }
                      subtitle={`${issue.repositoryFullName} · #${issue.issueNumber}`}
                      onClick={() =>
                        navigateAndClose(`/issues/details?id=${issue.id}`)
                      }
                    />
                  ))}
                </>
              )}

              {!hasAnyResults && <SearchEmptyState />}

              <SearchActionRow
                label={`Open full search for "${trimmedQuery}"`}
                onClick={handleOpenSearchPage}
              />
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default GlobalSearchBar;

import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Chip,
  Typography,
  alpha,
  type Theme,
  TextField,
  Stack,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { LinkBox } from '../components/common/linkBehavior';
import { useReposAndWeights, useLanguagesAndWeights } from '../api';
import { getRepositoryOwnerAvatarSrc } from '../utils/avatar';

const FONTS = { mono: '"JetBrains Mono", monospace' } as const;
const DEFAULT_ELIGIBILITY_GATE = 80;

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Typography
    sx={(theme) => ({
      fontFamily: FONTS.mono,
      fontSize: '0.85rem',
      fontWeight: 600,
      color: theme.palette.text.primary,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      mb: { xs: 1.5, sm: 2 },
      pb: { xs: 1, sm: 1.25 },
      borderBottom: '1px solid',
      borderColor: theme.palette.border.light,
    })}
  >
    {children}
  </Typography>
);

const cardSx = (theme: Theme) => ({
  p: { xs: 2, sm: 3 },
  borderRadius: 2,
  border: '1px solid',
  borderColor: theme.palette.border.light,
  backgroundColor: alpha(theme.palette.background.paper, 0.3),
  display: 'flex',
  flexDirection: 'column' as const,
});

type SortDirection = 'asc' | 'desc' | null;

const EcosystemPage: React.FC = () => {
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const { data: languages, isLoading: isLoadingLanguages } =
    useLanguagesAndWeights();

  const isLoading = isLoadingRepos || isLoadingLanguages;

  // Search states
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');

  // Sort states
  const [repoSortColumn, setRepoSortColumn] =
    useState<keyof RepoEmissionItem>('emissionShare');
  const [repoSortDirection, setRepoSortDirection] =
    useState<SortDirection>('desc');
  const [languageSortColumn, setLanguageSortColumn] =
    useState<keyof LanguageWeightItem>('weight');
  const [languageSortDirection, setLanguageSortDirection] =
    useState<SortDirection>('desc');

  // Pagination states
  const [repoPage, setRepoPage] = useState(0);
  const [repoRowsPerPage, setRepoRowsPerPage] = useState(10);
  const [languagePage, setLanguagePage] = useState(0);
  const [languageRowsPerPage, setLanguageRowsPerPage] = useState(10);

  // ── Repository Emission Map ────────────────────────────────────────────────
  type RepoEmissionItem = {
    fullName: string;
    owner: string;
    emissionShare: number;
    eligibilityGate: number;
    percentageOfTotal: number;
  };

  const repoEmissionData = useMemo(() => {
    if (!repos) return [];

    const totalEmission = repos.reduce(
      (sum, repo) =>
        sum + (parseFloat(String(repo.config?.emissionShare ?? 0)) || 0),
      0,
    );

    const baseData = repos.map((repo) => ({
      fullName: repo.fullName,
      owner: repo.owner,
      emissionShare: parseFloat(String(repo.config?.emissionShare ?? 0)) || 0,
      eligibilityGate:
        repo.config?.eligibility?.min_credibility ?? DEFAULT_ELIGIBILITY_GATE,
      percentageOfTotal:
        totalEmission > 0
          ? ((parseFloat(String(repo.config?.emissionShare ?? 0)) || 0) /
              totalEmission) *
            100
          : 0,
    }));

    // Filter by search query
    const filtered = repoSearchQuery
      ? baseData.filter(
          (repo) =>
            repo.fullName
              .toLowerCase()
              .includes(repoSearchQuery.toLowerCase()) ||
            repo.owner.toLowerCase().includes(repoSearchQuery.toLowerCase()),
        )
      : baseData;

    // Sort by selected column
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[repoSortColumn];
      const bVal = b[repoSortColumn];
      if (repoSortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return sorted;
  }, [repos, repoSearchQuery, repoSortColumn, repoSortDirection]);

  // ── Language Weight Chart ───────────────────────────────────────────────────
  type LanguageWeightItem = {
    name: string;
    extensions: string[];
    weight: number;
    weightPercentage: number;
  };

  const languageWeightData = useMemo(() => {
    if (!languages) return [];

    // Group by language field (null → use extension as key)
    const grouped = new Map<
      string,
      { extensions: Set<string>; weight: number }
    >();

    languages.forEach((lang) => {
      const key = lang.language || lang.extension;
      const current = grouped.get(key) || {
        extensions: new Set<string>(),
        weight: 0,
      };
      current.extensions.add(lang.extension);
      current.weight = Math.max(
        current.weight,
        parseFloat(String(lang.weight)) || 0,
      );
      grouped.set(key, current);
    });

    // Convert to array
    const result = Array.from(grouped.entries()).map(([name, data]) => ({
      name,
      extensions: Array.from(data.extensions),
      weight: data.weight,
    }));

    const maxWeight = Math.max(...result.map((l) => l.weight), 1);

    const baseData = result.map((item) => ({
      ...item,
      weightPercentage: (item.weight / maxWeight) * 100,
    }));

    // Filter by search query
    const filtered = languageSearchQuery
      ? baseData.filter(
          (lang) =>
            lang.name
              .toLowerCase()
              .includes(languageSearchQuery.toLowerCase()) ||
            lang.extensions.some((ext) =>
              ext.toLowerCase().includes(languageSearchQuery.toLowerCase()),
            ),
        )
      : baseData;

    // Sort by selected column
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[languageSortColumn];
      const bVal = b[languageSortColumn];
      if (languageSortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return sorted;
  }, [
    languages,
    languageSearchQuery,
    languageSortColumn,
    languageSortDirection,
  ]);

  const getRepoHref = (name: string) =>
    `/miners/repository?name=${encodeURIComponent(name)}`;

  const handleRepoSort = (column: keyof RepoEmissionItem) => {
    if (repoSortColumn === column) {
      setRepoSortDirection(
        repoSortDirection === 'asc'
          ? 'desc'
          : repoSortDirection === 'desc'
            ? null
            : 'asc',
      );
    } else {
      setRepoSortColumn(column);
      setRepoSortDirection('asc');
    }
  };

  const handleLanguageSort = (column: keyof LanguageWeightItem) => {
    if (languageSortColumn === column) {
      setLanguageSortDirection(
        languageSortDirection === 'asc'
          ? 'desc'
          : languageSortDirection === 'desc'
            ? null
            : 'asc',
      );
    } else {
      setLanguageSortColumn(column);
      setLanguageSortDirection('asc');
    }
  };

  const handleRepoPageChange = (newPage: number) => {
    setRepoPage(newPage);
  };

  const handleRepoRowsPerPageChange = (value: number) => {
    setRepoRowsPerPage(value);
    setRepoPage(0);
  };

  const handleLanguagePageChange = (newPage: number) => {
    setLanguagePage(newPage);
  };

  const handleLanguageRowsPerPageChange = (value: number) => {
    setLanguageRowsPerPage(value);
    setLanguagePage(0);
  };

  const SortIcon: React.FC<{
    column: string;
    activeColumn: string;
    direction: SortDirection;
  }> = ({ column, activeColumn, direction }) => {
    if (activeColumn !== column || !direction) return null;
    return direction === 'asc' ? (
      <ArrowUpward sx={{ fontSize: '0.75rem', ml: 0.5 }} />
    ) : (
      <ArrowDownward sx={{ fontSize: '0.75rem', ml: 0.5 }} />
    );
  };

  const SortableHeader: React.FC<{
    children: React.ReactNode;
    column: string;
    activeColumn: string;
    direction: SortDirection;
    onSort: () => void;
  }> = ({ children, column, activeColumn, direction, onSort }) => {
    const baseSx = {
      fontFamily: FONTS.mono,
      fontSize: '0.75rem',
      fontWeight: 600,
      color: 'text.secondary',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      p: 0,
      '&:hover': { color: 'text.primary' },
    };

    return (
      <Box component="button" onClick={onSort} sx={baseSx}>
        {children}
        <SortIcon
          column={column}
          activeColumn={activeColumn}
          direction={direction}
        />
      </Box>
    );
  };

  const Pagination: React.FC<{
    page: number;
    rowsPerPage: number;
    totalRows: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (value: number) => void;
  }> = ({
    page,
    rowsPerPage,
    totalRows,
    onPageChange,
    onRowsPerPageChange,
  }) => {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const startRow = page * rowsPerPage + 1;
    const endRow = Math.min((page + 1) * rowsPerPage, totalRows);

    return (
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="flex-end"
        sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'border.light',
        }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
          }}
        >
          {totalRows > 0 ? `${startRow}-${endRow} of ${totalRows}` : '0 of 0'}
        </Typography>
        <Select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          size="small"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            minWidth: 70,
            '& .MuiSelect-select': { py: 0.5 },
          }}
        >
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={25}>25</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
        </Select>
        <Button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          size="small"
          sx={{ minWidth: 32, p: 0.5 }}
        >
          <ChevronLeft />
        </Button>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
            minWidth: 40,
            textAlign: 'center',
          }}
        >
          {totalPages > 0 ? page + 1 : 0} / {totalPages}
        </Typography>
        <Button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          size="small"
          sx={{ minWidth: 32, p: 0.5 }}
        >
          <ChevronRight />
        </Button>
      </Stack>
    );
  };

  return (
    <Page title="Ecosystem">
      <SEO
        title="Ecosystem Map"
        description="View the network's earning potential by repository and programming language."
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: 1440,
          mx: 'auto',
          py: { xs: 1.5, sm: 3 },
          px: { xs: 1.25, sm: 3 },
        }}
      >
        {/* ── Repository Emission Map ─────────────────────────────────────── */}
        <Card sx={cardSx} elevation={0}>
          <SectionHeader>Repository Emission Map</SectionHeader>

          {/* Search bar */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search repositories..."
              value={repoSearchQuery}
              onChange={(e) => setRepoSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon
                    sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }}
                  />
                ),
                sx: {
                  fontFamily: FONTS.mono,
                  fontSize: '0.85rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'border.light',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'border.medium',
                  },
                },
              }}
              sx={(theme) => ({
                backgroundColor: alpha(theme.palette.background.paper, 0.3),
                borderRadius: 1,
                '& .MuiInputBase-root': { fontFamily: FONTS.mono },
              })}
            />
          </Box>

          {/* Table header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              py: 1,
              px: { xs: 1, sm: 1.5 },
              borderBottom: '1px solid',
              borderColor: 'border.light',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <SortableHeader
                column="fullName"
                activeColumn={repoSortColumn}
                direction={repoSortDirection}
                onSort={() => handleRepoSort('fullName')}
              >
                Repository
              </SortableHeader>
            </Box>
            <Box
              sx={{
                minWidth: { xs: 50, sm: 60 },
                display: 'flex',
                justifyContent: 'flex-end',
                ml: 5,
              }}
            >
              <SortableHeader
                column="eligibilityGate"
                activeColumn={repoSortColumn}
                direction={repoSortDirection}
                onSort={() => handleRepoSort('eligibilityGate')}
              >
                Gate
              </SortableHeader>
            </Box>
            <Box
              sx={{
                minWidth: { xs: 140, sm: 180 },
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ flex: 1 }} />
              <Box sx={{ minWidth: { xs: 80, sm: 90 }, textAlign: 'right' }}>
                <SortableHeader
                  column="emissionShare"
                  activeColumn={repoSortColumn}
                  direction={repoSortDirection}
                  onSort={() => handleRepoSort('emissionShare')}
                >
                  Emission
                </SortableHeader>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            {isLoading ? (
              <Typography
                sx={(theme) => ({
                  color: alpha(theme.palette.text.primary, 0.3),
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  py: 4,
                  textAlign: 'center',
                })}
              >
                Loading repository data...
              </Typography>
            ) : repoEmissionData.length === 0 ? (
              <Typography
                sx={(theme) => ({
                  color: alpha(theme.palette.text.primary, 0.3),
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  py: 4,
                  textAlign: 'center',
                })}
              >
                No repository data available
              </Typography>
            ) : (
              repoEmissionData
                .slice(
                  repoPage * repoRowsPerPage,
                  (repoPage + 1) * repoRowsPerPage,
                )
                .map((repo, _index) => (
                  <Box
                    key={repo.fullName}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 1, sm: 2 },
                      py: 1,
                      px: { xs: 1, sm: 1.5 },
                      borderRadius: 1,
                      transition: 'background 0.15s',
                      mx: -1,
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                    }}
                  >
                    <LinkBox
                      href={getRepoHref(repo.fullName)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <Box
                        component="img"
                        src={getRepositoryOwnerAvatarSrc(repo.owner)}
                        alt={repo.owner}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          flexShrink: 0,
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <Typography
                        sx={(theme) => ({
                          fontFamily: FONTS.mono,
                          fontSize: '0.85rem',
                          color: theme.palette.text.primary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                        })}
                      >
                        {repo.fullName}
                      </Typography>
                    </LinkBox>

                    <Typography
                      sx={(theme) => ({
                        fontFamily: FONTS.mono,
                        fontSize: '0.75rem',
                        color: alpha(theme.palette.text.primary, 0.6),
                        minWidth: { xs: 50, sm: 60 },
                        textAlign: 'right',
                      })}
                    >
                      {repo.eligibilityGate}%
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minWidth: { xs: 140, sm: 180 },
                      }}
                    >
                      <Box
                        sx={(theme) => ({
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha(
                            theme.palette.status.info,
                            0.15,
                          ),
                          overflow: 'hidden',
                        })}
                      >
                        <Box
                          sx={(theme) => ({
                            width: `${repo.percentageOfTotal}%`,
                            height: '100%',
                            backgroundColor: theme.palette.status.info,
                            borderRadius: 3,
                          })}
                        />
                      </Box>
                      <Typography
                        sx={(theme) => ({
                          fontFamily: FONTS.mono,
                          fontSize: '0.75rem',
                          color: theme.palette.text.primary,
                          fontWeight: 600,
                          minWidth: { xs: 80, sm: 90 },
                          textAlign: 'right',
                        })}
                      >
                        {repo.emissionShare.toFixed(4)} (
                        {repo.percentageOfTotal.toFixed(1)}%)
                      </Typography>
                    </Box>
                  </Box>
                ))
            )}
          </Box>
          <Pagination
            page={repoPage}
            rowsPerPage={repoRowsPerPage}
            totalRows={repoEmissionData.length}
            onPageChange={handleRepoPageChange}
            onRowsPerPageChange={handleRepoRowsPerPageChange}
          />
        </Card>

        {/* ── Language Weight Chart ─────────────────────────────────────────── */}
        <Card sx={(theme) => ({ ...cardSx(theme), mt: 3 })} elevation={0}>
          <SectionHeader>Language Weight Chart</SectionHeader>

          {/* Search bar */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search languages or extensions..."
              value={languageSearchQuery}
              onChange={(e) => setLanguageSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon
                    sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }}
                  />
                ),
                sx: {
                  fontFamily: FONTS.mono,
                  fontSize: '0.85rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'border.light',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'border.medium',
                  },
                },
              }}
              sx={(theme) => ({
                backgroundColor: alpha(theme.palette.background.paper, 0.3),
                borderRadius: 1,
                '& .MuiInputBase-root': { fontFamily: FONTS.mono },
              })}
            />
          </Box>

          {/* Table header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              py: 1,
              px: { xs: 1, sm: 1.5 },
              borderBottom: '1px solid',
              borderColor: 'border.light',
            }}
          >
            <Box sx={{ minWidth: { xs: 80, sm: 120 } }}>
              <SortableHeader
                column="name"
                activeColumn={languageSortColumn}
                direction={languageSortDirection}
                onSort={() => handleLanguageSort('name')}
              >
                Language
              </SortableHeader>
            </Box>
            <Box
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.secondary',
                flex: 1,
                minWidth: 0,
              }}
            >
              Extensions
            </Box>
            <Box
              sx={{
                minWidth: { xs: 120, sm: 160 },
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ flex: 1 }} />
              <Box
                sx={{
                  minWidth: { xs: 60, sm: 80 },
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <SortableHeader
                  column="weight"
                  activeColumn={languageSortColumn}
                  direction={languageSortDirection}
                  onSort={() => handleLanguageSort('weight')}
                >
                  Weight
                </SortableHeader>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            {isLoading ? (
              <Typography
                sx={(theme) => ({
                  color: alpha(theme.palette.text.primary, 0.3),
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  py: 4,
                  textAlign: 'center',
                })}
              >
                Loading language data...
              </Typography>
            ) : languageWeightData.length === 0 ? (
              <Typography
                sx={(theme) => ({
                  color: alpha(theme.palette.text.primary, 0.3),
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  py: 4,
                  textAlign: 'center',
                })}
              >
                No language data available
              </Typography>
            ) : (
              languageWeightData
                .slice(
                  languagePage * languageRowsPerPage,
                  (languagePage + 1) * languageRowsPerPage,
                )
                .map((lang, _index) => (
                  <Box
                    key={lang.name}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 1, sm: 2 },
                      py: 1,
                      px: { xs: 1, sm: 1.5 },
                      borderRadius: 1,
                      transition: 'background 0.15s',
                      mx: -1,
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                    }}
                  >
                    <Typography
                      sx={(theme) => ({
                        fontFamily: FONTS.mono,
                        fontSize: '0.85rem',
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                        minWidth: { xs: 80, sm: 120 },
                      })}
                    >
                      {lang.name}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {lang.extensions.map((ext) => (
                        <Chip
                          key={ext}
                          label={ext}
                          size="small"
                          variant="info"
                          sx={{
                            fontFamily: FONTS.mono,
                            fontSize: '0.7rem',
                            height: 22,
                          }}
                        />
                      ))}
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minWidth: { xs: 120, sm: 160 },
                      }}
                    >
                      <Box
                        sx={(theme) => ({
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha(
                            theme.palette.status.success,
                            0.15,
                          ),
                          overflow: 'hidden',
                        })}
                      >
                        <Box
                          sx={(theme) => ({
                            width: `${lang.weightPercentage}%`,
                            height: '100%',
                            backgroundColor: theme.palette.status.success,
                            borderRadius: 3,
                          })}
                        />
                      </Box>
                      <Typography
                        sx={(theme) => ({
                          fontFamily: FONTS.mono,
                          fontSize: '0.75rem',
                          color: theme.palette.text.primary,
                          fontWeight: 600,
                          minWidth: { xs: 60, sm: 80 },
                          textAlign: 'right',
                        })}
                      >
                        {lang.weight.toFixed(4)}
                      </Typography>
                    </Box>
                  </Box>
                ))
            )}
          </Box>
          <Pagination
            page={languagePage}
            rowsPerPage={languageRowsPerPage}
            totalRows={languageWeightData.length}
            onPageChange={handleLanguagePageChange}
            onRowsPerPageChange={handleLanguageRowsPerPageChange}
          />
        </Card>
      </Box>
    </Page>
  );
};

export default EcosystemPage;

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    TextField,
    InputAdornment,
    MenuItem,
    Stack,
    FormControl,
    Select,
    Grid,
    Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import RepoCard from './RepoCard';
import Pagination from '@mui/material/Pagination';

interface RepoStats {
    repository: string;
    totalScore: number;
    totalPRs: number;
    uniqueMiners: Set<string>;
    weight: number;
    tier: string;
    rank?: number;
    topContributors?: string[];
    contributorCount?: number;
}

type SortColumn =
    | 'repository'
    | 'weight'
    | 'totalScore'
    | 'totalPRs'
    | 'contributors';

type SortDirection = 'asc' | 'desc';

interface RepoGridProps {
    repositories: RepoStats[];
    isLoading?: boolean;
    onSelectRepository: (repositoryFullName: string) => void;
    initialTierFilter?: 'Gold' | 'Silver' | 'Bronze';
}

const RepoGrid: React.FC<RepoGridProps> = ({
    repositories,
    isLoading,
    onSelectRepository,
    initialTierFilter,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(12);
    const [sortColumn, setSortColumn] = useState<SortColumn>('totalScore');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [tierFilter, setTierFilter] = useState<
        'all' | 'Gold' | 'Silver' | 'Bronze'
    >(initialTierFilter || 'all');
    const topRef = useRef<HTMLDivElement>(null);

    const rankedRepositories = useMemo(() => {
        // First, sort by the current sort column
        const sorted = [...repositories].sort((a, b) => {
            let comparison = 0;

            switch (sortColumn) {
                case 'repository':
                    comparison = a.repository.localeCompare(b.repository);
                    break;
                case 'weight':
                    comparison = a.weight - b.weight;
                    break;
                case 'totalScore':
                    comparison = a.totalScore - b.totalScore;
                    break;
                case 'totalPRs':
                    comparison = a.totalPRs - b.totalPRs;
                    break;
                case 'contributors':
                    comparison = a.uniqueMiners.size - b.uniqueMiners.size;
                    break;
                default:
                    comparison = b.totalScore - a.totalScore;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        // Then add rank based on sorted order
        return sorted.map((repo, index) => ({ ...repo, rank: index + 1 }));
    }, [repositories, sortColumn, sortDirection]);

    const filteredRepositories = useMemo(() => {
        let filtered = rankedRepositories;

        // Apply tier filter
        if (tierFilter !== 'all') {
            filtered = filtered.filter((repo) => repo.tier === tierFilter);
        }

        // Apply search filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter((repo) =>
                repo.repository?.toLowerCase().includes(lowerQuery),
            );
        }

        return filtered;
    }, [rankedRepositories, searchQuery, tierFilter]);

    // Pagination
    const pageCount = Math.ceil(filteredRepositories.length / rowsPerPage);
    const paginatedRepositories = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return filteredRepositories.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredRepositories, page, rowsPerPage]);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
        // Optional: scroll to top of grid when changing page
        if (topRef.current) {
            topRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const tierCounts = useMemo(
        () => ({
            all: repositories.length,
            gold: repositories.filter((r) => r.tier === 'Gold').length,
            silver: repositories.filter((r) => r.tier === 'Silver').length,
            bronze: repositories.filter((r) => r.tier === 'Bronze').length,
        }),
        [repositories],
    );

    const TierFilterButton = ({
        label,
        value,
        count,
        color,
    }: {
        label: string;
        value: typeof tierFilter;
        count: number;
        color: string;
    }) => (
        <Button
            size="small"
            onClick={() => {
                setTierFilter(value);
                setPage(1);
            }}
            sx={{
                color: tierFilter === value ? '#fff' : 'rgba(255,255,255,0.5)',
                backgroundColor:
                    tierFilter === value ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderRadius: '8px',
                px: 2,
                py: 0.75,
                minWidth: 'auto',
                textTransform: 'none',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                border: tierFilter === value ? `1px solid ${color}` : '1px solid transparent',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
                transition: 'all 0.2s',
            }}
        >
            {label}{' '}
            <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.75rem' }}>
                {count}
            </span>
        </Button>
    );

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, tierFilter, rowsPerPage]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={40} sx={{ color: 'primary.main' }} />
            </Box>
        );
    }

    return (
        <Box ref={topRef}>
            {/* Header Controls */}
            <Box
                sx={{
                    mb: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: 'rgba(11, 11, 15, 0.8)',
                    backdropFilter: 'blur(12px)',
                    mx: -2,
                    px: 2,
                    py: 2,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: { sx: 0, md: '0 0 16px 16px' }
                }}
            >

                {/* Top Bar: Search and Sort */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                        Top Repositories
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            placeholder="Search repositories..."
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                width: { xs: '100%', sm: '300px' },
                                '& .MuiOutlinedInput-root': {
                                    color: '#ffffff',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: 3,
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                                },
                            }}
                        />

                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <Select
                                value={sortColumn}
                                onChange={(e) => setSortColumn(e.target.value as SortColumn)}
                                displayEmpty
                                sx={{
                                    color: '#fff',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: 3,
                                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'secondary.main' },
                                }}
                                startAdornment={
                                    <InputAdornment position="start">
                                        <SortIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                                    </InputAdornment>
                                }
                            >
                                <MenuItem value="totalScore">Total Score</MenuItem>
                                <MenuItem value="weight">Weight</MenuItem>
                                <MenuItem value="totalPRs">Total PRs</MenuItem>
                                <MenuItem value="contributors">Contributors</MenuItem>
                                <MenuItem value="repository">Name</MenuItem>
                            </Select>
                        </FormControl>

                        <Button
                            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                            sx={{
                                minWidth: 'auto',
                                px: 1,
                                color: 'rgba(255,255,255,0.7)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 3,
                                '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: '#fff'
                                }
                            }}
                        >
                            {sortDirection === 'asc' ? 'ASC' : 'DESC'}
                        </Button>
                    </Box>
                </Box>

                {/* Second Bar: Filters */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                        <TierFilterButton label="All" value="all" count={tierCounts.all} color="#8b949e" />
                        <TierFilterButton label="Gold" value="Gold" count={tierCounts.gold} color="#FFD700" />
                        <TierFilterButton label="Silver" value="Silver" count={tierCounts.silver} color="#C0C0C0" />
                        <TierFilterButton label="Bronze" value="Bronze" count={tierCounts.bronze} color="#CD7F32" />
                    </Stack>
                </Box>

            </Box>

            {/* Grid Content */}
            <Grid container spacing={3}>
                {paginatedRepositories.map((repo) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={repo.repository}>
                        <RepoCard repo={repo} onClick={onSelectRepository} />
                    </Grid>
                ))}
            </Grid>

            {paginatedRepositories.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
                    <Typography variant="h6" sx={{ fontFamily: 'Outfit' }}>No repositories found matching your criteria.</Typography>
                </Box>
            )}

            {/* Pagination */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6, mb: 4 }}>
                <Pagination
                    count={pageCount}
                    page={page}
                    onChange={handlePageChange}
                    color="secondary"
                    size="large"
                    sx={{
                        '& .MuiPaginationItem-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontFamily: '"JetBrains Mono", monospace',
                            '&.Mui-selected': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                            },
                        },
                    }}
                />
            </Box>
        </Box>
    );
};

export default RepoGrid;

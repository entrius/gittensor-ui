import React from 'react';
import { Box, Card, Typography, Chip, Tooltip, Avatar, AvatarGroup } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ScaleIcon from '@mui/icons-material/Scale';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface RepoStats {
    repository: string;
    totalScore: number;
    totalPRs: number;
    uniqueMiners: Set<string>;
    weight: number;
    tier: string;
    rank?: number;
    topContributors?: string[]; // Array of github usernames
    contributorCount?: number;
}

interface RepoCardProps {
    repo: RepoStats;
    onClick: (repoName: string) => void;
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, onClick }) => {
    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Gold': return '#FFD700';
            case 'Silver': return '#C0C0C0';
            case 'Bronze': return '#CD7F32';
            default: return 'rgba(255, 255, 255, 0.1)';
        }
    };

    const tierColor = getTierColor(repo.tier);
    const repoName = repo.repository.split('/')[1] || repo.repository;
    const ownerName = repo.repository.split('/')[0] || '';

    // Contributor logic
    const maxContributors = 4;
    const contributors = repo.topContributors || [];
    const totalContributors = repo.contributorCount || contributors.length;
    const displayedContributors = contributors.slice(0, maxContributors);
    const remainingCount = Math.max(0, totalContributors - maxContributors);


    return (
        <Card
            onClick={() => onClick(repo.repository)}
            sx={{
                position: 'relative',
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 4,
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                overflow: 'visible', // Allow avatars to scale out
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 20px 40px -10px rgba(0,0,0,0.5)`,
                    border: `1px solid ${tierColor}40`,
                    '& .arrow-icon': {
                        transform: 'translateX(4px)',
                        opacity: 1,
                        color: tierColor
                    }
                },
            }}
        >
            {/* Subtle Tier Gradient Overlay */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100%',
                    height: '100%',
                    background: `radial-gradient(circle at top right, ${tierColor}10, transparent 60%)`,
                    pointerEvents: 'none',
                    borderRadius: 4,
                    overflow: 'hidden' // Keep overlay contained
                }}
            />

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{ position: 'relative' }}>
                        <Box
                            component="img"
                            src={`https://avatars.githubusercontent.com/${ownerName}`}
                            alt={repo.repository}
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '50%', // Circular
                                border: `2px solid ${tierColor}`,
                                backgroundColor:
                                    ownerName === 'opentensor'
                                        ? '#ffffff'
                                        : ownerName === 'bitcoin'
                                            ? '#F7931A'
                                            : '#161b22',
                                boxShadow: `0 0 10px ${tierColor}20`
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: -4,
                                right: -4,
                                backgroundColor: '#0d1117',
                                border: `1px solid ${tierColor}`,
                                borderRadius: '4px',
                                px: 0.5,
                                py: 0,
                                zIndex: 2,
                                minWidth: '18px',
                                textAlign: 'center'
                            }}
                        >
                            <Typography
                                sx={{
                                    fontFamily: 'JetBrains Mono',
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    color: tierColor,
                                    lineHeight: 1.2
                                }}
                            >
                                #{repo.rank}
                            </Typography>
                        </Box>
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: '"JetBrains Mono", monospace', display: 'block', lineHeight: 1 }}>
                            {ownerName}
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2, fontSize: '1rem', letterSpacing: '-0.02em', mt: 0.5 }}>
                            {repoName}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Key Metrics */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <StarIcon sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Score
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
                        {repo.totalScore.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </Typography>
                </Box>

                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <ScaleIcon sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Weight
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
                        {repo.weight.toFixed(2)}
                    </Typography>
                </Box>
            </Box>

            {/* Footer: Contributors & Action */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', position: 'relative', zIndex: 1 }}>
                <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                        Top Contributors
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', pl: '12px' }}>
                        {contributors.length > 0 ? (
                            <>
                                {displayedContributors.map((contributor) => (
                                    <Tooltip key={contributor} title={contributor} arrow>
                                        <Box
                                            component="img"
                                            src={`https://github.com/${contributor}.png`}
                                            alt={contributor}
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                border: `2px solid rgba(255,255,255,0.1)`,
                                                marginLeft: '-12px',
                                                backgroundColor: '#161b22',
                                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                position: 'relative',
                                                zIndex: 1,
                                                '&:hover': {
                                                    transform: 'scale(1.4)',
                                                    borderColor: tierColor,
                                                    boxShadow: `0 4px 12px rgba(0,0,0,0.5)`,
                                                    zIndex: 100,
                                                },
                                            }}
                                        />
                                    </Tooltip>
                                ))}
                                {remainingCount > 0 && (
                                    <Tooltip title={`${remainingCount} more contributors`} arrow>
                                        <Box
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                border: '2px solid rgba(255,255,255,0.1)',
                                                marginLeft: '-12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                fontFamily: 'JetBrains Mono',
                                                cursor: 'default',
                                                position: 'relative',
                                                zIndex: 2,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    transform: 'scale(1.1)',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                    zIndex: 10,
                                                    color: '#fff'
                                                }
                                            }}
                                        >
                                            +{remainingCount}
                                        </Box>
                                    </Tooltip>
                                )}
                            </>
                        ) : (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>None</Typography>
                        )}
                    </Box>
                </Box>

                <Box className="arrow-icon" sx={{ opacity: 0, transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowForwardIcon sx={{ fontSize: 20 }} />
                </Box>
            </Box>
        </Card>
    );
};

export default RepoCard;

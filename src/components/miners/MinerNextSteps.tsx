import React, { useMemo, useState } from 'react';
import { alpha, Box, ButtonBase, Card, Typography } from '@mui/material';
import {
  CheckCircleOutlined as GoodIcon,
  ErrorOutline as CriticalIcon,
  LightbulbOutlined as TipIcon,
  PlaylistAddCheckOutlined as NextStepsIcon,
  WarningAmberOutlined as WarningIcon,
} from '@mui/icons-material';
import {
  useMinerPRs,
  useMinerStats,
  useReposAndWeights,
  type RepositoryConfig,
} from '../../api';
import { STATUS_COLORS } from '../../theme';
import { buildRepoWeightsMap } from '../../utils/ExplorerUtils';
import {
  buildEligibilitySteps,
  buildLeverSteps,
  mergeNextSteps,
  type NextStep,
  type NextStepTone,
} from '../../utils/minerNextSteps';

interface MinerNextStepsProps {
  githubId: string;
}

/** How many steps to show before the "show all" toggle (2-up grid → 2 rows). */
const COLLAPSED_COUNT = 4;

const TONE_COLOR: Record<NextStepTone, string> = {
  critical: STATUS_COLORS.error,
  warning: STATUS_COLORS.warningOrange,
  tip: STATUS_COLORS.info,
  good: STATUS_COLORS.success,
};

const TONE_ICON: Record<NextStepTone, React.ReactNode> = {
  critical: <CriticalIcon sx={{ fontSize: '1rem' }} />,
  warning: <WarningIcon sx={{ fontSize: '1rem' }} />,
  tip: <TipIcon sx={{ fontSize: '1rem' }} />,
  good: <GoodIcon sx={{ fontSize: '1rem' }} />,
};

const StepRow: React.FC<{ step: NextStep }> = ({ step }) => {
  const color = TONE_COLOR[step.tone];
  return (
    <Box
      sx={{
        height: '100%',
        borderRadius: 1.7,
        px: 1.5,
        py: 1.2,
        border: `1px solid ${alpha(color, 0.3)}`,
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.1,
        minWidth: 0,
      }}
    >
      <Box sx={{ color, mt: 0.15, flexShrink: 0 }}>{TONE_ICON[step.tone]}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            color,
            fontSize: '0.81rem',
            fontWeight: 600,
            wordBreak: 'break-word',
          }}
        >
          {step.title}
        </Typography>
        <Typography
          sx={{
            color: (t) => alpha(t.palette.text.primary, 0.68),
            fontSize: '0.78rem',
            mt: 0.35,
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}
        >
          {step.action}
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * "What to do next" — the dashboard's single prioritised action list. Merges
 * the score-lever, eligibility and open-PR-risk guidance that used to be spread
 * across three sections into one severity-ranked set of steps, each linking to
 * the section a miner should act in.
 */
const MinerNextSteps: React.FC<MinerNextStepsProps> = ({ githubId }) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: prs } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();
  const [showAll, setShowAll] = useState(false);

  const configByRepo = useMemo(() => {
    const map = new Map<string, RepositoryConfig>();
    (repos ?? []).forEach((r) => map.set(r.fullName.toLowerCase(), r.config));
    return map;
  }, [repos]);

  // Mode-independent on purpose: the next-steps list summarises both tracks at
  // once (the OSS/Discovery toggle below only governs the repositories table and
  // contribution tabs). Discovery steps are added only when the miner has issue
  // activity, and are namespaced/tagged so they don't collide with OSS steps.
  const steps = useMemo<NextStep[]>(() => {
    if (!minerStats) return [];
    const repositories = (minerStats.repositories ?? []).filter(
      (r) => r.repositoryFullName.trim().length > 0,
    );
    const weights = repos
      ? buildRepoWeightsMap(repos)
      : new Map<string, number>();
    const hasDiscovery = repositories.some(
      (r) =>
        (r.totalSolvedIssues ?? 0) +
          (r.totalOpenIssues ?? 0) +
          (r.totalClosedIssues ?? 0) >
        0,
    );
    return mergeNextSteps(
      buildLeverSteps(minerStats, prs, configByRepo),
      buildEligibilitySteps(repositories, false, weights),
      hasDiscovery
        ? buildEligibilitySteps(repositories, true, weights, {
            idPrefix: 'disc-',
            trackTag: 'Disc',
          })
        : [],
    );
  }, [minerStats, prs, repos, configByRepo]);

  if (!minerStats || steps.length === 0) return null;

  const visible = showAll ? steps : steps.slice(0, COLLAPSED_COUNT);
  const hiddenCount = steps.length - visible.length;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        p: { xs: 1.5, md: 2 },
      }}
      elevation={0}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          mb: 1.25,
        }}
      >
        <NextStepsIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
        <Typography variant="sectionTitle">What to do next</Typography>
        <Typography
          sx={{
            ml: 'auto',
            fontSize: '0.7rem',
            color: 'text.tertiary',
            whiteSpace: 'nowrap',
          }}
        >
          highest impact first
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 1,
        }}
      >
        {visible.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </Box>

      {(hiddenCount > 0 || showAll) && steps.length > COLLAPSED_COUNT && (
        <ButtonBase
          onClick={() => setShowAll((p) => !p)}
          disableRipple
          sx={{
            mt: 1.25,
            fontSize: '0.74rem',
            fontWeight: 600,
            color: 'primary.main',
            alignSelf: 'flex-start',
            '&:focus-visible': {
              outline: (t) => `2px solid ${t.palette.primary.main}`,
              outlineOffset: '2px',
            },
          }}
        >
          {showAll ? 'Show fewer' : `Show ${hiddenCount} more`}
        </ButtonBase>
      )}
    </Card>
  );
};

export default MinerNextSteps;

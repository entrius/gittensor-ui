import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Typography,
  CircularProgress,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import ReactECharts from 'echarts-for-react';
import { useAllPrs, useReposAndWeights } from '../../api';
import { truncateText } from '../../utils';
import theme from '../../theme';

const CHART_DOT_COLOR = 'rgba(88, 166, 255, 0.9)';

const LeaderboardCharts: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [useLogScale, setUseLogScale] = useState(true);

  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();

  const isLoading = isLoadingPRs || isLoadingRepos;
  const hasNoData = !allPRs || allPRs.length === 0;

  // Process top PRs
  const topPRs = useMemo(() => {
    if (!allPRs) return [];
    return [...allPRs]
      .sort((a, b) => parseFloat(b.score || '0') - parseFloat(a.score || '0'))
      .slice(0, 50)
      .map((pr, index) => ({ ...pr, rank: index + 1 }));
  }, [allPRs]);

  // Process repo stats
  const repoStats = useMemo(() => {
    if (!allPRs || !repos) return [];

    const statsMap = new Map();
    allPRs.forEach((pr) => {
      if (!pr || !pr.repository) return;
      const repoKey = pr.repository.toLowerCase();
      const current = statsMap.get(repoKey) || {
        repository: pr.repository,
        totalScore: 0,
        totalPRs: 0,
        uniqueMiners: new Set(),
        weight: 0,
      };
      current.totalScore += parseFloat(pr.score || '0');
      current.totalPRs += 1;
      if (pr.author) current.uniqueMiners.add(pr.author);
      statsMap.set(repoKey, current);
    });

    statsMap.forEach((stats, repoKey) => {
      const repoData = repos.find((r) => r.fullName.toLowerCase() === repoKey);
      if (repoData) {
        stats.repository = repoData.fullName;
        stats.weight = repoData.weight
          ? parseFloat(String(repoData.weight))
          : 0;
      }
    });

    return Array.from(statsMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 50)
      .map((repo, index) => ({ ...repo, rank: index + 1 }));
  }, [allPRs, repos]);

  const getPRsChartOption = () => {
    const chartData = topPRs
      .filter((item) => parseFloat(item?.score || '0') >= 1)
      .slice(0, 50);

    const xAxisData = chartData.map(
      (item) => `#${item?.pullRequestNumber || ''}`,
    );
    const dotData = chartData.map((item) => ({
      value: Number(parseFloat(item?.score || '0')),
      title: item?.pullRequestTitle || '',
      author: item?.author || '',
      repository: item?.repository || '',
      prNumber: item?.pullRequestNumber || 0,
      rank: item?.rank || 0,
      itemStyle: {
        color: CHART_DOT_COLOR,
        shadowBlur: 10,
        shadowColor: CHART_DOT_COLOR,
      },
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Pull Request Performance Ranking',
        subtext: 'Individual PR scores ranked by performance',
        left: 'center',
        top: 20,
        textStyle: {
          color: '#ffffff',
          fontFamily: 'JetBrains Mono',
          fontSize: 18,
          fontWeight: 600,
        },
        subtextStyle: {
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        backgroundColor: 'rgba(10, 10, 12, 0.98)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
        padding: [14, 18],
        formatter: (params: any) => {
          const data = params[0]?.data || params[1]?.data;
          if (!data) return '';
          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.15);">
                <img src="https://avatars.githubusercontent.com/${data.author}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid ${CHART_DOT_COLOR};" />
                <div>
                  <div style="font-weight: 700; font-size: 14px; color: #fff;">PR #${data.prNumber}</div>
                  <div style="font-size: 11px; color: rgba(255,255,255,0.6);">${data.author}</div>
                </div>
              </div>
              <div style="margin-bottom: 10px; color: rgba(255,255,255,0.85); font-size: 11px; max-width: 300px; white-space: normal; word-break: break-word; line-height: 1.4;">
                ${data.title}
              </div>
              <div style="display: grid; gap: 6px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Rank:</span>
                  <span style="color: #fff; font-weight: 600;">#${data.rank}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Score:</span>
                  <span style="color: #fff; font-weight: 600;">${data.value.toFixed(4)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Repository:</span>
                  <span style="color: #fff; font-weight: 600;">${data.repository}</span>
                </div>
              </div>
            </div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '2%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
          interval: 0,
          rotate: 45,
          margin: 12,
        },
        axisLine: {
          lineStyle: { color: theme.palette.border.subtle, width: 1 },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: useLogScale ? 'log' : 'value',
        min: useLogScale ? 1 : 0,
        logBase: 10,
        name: 'PR Score',
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
          formatter: (value: number) =>
            value < 0.01 ? value.toExponential(1) : value.toFixed(2),
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.border.subtle,
            type: 'dashed',
            opacity: 0.5,
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Stems',
          type: 'bar',
          data: dotData.map((item) => ({
            ...item,
            itemStyle: {
              color: CHART_DOT_COLOR,
              opacity: 0.4,
              borderRadius: [2, 2, 0, 0],
            },
          })),
          barWidth: 2,
          z: 1,
          animationDuration: 1000,
          animationEasing: 'cubicOut',
          animationDelay: (idx: number) => idx * 30,
        },
        {
          name: 'Dots',
          type: 'scatter',
          data: dotData,
          symbolSize: 14,
          z: 2,
          emphasis: {
            scale: 1.5,
            itemStyle: { shadowBlur: 20, borderColor: '#fff', borderWidth: 2 },
          },
          animationDuration: 1000,
          animationEasing: 'cubicOut',
          animationDelay: (idx: number) => idx * 30 + 100,
        },
      ],
    };
  };

  const getReposChartOption = () => {
    const chartData = repoStats
      .filter((item) => item.totalScore >= 1)
      .slice(0, 50);

    const xAxisData = chartData.map((item) =>
      truncateText(item.repository.split('/')[1] || item.repository, 12),
    );
    const dotData = chartData.map((item) => ({
      value: item.totalScore,
      repository: item.repository,
      totalPRs: item.totalPRs,
      uniqueMiners: item.uniqueMiners.size,
      weight: item.weight,
      rank: item.rank,
      itemStyle: {
        color: CHART_DOT_COLOR,
        shadowBlur: 10,
        shadowColor: CHART_DOT_COLOR,
      },
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Repository Performance Ranking',
        subtext: 'Total contribution scores by repository',
        left: 'center',
        top: 20,
        textStyle: {
          color: '#ffffff',
          fontFamily: 'JetBrains Mono',
          fontSize: 18,
          fontWeight: 600,
        },
        subtextStyle: {
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        backgroundColor: 'rgba(10, 10, 12, 0.98)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
        padding: [14, 18],
        formatter: (params: any) => {
          const data = params[0]?.data || params[1]?.data;
          if (!data) return '';
          const repoOwner = data.repository.split('/')[0];
          const repoName = data.repository.split('/')[1] || data.repository;
          const avatarBg =
            repoOwner === 'opentensor'
              ? '#ffffff'
              : repoOwner === 'bitcoin'
                ? '#F7931A'
                : 'transparent';
          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.15);">
                <img src="https://avatars.githubusercontent.com/${repoOwner}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid ${CHART_DOT_COLOR}; background-color: ${avatarBg};" onerror="this.style.display='none'" />
                <div>
                  <div style="font-weight: 700; font-size: 14px; color: #fff;">${repoName}</div>
                  <div style="font-size: 11px; color: rgba(255,255,255,0.6);">${repoOwner}</div>
                </div>
              </div>
              <div style="display: grid; gap: 6px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Rank:</span>
                  <span style="color: #fff; font-weight: 600;">#${data.rank}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Total Score:</span>
                  <span style="color: #fff; font-weight: 600;">${data.value.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Total PRs:</span>
                  <span style="color: #fff; font-weight: 600;">${data.totalPRs}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Contributors:</span>
                  <span style="color: #fff; font-weight: 600;">${data.uniqueMiners}</span>
                </div>
              </div>
            </div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '3%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
          interval: 0,
          rotate: 45,
          margin: 12,
        },
        axisLine: {
          lineStyle: { color: theme.palette.border.subtle, width: 1 },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: useLogScale ? 'log' : 'value',
        min: useLogScale ? 1 : 0,
        logBase: 10,
        name: 'Total Score',
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontFamily: 'JetBrains Mono',
          fontSize: 12,
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
          formatter: (value: number) =>
            value < 0.01 ? value.toExponential(1) : value.toFixed(0),
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.border.subtle,
            type: 'dashed',
            opacity: 0.5,
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Stems',
          type: 'bar',
          data: dotData.map((item) => ({
            ...item,
            itemStyle: {
              color: CHART_DOT_COLOR,
              opacity: 0.4,
              borderRadius: [2, 2, 0, 0],
            },
          })),
          barWidth: 2,
          z: 1,
          animationDuration: 1000,
          animationEasing: 'cubicOut',
          animationDelay: (idx: number) => idx * 30,
        },
        {
          name: 'Dots',
          type: 'scatter',
          data: dotData,
          symbolSize: 14,
          z: 2,
          emphasis: {
            scale: 1.5,
            itemStyle: { shadowBlur: 20, borderColor: '#fff', borderWidth: 2 },
          },
          animationDuration: 1000,
          animationEasing: 'cubicOut',
          animationDelay: (idx: number) => idx * 30 + 100,
        },
      ],
    };
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      elevation={0}
    >
      <Box
        sx={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', lg: 'center' },
          gap: { xs: 2, lg: 0 },
          p: 2,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            minHeight: 'auto',
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.85rem',
              fontWeight: 500,
              textTransform: 'none',
              minHeight: 'auto',
              py: 1,
              '&.Mui-selected': { color: '#fff' },
            },
            '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
          }}
        >
          <Tab label="Top Pull Requests" />
          <Tab label="Top Repositories" />
        </Tabs>
        <FormControlLabel
          control={
            <Switch
              checked={useLogScale}
              onChange={(e) => setUseLogScale(e.target.checked)}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: 'primary.main',
                },
                '& .MuiSwitch-track': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            />
          }
          label={
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'JetBrains Mono',
                fontSize: '0.8rem',
                color: 'rgba(255, 255, 255, 0.7)',
                whiteSpace: 'nowrap',
              }}
            >
              Log Scale
            </Typography>
          }
          sx={{ ml: 'auto' }}
        />
      </Box>
      <Box sx={{ flex: 1, p: 2, backgroundColor: 'rgba(0,0,0,0.2)' }}>
        {isLoading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={30} />
          </Box>
        ) : hasNoData ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChartIcon
              sx={{
                fontSize: 48,
                color: 'rgba(255, 255, 255, 0.2)',
                mb: 2,
              }}
            />
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.9rem',
              }}
            >
              No leaderboard data available yet
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.3)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                mt: 0.5,
              }}
            >
              Rankings will appear once PRs are recorded
            </Typography>
          </Box>
        ) : (
          <ReactECharts
            option={
              activeTab === 0 ? getPRsChartOption() : getReposChartOption()
            }
            style={{ height: '100%', width: '100%' }}
          />
        )}
      </Box>
    </Card>
  );
};

export default LeaderboardCharts;

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Box, Typography, CircularProgress } from '@mui/material';
import { usePullRequestComments } from '../../api';
import {
  type PullRequestComment,
  type PullRequestDetails,
} from '../../api/models/Dashboard';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
import {
  ConversationTimeline,
  EMPTY_BODY_PLACEHOLDER,
  githubProfileUrl,
  type ConversationItem,
} from '../common';

interface PRCommentsProps {
  repository: string;
  pullRequestNumber: number;
  prDetails: PullRequestDetails;
}

const commentToItem = (c: PullRequestComment): ConversationItem => ({
  id: `comment-${c.id}`,
  user: c.user,
  body: c.body || EMPTY_BODY_PLACEHOLDER,
  createdAt: c.createdAt,
  authorAssociation: c.authorAssociation || 'NONE',
});

const PRComments: React.FC<PRCommentsProps> = ({
  repository,
  pullRequestNumber,
  prDetails,
}) => {
  const {
    data: comments,
    isLoading,
    error,
  } = usePullRequestComments(repository, pullRequestNumber);
  const [bodyAssociation, setBodyAssociation] = useState<string>('NONE');

  useEffect(() => {
    setBodyAssociation('NONE');
    if (!repository || !pullRequestNumber) return;
    let cancelled = false;
    axios
      .get<{ author_association?: string | null }>(
        `https://api.github.com/repos/${repository}/pulls/${pullRequestNumber}`,
      )
      .then((res) => {
        if (cancelled) return;
        setBodyAssociation(res.data.author_association || 'NONE');
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to fetch PR author_association', err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repository, pullRequestNumber]);

  const items = useMemo<ConversationItem[]>(() => {
    const body: ConversationItem = {
      id: 'pr-description',
      user: {
        login: prDetails.authorLogin,
        avatarUrl: getGithubAvatarSrc(prDetails.authorLogin),
        htmlUrl: githubProfileUrl(prDetails.authorLogin),
      },
      body: prDetails.description || EMPTY_BODY_PLACEHOLDER,
      createdAt: prDetails.createdAt,
      authorAssociation: bodyAssociation,
      isDescription: true,
    };
    return [body, ...(comments ?? []).map(commentToItem)];
  }, [
    prDetails.authorLogin,
    prDetails.description,
    prDetails.createdAt,
    bodyAssociation,
    comments,
  ]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={30} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !comments) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">
          Failed to load comments. Please try again later.
        </Typography>
      </Box>
    );
  }

  return <ConversationTimeline items={items} />;
};

export default PRComments;

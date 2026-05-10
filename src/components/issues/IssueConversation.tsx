import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { type IssueDetails } from '../../api/models/Issues';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';
import {
  ConversationTimeline,
  EMPTY_BODY_PLACEHOLDER,
  githubProfileUrl,
  toConversationItem,
  type ConversationItem,
  type GithubIssueOrComment,
} from '../common';

interface IssueConversationProps {
  issue: IssueDetails;
}

const IssueConversation: React.FC<IssueConversationProps> = ({ issue }) => {
  const [fetchedItems, setFetchedItems] = useState<ConversationItem[] | null>(
    null,
  );

  useEffect(() => {
    const repo = issue.repositoryFullName;
    const number = issue.issueNumber;
    setFetchedItems(null);
    if (!repo || !number) return;

    let cancelled = false;
    const fetchConversation = async () => {
      try {
        const [issueRes, commentsRes] = await Promise.all([
          axios.get<GithubIssueOrComment>(
            `https://api.github.com/repos/${repo}/issues/${number}`,
          ),
          axios.get<GithubIssueOrComment[]>(
            `https://api.github.com/repos/${repo}/issues/${number}/comments?per_page=100`,
          ),
        ]);
        if (cancelled) return;
        const body = toConversationItem(issueRes.data, {
          idPrefix: 'issue',
          isDescription: true,
        });
        const comments = (commentsRes.data || []).map((c) =>
          toConversationItem(c, { idPrefix: 'comment' }),
        );
        const sorted = [body, ...comments].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setFetchedItems(sorted);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch issue conversation', err);
        }
      }
    };

    fetchConversation();
    return () => {
      cancelled = true;
    };
  }, [issue.repositoryFullName, issue.issueNumber]);

  const fallbackItems = useMemo<ConversationItem[]>(
    () => [
      {
        id: 'issue-description',
        user: {
          login: issue.authorLogin,
          avatarUrl: getGithubAvatarSrc(issue.authorLogin),
          htmlUrl: githubProfileUrl(issue.authorLogin),
        },
        body: issue.body || EMPTY_BODY_PLACEHOLDER,
        createdAt: issue.createdAt,
        authorAssociation: 'NONE',
        isDescription: true,
      },
    ],
    [issue.authorLogin, issue.body, issue.createdAt],
  );

  return <ConversationTimeline items={fetchedItems ?? fallbackItems} />;
};

export default IssueConversation;

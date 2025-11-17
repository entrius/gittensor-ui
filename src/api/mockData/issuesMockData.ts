/**
 * Mock data generator for Issues dashboard
 * Use this for testing before backend is ready
 */

import {
  Issue,
  IssueStats,
  BountyHistoryPoint,
  FeaturedIssue,
  IssueListItem,
  IssueStatusType,
} from "../models/Issues";

const GITHUB_REPOS = [
  { owner: "opentensor", name: "bittensor", language: "Python" },
  { owner: "facebook", name: "react", language: "TypeScript" },
  { owner: "microsoft", name: "vscode", language: "TypeScript" },
  { owner: "nodejs", name: "node", language: "JavaScript" },
  { owner: "rust-lang", name: "rust", language: "Rust" },
  { owner: "golang", name: "go", language: "Go" },
  { owner: "pytorch", name: "pytorch", language: "Python" },
  { owner: "tensorflow", name: "tensorflow", language: "C++" },
];

const ISSUE_TITLES = [
  "Fix memory leak in validator connection pool",
  "Add support for multiple wallet configurations",
  "Improve error handling in subnet registration",
  "Optimize graph rendering performance",
  "Update deprecated API endpoints",
  "Fix race condition in consensus mechanism",
  "Add unit tests for token transfer logic",
  "Implement caching for frequent queries",
  "Fix incorrect balance calculation",
  "Refactor legacy authentication code",
  "Add dark mode theme support",
  "Fix mobile responsive layout issues",
  "Improve accessibility for screen readers",
  "Optimize database query performance",
  "Add export functionality for transaction history",
];

const LABELS = [
  ["bug", "critical"],
  ["enhancement", "good first issue"],
  ["documentation"],
  ["performance"],
  ["security"],
  ["refactoring"],
  ["testing"],
  ["ui/ux"],
  ["backend"],
  ["frontend"],
];

const randomElement = <T,>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const generateIssueId = (): string => {
  return `issue_${Math.random().toString(36).substring(2, 11)}`;
};

const generateAddress = (): string => {
  return `0x${Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;
};

const generateTxHash = (): string => {
  return `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;
};

export const generateMockIssueStats = (): IssueStats => {
  const activeIssuesCount = randomInt(15, 50);
  const solvedIssuesCount = randomInt(30, 100);
  const totalBountyPoolUsd = randomInt(50000, 500000);
  const totalPaidOut = randomInt(100000, 1000000);

  return {
    totalBountyPool: totalBountyPoolUsd / 1000, // Assuming 1 token = $1000
    totalBountyPoolUsd,
    activeIssuesCount,
    solvedIssuesCount,
    totalIssuesCount: activeIssuesCount + solvedIssuesCount,
    averageBountyUsd: Math.floor(totalBountyPoolUsd / activeIssuesCount),
    averageTimeToSolve: randomInt(86400, 604800), // 1-7 days in seconds
    totalPaidOut,
  };
};

export const generateMockBountyHistory = (days: number): BountyHistoryPoint[] => {
  const history: BountyHistoryPoint[] = [];
  const now = Date.now();
  let currentBounty = randomInt(10000, 30000);

  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 86400000; // days ago in milliseconds
    const change = randomInt(-5000, 10000);
    currentBounty = Math.max(5000, currentBounty + change);

    history.push({
      timestamp,
      totalBountyPool: currentBounty / 1000,
      totalBountyPoolUsd: currentBounty,
      changeType: randomElement([
        "REGISTRATION",
        "INFLATION",
        "RESOLUTION",
      ] as const),
      issueId: generateIssueId(),
      amount: Math.abs(change),
    });
  }

  return history;
};

export const generateMockFeaturedIssues = (limit: number = 3): FeaturedIssue[] => {
  return Array.from({ length: limit }, () => {
    const repo = randomElement(GITHUB_REPOS);
    const title = randomElement(ISSUE_TITLES);
    const labels = randomElement(LABELS);
    const ageInDays = randomInt(1, 30);

    return {
      id: generateIssueId(),
      title,
      repositoryName: repo.name,
      repositoryOwner: repo.owner,
      bountyUsd: randomInt(5000, 50000),
      ageInDays,
      githubUrl: `https://github.com/${repo.owner}/${repo.name}/issues/${randomInt(1, 1000)}`,
      language: repo.language,
      labels,
    };
  }).sort((a, b) => b.bountyUsd - a.bountyUsd);
};

export const generateMockIssuesList = (
  count: number,
  status: IssueStatusType
): IssueListItem[] => {
  return Array.from({ length: count }, () => {
    const repo = randomElement(GITHUB_REPOS);
    const title = randomElement(ISSUE_TITLES);
    const labels = randomElement(LABELS);
    const registrationTimestamp = Date.now() - randomInt(0, 30) * 86400000;
    const timeToSolve = status === "SOLVED" ? randomInt(3600, 604800) : undefined;
    const resolutionTimestamp =
      status === "SOLVED" ? registrationTimestamp + (timeToSolve || 0) * 1000 : undefined;

    const prNumber = status === "SOLVED" ? randomInt(100, 999) : undefined;
    const solutionPrUrl = prNumber
      ? `https://github.com/${repo.owner}/${repo.name}/pull/${prNumber}`
      : undefined;

    return {
      id: generateIssueId(),
      title,
      repositoryName: repo.name,
      repositoryOwner: repo.owner,
      bountyUsd: randomInt(500, 25000),
      status,
      registrationTimestamp,
      resolutionTimestamp,
      githubUrl: `https://github.com/${repo.owner}/${repo.name}/issues/${randomInt(1, 1000)}`,
      solutionPrUrl,
      solutionPrNumber: prNumber,
      language: repo.language,
      labels,
      timeToSolve,
    };
  });
};

export const generateMockIssue = (id: string): Issue => {
  const repo = randomElement(GITHUB_REPOS);
  const title = randomElement(ISSUE_TITLES);
  const labels = randomElement(LABELS);
  const status = randomElement(["OPEN", "SOLVED", "IN_PROGRESS"] as IssueStatusType[]);

  // Issue was created on GitHub some time ago (30-90 days)
  const issueCreatedTimestamp = Date.now() - randomInt(30, 90) * 86400000;
  // Registered on Gittensor more recently (0-30 days ago)
  const registrationTimestamp = Date.now() - randomInt(0, 30) * 86400000;

  const timeToSolve = status === "SOLVED" ? randomInt(3600, 604800) : undefined;
  const resolutionTimestamp =
    status === "SOLVED" ? registrationTimestamp + (timeToSolve || 0) * 1000 : undefined;

  const initialBountyUsd = randomInt(5000, 50000);
  const hasAdditionalContributions = Math.random() > 0.5;
  const currentBountyUsd = hasAdditionalContributions
    ? initialBountyUsd + randomInt(1000, 10000)
    : initialBountyUsd;

  // Generate open PRs for non-solved issues
  const openPRCount = status !== "SOLVED" ? randomInt(0, 5) : 0;
  const openPullRequests = Array.from({ length: openPRCount }, () => ({
    number: randomInt(1, 999),
    url: `https://github.com/${repo.owner}/${repo.name}/pull/${randomInt(1, 999)}`,
    author: `contributor-${randomInt(1, 100)}`,
    createdAt: Date.now() - randomInt(1, 15) * 86400000,
    title: randomElement(ISSUE_TITLES),
  }));

  // Generate solution PR for solved issues
  const solutionPrNumber = status === "SOLVED" ? randomInt(100, 999) : undefined;
  const solutionPrUrl = solutionPrNumber
    ? `https://github.com/${repo.owner}/${repo.name}/pull/${solutionPrNumber}`
    : undefined;

  return {
    id,
    githubUrl: `https://github.com/${repo.owner}/${repo.name}/issues/${randomInt(1, 1000)}`,
    title,
    description: "This is a detailed description of the issue. It contains multiple lines of text explaining the problem, expected behavior, and steps to reproduce. The issue may involve fixing bugs, adding new features, or improving existing functionality. Contributors should review the attached code and follow the repository's contribution guidelines.",
    repositoryName: repo.name,
    repositoryOwner: repo.owner,
    bountyAmount: randomInt(5, 50),
    bountyUsd: currentBountyUsd,
    depositorAddress: generateAddress(),
    issueCreatedTimestamp,
    registrationTimestamp,
    status,
    solverAddress: status === "SOLVED" ? generateAddress() : undefined,
    resolutionTimestamp,
    registrationTxHash: generateTxHash(),
    resolutionTxHash: status === "SOLVED" ? generateTxHash() : undefined,
    labels,
    commentsCount: randomInt(0, 50),
    language: repo.language,
    timeToSolve,
    lastBountyUpdate: Date.now() - randomInt(0, 10) * 86400000,
    solutionRequiredBy: status !== "SOLVED" ? Date.now() + randomInt(7, 60) * 86400000 : undefined,
    openPullRequests: openPullRequests.length > 0 ? openPullRequests : undefined,
    initialBountyAmount: initialBountyUsd,
    currentSolutionAmount: status === "SOLVED" ? currentBountyUsd : undefined,
    solutionPrUrl,
    solutionPrNumber,
  };
};

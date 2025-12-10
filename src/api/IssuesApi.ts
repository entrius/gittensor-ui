import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  Issue,
  IssueStats,
  BountyHistoryPoint,
  FeaturedIssue,
  IssueListItem,
} from "./models/Issues";
import {
  generateMockIssueStats,
  generateMockBountyHistory,
  generateMockFeaturedIssues,
  generateMockIssuesList,
  generateMockIssue,
} from "./mockData/issuesMockData";

// API base URL - defaults to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Set to true to use mock data, false to use real API
const USE_MOCK_DATA = false;

/**
 * Validate a GitHub issue URL
 */
export const useValidateIssue = () => {
  return useMutation({
    mutationFn: async (githubUrl: string) => {
      const response = await axios.post(`${API_BASE_URL}/issues/validate`, {
        githubUrl,
      });
      return response.data;
    },
  });
};

/**
 * Register issue metadata after smart contract transaction
 */
export const useRegisterIssueMetadata = () => {
  return useMutation({
    mutationFn: async (data: {
      issueId: string;
      githubUrl: string;
      githubUrlHash: string;
      depositorAddress: string;
      initialBountyAmount: string;
      activeBountyAmount: string;
      registrationTimestamp: number;
      blockNumber: string;
      txHash: string;
    }) => {
      const response = await axios.post(
        `${API_BASE_URL}/issues/register-metadata`,
        data
      );
      return response.data;
    },
  });
};

/**
 * Fetch overall issue statistics
 */
export const useIssueStats = () => {
  return useQuery<IssueStats>({
    queryKey: ["issueStats"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return generateMockIssueStats();
      }
      const response = await axios.get(`${API_BASE_URL}/issues/stats`);
      return response.data;
    },
    refetchInterval: 30000,
  });
};

/**
 * Fetch bounty pool history for charting
 */
export const useBountyHistory = (days: number = 30) => {
  return useQuery<BountyHistoryPoint[]>({
    queryKey: ["bountyHistory", days],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return generateMockBountyHistory(days);
      }
      const response = await axios.get(
        `${API_BASE_URL}/issues/bounty-history?days=${days}`
      );
      return response.data.history;
    },
    refetchInterval: 60000,
  });
};

/**
 * Fetch featured high-value issues
 */
export const useFeaturedIssues = (limit: number = 3) => {
  return useQuery<FeaturedIssue[]>({
    queryKey: ["featuredIssues", limit],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return generateMockFeaturedIssues(limit);
      }
      const response = await axios.get(
        `${API_BASE_URL}/issues/featured?limit=${limit}`
      );
      return response.data;
    },
    refetchInterval: 30000,
  });
};

/**
 * Fetch all issues (with optional status filter)
 */
export const useIssues = (status?: "OPEN" | "SOLVED") => {
  return useQuery<IssueListItem[]>({
    queryKey: ["issues", status],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const openIssues = generateMockIssuesList(25, "OPEN");
        const solvedIssues = generateMockIssuesList(50, "SOLVED");

        if (status === "OPEN") return openIssues;
        if (status === "SOLVED") return solvedIssues;
        return [...openIssues, ...solvedIssues];
      }
      const url = status
        ? `${API_BASE_URL}/issues?status=${status}`
        : `${API_BASE_URL}/issues`;
      const response = await axios.get(url);
      return response.data.issues;
    },
    refetchInterval: 30000,
  });
};

/**
 * Fetch single issue details
 */
export const useIssue = (issueId: string | null) => {
  return useQuery<Issue>({
    queryKey: ["issue", issueId],
    queryFn: async () => {
      if (!issueId) throw new Error("Issue ID required");

      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return generateMockIssue(issueId);
      }
      const response = await axios.get(`${API_BASE_URL}/issues/${issueId}`);
      return response.data;
    },
    enabled: !!issueId,
  });
};

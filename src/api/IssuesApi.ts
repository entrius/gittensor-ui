import { useQuery } from "@tanstack/react-query";
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

// Set to true to use mock data, false to use real API
const USE_MOCK_DATA = true;

/**
 * Fetch overall issue statistics
 */
export const useIssueStats = () => {
  return useQuery<IssueStats>({
    queryKey: ["issueStats"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        return generateMockIssueStats();
      }
      // TODO: Replace with actual API call
      // const response = await axios.get("/issues/stats");
      // return response.data;
      throw new Error("Real API not implemented yet");
    },
    refetchInterval: 30000, // Refetch every 30 seconds
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
      // TODO: Replace with actual API call
      // const response = await axios.get(`/issues/bounty-history?days=${days}`);
      // return response.data;
      throw new Error("Real API not implemented yet");
    },
    refetchInterval: 60000, // Refetch every minute
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
      // TODO: Replace with actual API call
      // const response = await axios.get(`/issues/featured?limit=${limit}`);
      // return response.data;
      throw new Error("Real API not implemented yet");
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
      // TODO: Replace with actual API call
      // const url = status ? `/issues?status=${status}` : "/issues";
      // const response = await axios.get(url);
      // return response.data;
      throw new Error("Real API not implemented yet");
    },
    refetchInterval: 30000,
  });
};

/**
 * Fetch single issue details
 */
export const useIssue = (issueId: string) => {
  return useQuery<Issue>({
    queryKey: ["issue", issueId],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return generateMockIssue(issueId);
      }
      // TODO: Replace with actual API call
      // const response = await axios.get(`/issues/${issueId}`);
      // return response.data;
      throw new Error("Real API not implemented yet");
    },
    enabled: !!issueId,
  });
};

import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query client. All reads go through React Query (Architecture 01 §3)
 * to get caching + background refresh and to avoid refetch storms.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lists first-load budget is <1.5s; cache aggressively, refresh in the background.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

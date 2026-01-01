import { useQuery } from "@tanstack/react-query";
import { fetchIPOList } from "#src/api/ipo";
import type { IPOQueryParams } from "#src/api/ipo";

/**
 * Custom hook for fetching IPO data with React Query caching
 * 
 * Caching Strategy:
 * - staleTime: 5 minutes (300000ms) - IPO data doesn't change frequently
 * - gcTime: 10 minutes (600000ms) - Keep unused data in cache for 10 minutes
 * - keepPreviousData: true - Prevent loading flicker during pagination/filtering
 */
export function useIPOQuery(params: IPOQueryParams) {
    return useQuery({
        queryKey: ["ipo-list", params],
        queryFn: () => fetchIPOList(params),
        staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time (formerly cacheTime)
        placeholderData: (previousData) => previousData, // Keep previous data while fetching (replaces keepPreviousData)
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnReconnect: false, // Don't refetch when network reconnects
        retry: 1, // Retry failed requests once
    });
}

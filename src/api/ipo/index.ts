import { request } from "#src/utils/request";
import type { IPOQueryParams, IPOListResponse, IPOStatisticsResponse } from "./types";

export * from "./types";

/**
 * Query IPO data with filters
 * @param params - Query parameters including filters and pagination
 * @returns Promise with IPO list response
 */
export function fetchIPOList(params: IPOQueryParams) {
    return request
        .get("lixingren/ipo/query", {
            searchParams: params as any,
            ignoreLoading: false,
        })
        .json<IPOListResponse>();
}

/**
 * Get IPO statistics
 * @returns Promise with IPO statistics response
 */
export function fetchIPOStatistics() {
    return request
        .get("lixingren/ipo/statistics", {
            ignoreLoading: true,
        })
        .json<IPOStatisticsResponse>();
}

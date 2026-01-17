import type { IPOListResponse, IPOQueryParams, IPOStatisticsResponse } from "./types";
import { request } from "#src/utils/request";

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

/**
 * 爬取所有IPO数据
 */
export function crawlAllIPO() {
	return request
		.post("lixingren/crawl/all", {
			timeout: 120000, // 2分钟超时
		})
		.json<{ status: string, message: string, total_crawled: number, by_exchange: Record<string, number> }>();
}

/**
 * 爬取指定交易所IPO
 */
export function crawlExchangeIPO(exchange: string) {
	return request
		.post(`lixingren/crawl/${exchange}`, {
			timeout: 60000,
		})
		.json<{ status: string, message: string, exchange: string, crawled_count: number }>();
}

/**
 * 爬取AkShare所有IPO
 */
export function crawlAkShareAll() {
	return request
		.post("lixingren/crawl/akshare/all", {
			timeout: 120000,
		})
		.json<{ status: string, message: string, a_share_count: number, hk_share_count: number, total: number }>();
}

/**
 * 爬取AkShare A股IPO
 */
export function crawlAkShareAShare() {
	return request
		.post("lixingren/crawl/akshare/a-share", {
			timeout: 60000,
		})
		.json<{ status: string, message: string, crawled_count: number }>();
}

/**
 * 爬取AkShare 港股IPO
 */
export function crawlAkShareHKShare() {
	return request
		.post("lixingren/crawl/akshare/hk-share", {
			timeout: 60000,
		})
		.json<{ status: string, message: string, crawled_count: number }>();
}

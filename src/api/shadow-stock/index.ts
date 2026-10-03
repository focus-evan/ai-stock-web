import type {
	ShadowStockAggregateResponse,
	ShadowStockDashboardResponse,
	ShadowStockHoldingsDetailResponse,
	ShadowStockIPOTarget,
	ShadowStockListResponse,
	ShadowStockRecommendHistoryResponse,
	ShadowStockRecommendResponse,
	ShadowStockRefreshResponse,
	ShadowStockReportHistoryResponse,
	ShadowStockReportStatusResponse,
	ShadowStockTrack,
} from "./types";

import { request } from "#src/utils/request";

export * from "./types";

/**
 * 获取影子股仪表盘数据（可通过 batch_id 查看历史报告）
 */
export function fetchShadowStockDashboard(params?: { batch_id?: string }, signal?: AbortSignal) {
	return request
		.get("shadow-stock/dashboard", {
			signal,
			searchParams: params as any,
			ignoreLoading: false,
		})
		.json<ShadowStockDashboardResponse>();
}

/**
 * 获取热门赛道列表
 */
export function fetchShadowStockTracks() {
	return request
		.get("shadow-stock/tracks", { ignoreLoading: true })
		.json<ShadowStockListResponse<ShadowStockTrack>>();
}

/**
 * 获取 IPO 标的列表
 */
export function fetchShadowStockIPOTargets(params?: {
	track_id?: number
	limit?: number
}) {
	return request
		.get("shadow-stock/ipo-targets", {
			searchParams: params as any,
			ignoreLoading: true,
		})
		.json<ShadowStockListResponse<ShadowStockIPOTarget>>();
}

/**
 * 获取某 IPO 标的的影子股持股详情
 */
export function fetchShadowStockHoldings(targetId: number) {
	return request
		.get(`shadow-stock/holdings/${targetId}`, { ignoreLoading: true })
		.json<ShadowStockHoldingsDetailResponse>();
}

/**
 * 触发影子股报告刷新（异步）
 */
export function refreshShadowStockReport(signal?: AbortSignal) {
	return request
		.post("shadow-stock/refresh", { timeout: 10000, signal })
		.json<ShadowStockRefreshResponse>();
}

/**
 * 获取指定刷新批次的状态
 */
export function fetchShadowStockReportStatus(batchId: string, signal?: AbortSignal) {
	return request
		.get("shadow-stock/report/status", {
			signal,
			timeout: 10000,
			retry: 0,
			searchParams: { batch_id: batchId },
			ignoreLoading: true,
		})
		.json<ShadowStockReportStatusResponse>();
}

/**
 * 获取报告历史
 */
export function fetchShadowStockReportHistory(params?: {
	page?: number
	page_size?: number
}, signal?: AbortSignal) {
	return request
		.get("shadow-stock/report/history", {
			signal,
			searchParams: params as any,
			ignoreLoading: true,
		})
		.json<ShadowStockReportHistoryResponse>();
}

/**
 * 历史聚合数据：跨所有批次按赛道+公司去重
 */
export function fetchShadowStockAggregate(signal?: AbortSignal) {
	return request
		.get("shadow-stock/aggregate", { timeout: 30000, signal })
		.json<ShadowStockAggregateResponse>();
}

/**
 * 手动触发：更新最新批次的 IPO 上市状态，保留历史
 */
export function cleanupListedIPO() {
	return request
		.post("shadow-stock/cleanup-listed", { timeout: 60000 })
		.json<{ status: string, marked_targets?: number, marked_names?: string[], deleted_targets?: number, deleted_holdings?: number, deleted_names?: string[], message?: string }>();
}

/**
 * 获取影子股每日推荐（Top 10）
 */
export function fetchShadowStockRecommendations(params?: {
	date?: string
	limit?: number
}, signal?: AbortSignal) {
	return request
		.get("shadow-stock/recommend", {
			signal,
			searchParams: params as any,
			ignoreLoading: false,
		})
		.json<ShadowStockRecommendResponse>();
}

/**
 * 获取影子股推荐历史（按日期分组）
 */
export function fetchShadowStockRecommendHistory(params?: {
	page?: number
	page_size?: number
}) {
	return request
		.get("shadow-stock/recommend/history", {
			searchParams: params as any,
			ignoreLoading: true,
		})
		.json<ShadowStockRecommendHistoryResponse>();
}

/**
 * 手动触发生成影子股每日推荐
 */
export function generateShadowStockRecommendations(signal?: AbortSignal) {
	return request
		.post("shadow-stock/recommend/generate", { timeout: 120000, signal })
		.json<{ status: string, count?: number, recommend_date?: string, rejected_count?: number, rejection_reasons?: Record<string, number>, message?: string, error?: string }>();
}

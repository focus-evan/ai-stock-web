import type {
	ShadowStockAggregateResponse,
	ShadowStockDashboardResponse,
	ShadowStockHoldingsDetailResponse,
	ShadowStockIPOTarget,
	ShadowStockListResponse,
	ShadowStockRefreshResponse,
	ShadowStockReportHistoryResponse,
	ShadowStockTrack,
} from "./types";

import { request } from "#src/utils/request";

export * from "./types";

/**
 * 获取影子股仪表盘数据（可通过 batch_id 查看历史报告）
 */
export function fetchShadowStockDashboard(params?: { batch_id?: string }) {
	return request
		.get("shadow-stock/dashboard", {
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
export function refreshShadowStockReport() {
	return request
		.post("shadow-stock/refresh", { timeout: 10000 })
		.json<ShadowStockRefreshResponse>();
}

/**
 * 获取报告历史
 */
export function fetchShadowStockReportHistory(params?: {
	page?: number
	page_size?: number
}) {
	return request
		.get("shadow-stock/report/history", {
			searchParams: params as any,
			ignoreLoading: true,
		})
		.json<ShadowStockReportHistoryResponse>();
}

/**
 * 历史聚合数据：跨所有批次按赛道+公司去重
 */
export function fetchShadowStockAggregate() {
	return request
		.get("shadow-stock/aggregate", { timeout: 30000 })
		.json<ShadowStockAggregateResponse>();
}

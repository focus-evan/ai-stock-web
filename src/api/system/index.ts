import type {
	CacheStatsResponse,
	ClearCacheParams,
	ClearCacheResponse,
	DatabaseHealthResponse,
	DeleteSessionResponse,
	HealthCheckResponse,
	HealthResponse,
	RecommendationCacheResponse,
	SchedulerStatus,
	SessionListResponse,
	SyncHistoryResponse,
	SystemMetrics,
	TriggerSyncResponse,
} from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/**
 * 健康检查
 */
export function checkHealth() {
	return request.get("health").json<HealthResponse>();
}

/**
 * 数据库健康检查
 */
export function checkDatabaseHealth() {
	return request.get("health/db").json<DatabaseHealthResponse>();
}

/**
 * 清除缓存
 */
export function clearCache(params: ClearCacheParams | string = {}) {
	const requestParams: ClearCacheParams = typeof params === "string"
		? { cache_type: params as any }
		: params;

	return request
		.post("agent/cache/clear", {
			json: requestParams,
		})
		.json<ClearCacheResponse>();
}

/**
 * 查询缓存统计
 */
export function getCacheStats() {
	return request.get("agent/cache/stats").json<CacheStatsResponse>();
}

/**
 * 查询所有会话
 */
export function getAllSessions() {
	return request.get("agent/sessions").json<SessionListResponse>();
}

/**
 * 删除指定会话
 */
export function deleteSession(session_id: string) {
	return request.delete(`agent/sessions/${session_id}`).json<DeleteSessionResponse>();
}

/**
 * 获取完整健康检查（监控页面使用）
 */
export function getHealthCheck() {
	return request.get("system/health/full").json<HealthCheckResponse>();
}

/**
 * 获取系统指标
 */
export function getSystemMetrics() {
	return request.get("system/metrics").json<SystemMetrics>();
}

/**
 * 获取定时任务调度器状态
 */
export function getSchedulerStatus() {
	return request.get("system/scheduler/status").json<SchedulerStatus>();
}

/**
 * 获取同步状态（兼容旧接口）
 */
export function getSyncStatus() {
	return request.get("system/sync/status").json<any>();
}

/**
 * 获取同步历史
 */
export function getSyncHistory(params?: { page?: number, page_size?: number }) {
	return request
		.get("system/sync/history", {
			searchParams: params as any,
		})
		.json<SyncHistoryResponse>();
}

/**
 * 触发股票同步
 */
export function triggerStockSync() {
	return request.post("system/sync/stock").json<TriggerSyncResponse>();
}

/**
 * 触发IPO爬取
 */
export function triggerIPOCrawl() {
	return request.post("system/sync/ipo").json<TriggerSyncResponse>();
}

/**
 * 获取推荐缓存概览
 */
export function getRecommendationCache() {
	return request.get("system/cache/recommendations").json<RecommendationCacheResponse>();
}

/**
 * 清除推荐缓存
 */
export function clearRecommendationCache(strategyType?: string) {
	const searchParams: Record<string, string> = {};
	if (strategyType)
		searchParams.strategy_type = strategyType;
	return request
		.delete("system/cache/recommendations/clear", { searchParams })
		.json<any>();
}

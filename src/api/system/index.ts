import type {
	CacheStatsResponse,
	ClearCacheParams,
	ClearCacheResponse,
	DatabaseHealthResponse,
	DeleteSessionResponse,
	HealthCheckResponse,
	HealthResponse,
	SessionListResponse,
	SyncHistoryResponse,
	SyncStatus,
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
	// 如果传入的是字符串，转换为对象
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
 * 获取健康检查（监控页面使用）
 */
export function getHealthCheck() {
	return request.get("health/check").json<HealthCheckResponse>();
}

/**
 * 获取系统指标
 */
export function getSystemMetrics() {
	return request.get("system/metrics").json<SystemMetrics>();
}

/**
 * 获取同步状态
 */
export function getSyncStatus() {
	return request.get("system/sync/status").json<SyncStatus>();
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

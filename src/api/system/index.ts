import type {
	CacheStatsResponse,
	ClearCacheParams,
	ClearCacheResponse,
	DatabaseHealthResponse,
	DeleteSessionResponse,
	HealthResponse,
	SessionListResponse,
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
export function clearCache(params: ClearCacheParams = {}) {
	return request
		.post("agent/cache/clear", {
			json: params,
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

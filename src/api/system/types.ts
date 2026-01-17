/**
 * System Management API types
 */

export interface HealthResponse {
	status: "healthy" | "unhealthy"
	timestamp?: string
	version?: string
}

export interface DatabaseHealthResponse {
	status: "healthy" | "unhealthy"
	database: "connected" | "disconnected"
	response_time_ms: number
}

export interface CacheStatsResponse {
	total_items: number
	total_size_mb: number
	hit_rate: number
	by_type: Record<string, number>
}

export interface ClearCacheParams {
	cache_type?: "all" | "query" | "session"
}

export interface ClearCacheResponse {
	status: string
	message: string
	cache_type: string
	cleared_items: number
}

export interface SessionInfo {
	session_id: string
	created_at: string
	last_activity: string
	message_count: number
}

export interface SessionListResponse {
	sessions: SessionInfo[]
	total: number
}

export interface DeleteSessionResponse {
	status: string
	message: string
	session_id: string
}

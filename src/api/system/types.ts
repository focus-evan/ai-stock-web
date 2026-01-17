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

// Monitor types
export interface HealthCheckResponse {
	status: "healthy" | "unhealthy"
	database_status: "connected" | "disconnected"
	api_status: "healthy" | "unhealthy"
	database_info?: {
		pool_size: number
		max_connections: number
		active_queries: number
		version: string
		uptime: string
	}
}

export interface SystemMetrics {
	cpu_usage: number
	memory_usage: number
	active_connections: number
	requests_per_minute: number
	avg_response_time: number
	api_metrics?: Record<string, {
		count: number
		avg_time: number
		max_time: number
	}>
}

// Sync types
export interface SyncStatus {
	stock_sync_status: "idle" | "running" | "completed" | "failed"
	ipo_crawl_status: "idle" | "running" | "completed" | "failed"
	stock_sync_progress?: number
	ipo_crawl_progress?: number
	last_sync_time?: string
}

export interface SyncHistoryItem {
	id: string
	task_type: "stock_sync" | "ipo_crawl"
	status: "pending" | "running" | "completed" | "failed"
	start_time: string
	end_time?: string
	duration?: number
	records_processed?: number
}

export interface SyncHistoryResponse {
	data: SyncHistoryItem[]
	total: number
	page: number
	page_size: number
}

export interface TriggerSyncResponse {
	status: string
	message: string
	task_id: string
}

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
	total_keys: number
	total_size_mb: number
	total_size: number
	hit_rate: number
	hits: number
	misses: number
	by_type: Record<string, number>
	cache_types?: Record<string, {
		keys: number
		size: number
		hits?: number
		misses?: number
	}>
}

export interface ClearCacheParams {
	cache_type?: "all" | "query" | "session" | "stock" | "ipo" | "rag" | "document"
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
	status: "healthy" | "degraded" | "unhealthy"
	checks: {
		api: { status: string, uptime_seconds: number }
		database: {
			status: string
			version?: string
			uptime_seconds?: number
			uptime_display?: string
			active_connections?: number
			pool_size?: number
			pool_free?: number
			pool_max?: number
			error?: string
		}
		scheduler: { status: string, error?: string }
		llm_api: { status: string, provider?: string }
	}
	checked_at: string
	// legacy compat
	database_status?: string
	api_status?: string
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
	memory_total_gb: number
	memory_used_gb: number
	disk_usage: number
	disk_total_gb: number
	disk_used_gb: number
	load_average: number[]
	process_uptime_seconds: number
	process_memory_mb: number
	python_version: string
	db_pool: { size: number, free: number, used: number, max: number }
	// legacy compat
	active_connections?: number
	requests_per_minute?: number
	avg_response_time?: number
	api_metrics?: Record<string, {
		count: number
		avg_time: number
		max_time: number
	}>
}

// Scheduler types
export interface SchedulerTask {
	strategy: string
	name: string
	phase: string
	label: string
	time: string
	done: boolean
}

export interface SchedulerStatus {
	running: boolean
	is_trading_day: boolean
	current_time: string
	date: string
	poll_interval_seconds: number
	tasks: SchedulerTask[]
	summary: {
		total: number
		done: number
		pending: number
		progress: number
	}
}

// Recommendation cache types
export interface RecommendationCacheStat {
	strategy_type: string
	total_records: number
	latest_date: string
	earliest_date: string
	total_stocks: number
}

export interface RecommendationCacheRecent {
	id: number
	strategy_type: string
	trading_date: string
	session_type: string
	stock_count: number
	generated_at: string
}

export interface RecommendationCacheResponse {
	stats: RecommendationCacheStat[]
	recent: RecommendationCacheRecent[]
}

// Sync types (legacy compat)
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

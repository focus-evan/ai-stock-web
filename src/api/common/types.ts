/**
 * Common API types used across all modules
 */

export interface ApiResponse<T = any> {
	status: "success" | "error"
	data?: T
	message?: string
	detail?: string
}

export interface PaginationParams {
	page?: number
	page_size?: number
}

export interface PaginatedResponse<T> {
	data: T[]
	total: number
	page: number
	page_size: number
	total_pages?: number
}

export interface TaskResponse {
	task_id: string
	status: "pending" | "processing" | "completed" | "failed"
	message?: string
	created_at?: string
	updated_at?: string
	result?: any
}

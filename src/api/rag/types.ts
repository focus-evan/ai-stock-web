/**
 * RAG (Retrieval-Augmented Generation) API types
 */

export interface RAGQueryParams {
	query: string
	session_id?: string
	collection_name?: string
	top_k?: number
	similarity_threshold?: number
}

export interface Source {
	content: string
	metadata: {
		file_name: string
		page?: number
		[key: string]: any
	}
	score: number
}

export interface RAGResponse {
	answer: string
	sources: Source[]
	session_id: string
	request_id: string
	tool_calls?: any[]
	thinking_process?: string
}

export interface SessionInfo {
	session_id: string
	message_count: number
	last_activity: string
	created_at: string
}

export interface SessionListResponse {
	sessions: SessionInfo[]
	total: number
}

export interface RAGLogResponse {
	request_id: string
	query: string
	session_id: string
	answer?: string
	sources: Source[]
	tool_calls: any[]
	created_at: string
	response_time_ms: number
}

export interface SearchResult {
	content: string
	metadata: {
		file_name: string
		page?: number
	}
	score: number
}

export interface SimpleSearchResponse {
	results: SearchResult[]
	total: number
}

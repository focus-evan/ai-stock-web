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
	answer?: string // 兼容旧格式
	response?: string // 新格式
	sources?: Source[]
	session_id: string
	request_id: string
	tool_calls?: any[]
	thinking_process?: string
	intermediate_steps?: any[]
	raw_response?: string
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

/**
 * Table Input API types
 */
export interface TableInputParams {
	question: string
	session_id?: string
	user_id?: string
	similarity_top_k?: number
}

export interface TableInputResponse {
	request_id: string
	session_id: string
	user_id: string
	answer: string
	reference_docs: any[]
	prompt_tokens: number
	completion_tokens: number
	response_time_ms: number
	model_name: string
}

/**
 * Free Style API types (自由问答)
 */
export interface FreeStyleParams {
	question: string
	session_id?: string
	user_id?: string
	similarity_top_k?: number
}

export interface FreeStyleResponse {
	request_id: string
	session_id: string
	user_id: string
	answer: string
	prompt_tokens: number
	completion_tokens: number
	response_time_ms: number
	model_name: string
}

/**
 * Free Style Cards API types (自由卡片问答)
 */
export interface FreeStyleCard {
	type: "ConclusionCard" | "ReasonCard" | "NextStepCard" | "QuestionCard" | string
	content: string
}

export interface FreeStyleCardsResponse {
	request_id: string
	session_id: string
	user_id: string
	answer: string
	cards: FreeStyleCard[]
	prompt_tokens: number
	completion_tokens: number
	response_time_ms: number
	model_name: string
}

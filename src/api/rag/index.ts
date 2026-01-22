import type {
	RAGLogResponse,
	RAGQueryParams,
	RAGResponse,
	SessionListResponse,
	SimpleSearchResponse,
} from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/**
 * RAG问答（在线）
 * 超时时间：3分钟（AI推理需要较长时间）
 */
export function ragQuery(params: RAGQueryParams) {
	return request
		.post("agent/rag", {
			json: params,
			ignoreLoading: false,
			timeout: 180000, // 3分钟
		})
		.json<RAGResponse>();
}

/**
 * RAG问答（离线）
 * 超时时间：3分钟（AI推理需要较长时间）
 */
export function ragQueryOffline(params: RAGQueryParams) {
	return request
		.post("agent/rag/offline", {
			json: params,
			ignoreLoading: false,
			timeout: 180000, // 3分钟
		})
		.json<RAGResponse>();
}

/**
 * RAG流式问答（在线）- 返回ReadableStream
 */
export function ragQueryStream(params: RAGQueryParams) {
	return request.post("agent/rag/stream", {
		json: params,
	});
}

/**
 * RAG流式问答（离线）
 */
export function ragQueryStreamOffline(params: RAGQueryParams) {
	return request.post("agent/rag/stream/offline", {
		json: params,
	});
}

/**
 * 清除会话记忆
 */
export function clearSessionMemory(session_id: string) {
	return request
		.post("agent/rag/clear-memory", {
			searchParams: { session_id },
		})
		.json<{ status: string, message: string, session_id: string }>();
}

/**
 * 查询会话列表
 */
export function getSessionList() {
	return request.get("agent/rag/sessions").json<SessionListResponse>();
}

/**
 * 查询RAG日志
 */
export function getRAGLog(request_id: string, include_answers: boolean = false) {
	return request
		.get(`agent/rag/logs/${request_id}`, {
			searchParams: { include_answers },
		})
		.json<RAGLogResponse>();
}

/**
 * 简单向量搜索
 */
export function simpleSearch(params: { query: string, collection_name?: string, top_k?: number }) {
	return request
		.post("agent/search-simple", {
			json: params,
		})
		.json<SimpleSearchResponse>();
}

/**
 * 智能表格输入
 * 超时时间：3分钟（AI推理需要较长时间）
 */
export function tableInput(params: import("./types").TableInputParams) {
	return request
		.post("rag/table/input", {
			json: params,
			ignoreLoading: false,
			timeout: 180000, // 3分钟
		})
		.json<import("./types").TableInputResponse>();
}

/**
 * 自由问答
 * 超时时间：3分钟（AI推理需要较长时间）
 */
export function freeStyle(params: import("./types").FreeStyleParams) {
	return request
		.post("agent/free/style", {
			json: params,
			ignoreLoading: false,
			timeout: 180000, // 3分钟
		})
		.json<import("./types").FreeStyleResponse>();
}

/**
 * 自由卡片问答
 * 超时时间：3分钟（AI推理需要较长时间）
 */
export function freeStyleCards(params: import("./types").FreeStyleParams) {
	return request
		.post("agent/free/style/cards", {
			json: params,
			ignoreLoading: false,
			timeout: 180000, // 3分钟
		})
		.json<import("./types").FreeStyleCardsResponse>();
}

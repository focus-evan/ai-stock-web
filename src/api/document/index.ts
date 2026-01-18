import type { TaskResponse } from "../common/types";
import type {
	CollectionInfo,
	CollectionListResponse,
	CreateCollectionParams,
	CreateCollectionResponse,
	DocumentListResponse,
	UploadResponse,
	UploadTaskResponse,
} from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/**
 * 上传文档（同步）- 支持进度回调和策略参数
 */
export async function uploadDocument(
	file: File,
	collectionName: string,
	options?: {
		onProgress?: (progress: number) => void
		chunkingStrategyCode?: string
		chunkingStrategyParams?: {
			chunk_size?: number
			chunk_overlap?: number
		}
		embeddingStrategyCode?: string
		embeddingStrategyParams?: {
			model_name?: string
		}
	},
) {
	const formData = new FormData();
	formData.append("files", file);

	// 构建查询参数
	const searchParams: Record<string, string> = {
		collection_name: collectionName,
	};

	if (options?.chunkingStrategyCode) {
		searchParams.chunking_strategy_code = options.chunkingStrategyCode;
	}
	if (options?.chunkingStrategyParams) {
		searchParams.chunking_strategy_params = JSON.stringify(
			options.chunkingStrategyParams,
		);
	}
	if (options?.embeddingStrategyCode) {
		searchParams.embedding_strategy_code = options.embeddingStrategyCode;
	}
	if (options?.embeddingStrategyParams) {
		searchParams.embedding_strategy_params = JSON.stringify(
			options.embeddingStrategyParams,
		);
	}

	// 模拟进度（因为 ky 不直接支持上传进度）
	if (options?.onProgress) {
		options.onProgress(0);
		setTimeout(() => options.onProgress?.(30), 100);
		setTimeout(() => options.onProgress?.(60), 500);
	}

	const result = await request
		.post("api/agent/upload", {
			body: formData,
			searchParams,
			timeout: 60000, // 60秒超时
		})
		.json<UploadResponse>();

	if (options?.onProgress) {
		options.onProgress(100);
	}

	return result;
}

/**
 * 上传文档（原始方法，使用 FormData）
 */
export function uploadDocumentWithFormData(formData: FormData) {
	return request
		.post("api/agent/upload", {
			body: formData,
			ignoreLoading: false,
			timeout: 60000, // 60秒超时
		})
		.json<UploadResponse>();
}

/**
 * 上传文档（异步）
 */
export function uploadDocumentAsync(formData: FormData) {
	return request
		.post("api/agent/upload/async", {
			body: formData,
		})
		.json<UploadTaskResponse>();
}

/**
 * 查询上传任务状态
 */
export function getTaskStatus(task_id: string) {
	return request.get(`api/agent/task/${task_id}`).json<TaskResponse>();
}

/**
 * 创建Collection
 */
export function createCollection(name: string, description?: string) {
	return request
		.post("api/agent/collection/create", {
			json: { name, description },
		})
		.json<CreateCollectionResponse>();
}

/**
 * 创建Collection（使用参数对象）
 */
export function createCollectionWithParams(params: CreateCollectionParams) {
	return request
		.post("api/agent/collection/create", {
			json: params,
		})
		.json<CreateCollectionResponse>();
}

/**
 * 查询Collection信息
 */
export function getCollectionInfo(collection_name: string = "base") {
	return request
		.get("api/agent/collection-info", {
			searchParams: { collection_name },
		})
		.json<CollectionInfo>();
}

/**
 * 查询Collection文档列表
 */
export function getCollectionDocuments(params?: {
	collection_name?: string
	limit?: number
	offset?: number
}) {
	// 过滤掉 undefined 值，避免 GET 请求出现问题
	const filteredParams: Record<string, string | number> = {};
	if (params?.collection_name) {
		filteredParams.collection_name = params.collection_name;
	}
	if (params?.limit !== undefined) {
		filteredParams.limit = params.limit;
	}
	if (params?.offset !== undefined) {
		filteredParams.offset = params.offset;
	}

	return request
		.get("api/agent/collection/documents", {
			searchParams: filteredParams,
		})
		.json<DocumentListResponse>();
}

/**
 * 查询所有Collections
 */
export function getAllCollections() {
	return request.get("api/collections").json<CollectionListResponse>();
}

/**
 * 查询所有Collections（别名）
 */
export function getCollections() {
	return getAllCollections();
}

/**
 * 查询文档列表
 */
export function getDocuments(params?: {
	collection_name?: string
	limit?: number
	offset?: number
}) {
	return getCollectionDocuments(params);
}

/**
 * 删除文档
 */
export function deleteDocument(docId: string) {
	return request.delete(`api/agent/document/${docId}`).json();
}

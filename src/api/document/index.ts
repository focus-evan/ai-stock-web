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
 * 上传文档（同步）
 */
export function uploadDocument(formData: FormData) {
	return request
		.post("agent/upload", {
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
		.post("agent/upload/async", {
			body: formData,
		})
		.json<UploadTaskResponse>();
}

/**
 * 查询上传任务状态
 */
export function getTaskStatus(task_id: string) {
	return request.get(`agent/task/${task_id}`).json<TaskResponse>();
}

/**
 * 创建Collection
 */
export function createCollection(params: CreateCollectionParams) {
	return request
		.post("agent/collection/create", {
			json: params,
		})
		.json<CreateCollectionResponse>();
}

/**
 * 查询Collection信息
 */
export function getCollectionInfo(collection_name: string = "base") {
	return request
		.get("agent/collection-info", {
			searchParams: { collection_name },
		})
		.json<CollectionInfo>();
}

/**
 * 查询Collection文档列表
 */
export function getCollectionDocuments(params: {
	collection_name?: string
	limit?: number
	offset?: number
}) {
	return request
		.get("agent/collection/documents", {
			searchParams: params,
		})
		.json<DocumentListResponse>();
}

/**
 * 查询所有Collections
 */
export function getAllCollections() {
	return request.get("api/collections").json<CollectionListResponse>();
}

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
 * 上传文档（同步）- 支持进度回调
 */
export async function uploadDocument(
	file: File,
	collectionName: string,
	onProgress?: (progress: number) => void,
) {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("collection_name", collectionName);

	// 模拟进度（因为 ky 不直接支持上传进度）
	if (onProgress) {
		onProgress(0);
		setTimeout(() => onProgress(30), 100);
		setTimeout(() => onProgress(60), 500);
	}

	const result = await request
		.post("agent/upload", {
			body: formData,
			timeout: 60000, // 60秒超时
		})
		.json<UploadResponse>();

	if (onProgress) {
		onProgress(100);
	}

	return result;
}

/**
 * 上传文档（原始方法，使用 FormData）
 */
export function uploadDocumentWithFormData(formData: FormData) {
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
export function createCollection(name: string, description?: string) {
	return request
		.post("agent/collection/create", {
			json: { name, description },
		})
		.json<CreateCollectionResponse>();
}

/**
 * 创建Collection（使用参数对象）
 */
export function createCollectionWithParams(params: CreateCollectionParams) {
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
	return request.get("collections").json<CollectionListResponse>();
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
export function getDocuments(params: {
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
	return request.delete(`agent/document/${docId}`).json();
}

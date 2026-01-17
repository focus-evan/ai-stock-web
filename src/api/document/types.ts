/**
 * Document Management API types
 */

import type { TaskResponse } from "../common/types";

export interface UploadResponse {
	status: string
	message: string
	uploaded_files: string[]
	documents_ingested: number
	collection_name: string
}

export interface CollectionInfo {
	status: string
	collection_name: string
	points_count: number
	vectors_count: number | null
	config: {
		vector_size: number
		distance_metric: string
	}
}

export interface DocumentItem {
	id: string
	content: string
	metadata: {
		file_name: string
		page?: number
		[key: string]: any
	}
}

export interface DocumentListResponse {
	documents: DocumentItem[]
	total: number
	limit: number
	offset: number
}

export interface Collection {
	name: string
	points_count: number
	vector_size: number
}

export interface CollectionListResponse {
	collections: Collection[]
	total: number
}

export interface CreateCollectionParams {
	collection_name: string
	vector_size?: number
	distance?: "Cosine" | "Euclid" | "Dot"
	on_disk?: boolean
}

export interface CreateCollectionResponse {
	status: string
	message: string
	collection_name: string
	config: {
		vector_size: number
		distance_metric: string
	}
}

export type UploadTaskResponse = TaskResponse;

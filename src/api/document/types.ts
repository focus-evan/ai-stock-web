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

export interface DocumentSummaryItem {
	doc_id: string
	file_name: string
	chunk_count: number
}

export interface DocumentChunk {
	point_id: string
	text: string
	metadata: {
		_node_type: string
		creation_date: string
		doc_id: string
		document_id: string
		file_name: string
		file_path: string
		file_size: number
		file_type: string
		last_modified_date: string
		ref_doc_id: string
		[key: string]: any
	}
}

export interface DocumentDetailResponse {
	status: string
	doc_id: string
	file_name: string
	chunk_count: number
	chunks: DocumentChunk[]
	collection_name: string
	vector_config?: {
		vector_size: number
		distance: string
		embedding_model_hint?: string
	}
}

export interface DocumentListResponse {
	status: string
	collection_name: string
	total_points: number
	total_documents: number
	scanned_points: number
	documents: DocumentSummaryItem[]
}

export interface Collection {
	name: string
	points_count: number
	vectors_count: number | null
	config: {
		vector_size: number
		distance_metric: string
	}
}

export interface CollectionListResponse {
	status: string
	total_collections: number
	collections: Collection[]
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

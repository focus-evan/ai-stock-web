/**
 * Stock Information API types
 */

import type { PaginatedResponse, PaginationParams } from "../common/types";

export interface StockInfo {
	stock_code: string
	stock_name: string
	listing_status: string
	exchange: string
	listing_date: string
	industry?: string
	company_name?: string
	registered_capital?: string
	legal_representative?: string
	business_scope?: string
	created_at?: string
	updated_at?: string
}

export interface StockQueryParams extends PaginationParams {
	listing_status?: string
	exchange?: string
	industry?: string
}

export type StockListResponse = PaginatedResponse<StockInfo>;

export interface StockSearchParams {
	keyword: string
	limit?: number
}

export interface StockSyncParams {
	stock_codes?: string[]
	sync_all?: boolean
}

export interface StockSyncResponse {
	status: string
	message: string
	synced_count: number
	failed_count: number
	details?: Array<{
		stock_code: string
		status: string
	}>
}

export interface StockStatistics {
	total_stocks: number
	listed_stocks: number
	unlisted_stocks: number
	by_exchange: Record<string, number>
	by_status: Record<string, number>
}

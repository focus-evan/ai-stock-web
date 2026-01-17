/**
 * Shareholder Information API types
 */

export interface ShareholderInfo {
	shareholder_name: string
	shareholding_ratio: number
	shareholding_number: number
	shareholder_type: string
	rank?: number
}

export interface ShareholderQueryParams {
	company_name: string
	top_n?: number
}

export interface ShareholderQueryResponse {
	company_name: string
	shareholders: ShareholderInfo[]
	total_shareholders: number
	data_date: string
}

export interface ControllingShareholderResponse {
	company_name: string
	controlling_shareholder: ShareholderInfo
}

export interface ShareholderRefreshResponse {
	status: string
	message: string
	company_name: string
	updated_count: number
}

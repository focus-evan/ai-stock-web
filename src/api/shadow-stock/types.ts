/**
 * 影子股套利策略 — TypeScript 类型定义
 */

// ======================== 热门赛道 ========================

export interface ShadowStockTrack {
	id: number
	track_name: string
	track_description: string
	heat_score: number
	policy_support: string
	is_active: boolean
	batch_id: string
	created_at?: string
	updated_at?: string
}

// ======================== IPO 标的 ========================

export interface ComparableCompany {
	name: string
	market_cap: string
	pe: string
}

export interface ShadowStockIPOTarget {
	id: number
	track_id: number
	track?: ShadowStockTrack
	company_name: string
	ipo_status: string
	ipo_status_detail: string
	target_market: string
	expected_valuation: number
	valuation_method: string
	valuation_confidence: "high" | "medium" | "low"
	latest_progress: string
	progress_date: string | null
	industry_pe: number
	comparable_companies: ComparableCompany[] | null
	importance_score: number
	data_source: string
	batch_id: string
	holdings: ShadowStockHolding[]
	created_at?: string
	updated_at?: string
}

// ======================== 影子股持股关系 ========================

export interface ShadowStockHolding {
	id: number
	ipo_target_id: number
	holder_name: string
	holder_stock_code: string
	holding_ratio: number
	holding_type: string
	holder_market_cap: number
	expected_gain: number
	gain_ratio: number
	discount_factor: number
	adjusted_gain_ratio: number
	holder_main_business: string
	holder_business_status: string
	risk_level: "low" | "medium" | "high"
	risk_factors: string[] | null
	batch_id: string
	created_at?: string
	updated_at?: string
}

// ======================== 报告 ========================

export interface ShadowStockReport {
	id: number
	batch_id: string
	status: "running" | "completed" | "failed"
	track_count: number
	target_count: number
	holding_count: number
	llm_model: string
	duration_seconds: number
	error_message: string
	created_at: string
	completed_at: string | null
}

// ======================== API 响应 ========================

export interface ShadowStockDashboardResponse {
	status: string
	batch_id?: string
	report?: ShadowStockReport
	tracks?: ShadowStockTrack[]
	top_ipo_targets?: ShadowStockIPOTarget[]
	next_refresh_at?: string
	needs_refresh?: boolean
	message?: string
}

export interface ShadowStockListResponse<T> {
	status: string
	data: T[]
	total: number
}

export interface ShadowStockRefreshResponse {
	status: "started" | "running" | "completed" | "failed"
	message: string
	batch_id?: string
	track_count?: number
	target_count?: number
	holding_count?: number
	duration_seconds?: number
	error?: string
}

export interface ShadowStockHoldingsDetailResponse {
	status: string
	ipo_target_id: number
	holdings: ShadowStockHolding[]
	total: number
}

export interface ShadowStockReportHistoryResponse {
	status: string
	total: number
	page: number
	page_size: number
	data: ShadowStockReport[]
}

// ======================== 历史聚合 ========================

export interface AggShadowStock {
	holder_name: string
	holder_stock_code: string
	holding_ratio: number
	holding_type: string
	holder_market_cap: number
	gain_ratio: number
	holder_main_business: string
	risk_level: string
}

export interface AggCompany {
	company_name: string
	ipo_status: string
	target_market: string
	expected_valuation: number
	importance_score: number
	latest_progress: string
	data_source: string
	appear_count: number
	shadow_stocks: AggShadowStock[]
}

export interface AggTrack {
	track_name: string
	track_description: string
	heat_score: number
	policy_support: string
	company_count: number
	companies: AggCompany[]
}

export interface ShadowStockAggregateResponse {
	status: string
	tracks: AggTrack[]
	total_tracks: number
	total_companies: number
	total_reports: number
	message?: string
}

// ======================== 影子股每日推荐 ========================

export interface ShadowStockRecommendation {
	id: number
	rank: number
	holder_name: string
	holder_stock_code: string
	ipo_target_name: string
	track_name: string
	recommend_type: "小马拉大车" | "产业链协同" | "综合"
	total_score: number
	recommend_level: "S" | "A" | "B" | "C"
	// 评分明细
	elasticity_score: number
	safety_score: number
	ipo_progress_score: number
	track_heat_score: number
	confidence_score: number
	// 关键数据
	holding_ratio: number
	holding_type: string
	holder_market_cap: number
	expected_valuation: number
	adjusted_gain_ratio: number
	// 推荐理由
	recommend_reason: string
	risk_summary: string
	investment_logic: string
	// 元数据
	ipo_status: string
	holder_business_status: string
	risk_level: "low" | "medium" | "high"
	risk_factors: string[]
	batch_id: string
	created_at?: string
}

export interface ShadowStockRecommendResponse {
	status: string
	recommend_date: string | null
	total: number
	type_distribution: Record<string, number>
	level_distribution: Record<string, number>
	recommendations: ShadowStockRecommendation[]
	message?: string
}

export interface ShadowStockRecommendHistoryItem {
	recommend_date: string
	count: number
	max_score: number
	min_score: number
	created_at?: string
}

export interface ShadowStockRecommendHistoryResponse {
	status: string
	total: number
	page: number
	page_size: number
	data: ShadowStockRecommendHistoryItem[]
}

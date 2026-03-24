import type {
	AuctionResponse,
	BreakthroughResponse,
	CombinedResponse,
	DragonHeadResponse,
	EventDrivenResponse,
	MoatValueResponse,
	MovingAverageResponse,
	NorthboundResponse,
	SentimentResponse,
	StockAnalysisResponse,
	StrategiesSummaryResponse,
	TrendMomentumResponse,
	VolumePriceResponse,
} from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/**
 * 获取龙头战法推荐列表
 * @param limit - 返回推荐数量，默认20
 */
export function fetchDragonHeadRecommendations(limit: number = 13) {
	return request
		.get("strategy/dragon-head", {
			searchParams: { limit },
			timeout: 60000, // 60秒超时（策略计算可能较慢）
		})
		.json<DragonHeadResponse>();
}

/**
 * 手动刷新龙头战法推荐（绕过缓存，重新执行策略分析+LLM）
 * @param limit - 返回推荐数量，默认13
 */
export function refreshDragonHeadRecommendations(limit: number = 13) {
	return request
		.post("strategy/dragon-head/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<DragonHeadResponse>();
}

/**
 * 获取情绪战法数据
 * @param days - 返回历史天数，默认30
 */
export function fetchSentimentData(days: number = 30) {
	return request
		.get("strategy/sentiment", {
			searchParams: { days },
			timeout: 120000, // 120秒超时（首次计算较慢）
		})
		.json<SentimentResponse>();
}

/**
 * 手动刷新情绪战法推荐（绕过缓存，重新执行策略分析+LLM）
 * @param limit - 返回推荐数量，默认13
 */
export function refreshSentimentRecommendations(limit: number = 13) {
	return request
		.post("strategy/sentiment/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<SentimentResponse>();
}

/**
 * 获取事件驱动战法推荐
 * @param limit - 返回推荐数量，默认13
 */
export function fetchEventDrivenRecommendations(limit: number = 13, forceRefresh: boolean = false) {
	return request
		.get("strategy/event-driven", {
			searchParams: { limit, force_refresh: forceRefresh },
			timeout: forceRefresh ? 180000 : 90000,
		})
		.json<EventDrivenResponse>();
}

/**
 * 获取突破战法推荐
 * @param limit - 返回推荐数量，默认13
 */
export function fetchBreakthroughRecommendations(limit: number = 13) {
	return request
		.get("strategy/breakthrough", {
			searchParams: { limit },
			timeout: 90000,
		})
		.json<BreakthroughResponse>();
}

/**
 * 获取量价关系推荐
 * @param limit - 返回推荐数量，默认13
 */
export function fetchVolumePriceRecommendations(limit: number = 13) {
	return request
		.get("strategy/volume-price", {
			searchParams: { limit },
			timeout: 90000,
		})
		.json<VolumePriceResponse>();
}

/**
 * 获取竞价/尾盘战法推荐
 * @param limit - 返回推荐数量，默认13
 */
export function fetchAuctionRecommendations(limit: number = 13) {
	return request
		.get("strategy/auction", {
			searchParams: { limit },
			timeout: 90000,
		})
		.json<AuctionResponse>();
}

export function refreshAuctionRecommendations(limit: number = 13) {
	return request
		.post("strategy/auction/refresh", {
			searchParams: { limit },
			timeout: 180000,
		})
		.json<AuctionResponse>();
}

/**
 * 获取均线战法推荐
 * @param limit - 返回推荐数量，默认13
 */
export function fetchMovingAverageRecommendations(limit: number = 13) {
	return request
		.get("strategy/moving-average", {
			searchParams: { limit },
			timeout: 90000,
		})
		.json<MovingAverageResponse>();
}

/**
 * 个股综合分析（LLM增强）
 * @param stock - 股票代码或公司名称
 */
export function fetchStockAnalysis(stock: string) {
	return request
		.get("strategy/stock-analysis", {
			searchParams: { stock },
			timeout: 120000, // 120秒超时（含LLM分析）
		})
		.json<StockAnalysisResponse>();
}

/**
 * 个股分析历史列表
 */
export function fetchAnalysisHistory(params: { stock_code?: string, page?: number, page_size?: number } = {}) {
	return request
		.get("strategy/stock-analysis/history", {
			searchParams: params as any,
			timeout: 15000,
		})
		.json<{ status: string, data: { items: any[], total: number, page: number, page_size: number } }>();
}

/**
 * 个股分析历史详情
 */
export function fetchAnalysisDetail(id: number) {
	return request
		.get(`strategy/stock-analysis/history/${id}`, { timeout: 15000 })
		.json<{ status: string, data: any }>();
}

/**
 * 删除个股分析历史记录
 */
export function deleteAnalysisRecord(id: number) {
	return request
		.delete(`strategy/stock-analysis/history/${id}`, { timeout: 10000 })
		.json<{ status: string, message: string }>();
}

/**
 * 轻量级策略命中查询（不调用LLM）
 * @param stock - 股票代码或公司名称
 */
export function fetchStrategiesSummary(stock: string) {
	return request
		.get("strategy/stock-analysis/strategies-summary", {
			searchParams: { stock },
			timeout: 30000,
		})
		.json<StrategiesSummaryResponse>();
}

/**
 * 获取综合战法推荐（多战法交集）
 * @param limit - 返回推荐数量，默认5
 * @param minIntersection - 最少覆盖几个战法，默认2
 */
export function fetchCombinedRecommendations(limit: number = 5, minIntersection: number = 2) {
	return request
		.get("strategy/combined", {
			searchParams: { limit, min_intersection: minIntersection },
			timeout: 30000, // 30秒超时（缓存命中秒回，未命中含LLM分析）
		})
		.json<CombinedResponse>();
}

/**
 * 手动刷新综合战法推荐（绕过缓存，重新计算实时行情+LLM分析）
 * @param limit - 返回推荐数量，默认13
 * @param minIntersection - 最少覆盖几个战法，默认2
 */
export function refreshCombinedRecommendations(limit: number = 13, minIntersection: number = 2) {
	return request
		.post("strategy/combined/refresh", {
			searchParams: { limit, min_intersection: minIntersection },
			timeout: 300000, // 300秒超时（3批LLM调用每批约40秒，总计约2-3分钟）
		})
		.json<CombinedResponse>();
}

/**
 * 手动刷新突破战法推荐（绕过缓存，重新执行策略分析+LLM）
 * @param limit - 返回推荐数量，默认13
 */
export function refreshBreakthroughRecommendations(limit: number = 13) {
	return request
		.post("strategy/breakthrough/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<BreakthroughResponse>();
}

/**
 * 手动刷新量价关系推荐（绕过缓存，重新执行策略分析+LLM）
 * @param limit - 返回推荐数量，默认13
 */
export function refreshVolumePriceRecommendations(limit: number = 13) {
	return request
		.post("strategy/volume-price/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<VolumePriceResponse>();
}

/**
 * 手动刷新均线战法推荐（绕过缓存，重新执行策略分析+LLM）
 * @param limit - 返回推荐数量，默认13
 */
export function refreshMovingAverageRecommendations(limit: number = 13) {
	return request
		.post("strategy/moving-average/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<MovingAverageResponse>();
}

/**
 * 获取北向资金推荐
 * @param limit - 返回推荐数量，默认13
 */
export function fetchNorthboundRecommendations(limit: number = 13) {
	return request
		.get("strategy/northbound", {
			searchParams: { limit },
			timeout: 90000,
		})
		.json<NorthboundResponse>();
}

/**
 * 手动刷新北向资金推荐（绕过缓存，重新执行策略分析+LLM）
 * @param limit - 返回推荐数量，默认13
 */
export function refreshNorthboundRecommendations(limit: number = 13) {
	return request
		.post("strategy/northbound/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<NorthboundResponse>();
}

/**
 * 获取趋势动量推荐
 * @param limit - 返回推荐数量，默认13
 */
export function fetchTrendMomentumRecommendations(limit: number = 13) {
	return request
		.get("strategy/trend-momentum", {
			searchParams: { limit },
			timeout: 90000,
		})
		.json<TrendMomentumResponse>();
}

/**
 * 手动刷新趋势动量推荐（绕过缓存，重新执行策略分析+LLM）
 * @param limit - 返回推荐数量，默认13
 */
export function refreshTrendMomentumRecommendations(limit: number = 13) {
	return request
		.post("strategy/trend-momentum/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<TrendMomentumResponse>();
}

// ===================== 护城河价值 =====================

/**
 * 获取护城河价值推荐列表
 * @param limit - 返回推荐数量，默认13
 */
export function fetchMoatValueRecommendations(limit: number = 13) {
	return request
		.get("strategy/moat-value", {
			searchParams: { limit },
			timeout: 120000,
		})
		.json<MoatValueResponse>();
}

/**
 * 手动刷新护城河价值推荐（绕过缓存）
 * @param limit - 返回推荐数量，默认13
 */
export function refreshMoatValueRecommendations(limit: number = 13) {
	return request
		.post("strategy/moat-value/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<MoatValueResponse>();
}

// ===================== 推荐历史 =====================

export interface RecommendationHistoryItem {
	id: number
	strategy_type: string
	trading_date: string
	session_type: string
	stock_count: number
	generated_at: string
	recommendations?: any[]
}

export interface RecommendationHistoryResponse {
	status: string
	data: {
		items: RecommendationHistoryItem[]
		total: number
	}
}

/**
 * 获取策略推荐历史
 * @param strategyType - 策略类型过滤（可选）
 * @param limit - 返回条数，默认30
 * @param includeDetail - 是否包含推荐明细，默认true
 */
export function fetchRecommendationHistory(
	strategyType?: string,
	limit: number = 30,
	includeDetail: boolean = true,
) {
	const searchParams: Record<string, any> = { limit, include_detail: includeDetail };
	if (strategyType) {
		searchParams.strategy_type = strategyType;
	}
	return request
		.get("strategy/recommendation-history", {
			searchParams,
			timeout: 15000,
		})
		.json<RecommendationHistoryResponse>();
}

// ===================== 跟投分析 =====================

export interface FollowUpRequest {
	stock_code: string
	stock_name?: string
	shares: number
	buy_price: number // 买入时的个股股价（元/股）
	buy_date?: string
	original_advice?: string
	original_buy_price?: number
	original_target_price?: number
	original_stop_loss?: number
}

export interface OperationPlanItem {
	action: string
	trigger_price: number
	quantity_pct: string
	timing: string
	detail: string
}

export interface FollowUpAnalysis {
	position_assessment: string
	core_decision: string
	decision_reason: string
	operation_plan: OperationPlanItem[]
	risk_points: string[]
	opportunity_points: string[]
	summary: string
}

export interface FollowUpPnlInfo {
	buy_price_per_share: number
	current_price: number
	change_pct: number
	shares: number
	buy_amount: number
	current_value: number
	pnl_amount: number
	pnl_pct: number
}

export interface FollowUpResponse {
	status: string
	data: {
		record_id?: number
		stock_code: string
		stock_name: string
		pnl_info: FollowUpPnlInfo
		market_info: Record<string, number>
		analysis: FollowUpAnalysis
	}
}

export interface FollowUpHistoryRecord {
	id: number
	stock_code: string
	stock_name: string
	shares: number
	buy_price: number
	buy_amount: number
	current_price: number
	change_pct: number
	pnl_amount: number
	pnl_pct: number
	core_decision: string
	position_assessment: string
	analysis_result: FollowUpAnalysis
	original_buy_price?: number
	original_target_price?: number
	original_stop_loss?: number
	analyzed_at: string
}

export interface FollowUpHistoryResponse {
	status: string
	data: {
		records: FollowUpHistoryRecord[]
		total: number
	}
}

/**
 * 综合战法跟投分析
 * 输入买入股数和个股股价，获取基于当前行情的深度持仓分析和操作指南
 */
export function fetchFollowUpAnalysis(payload: FollowUpRequest) {
	return request
		.post("strategy/combined/follow-up-analysis", {
			json: payload,
			timeout: 120000,
		})
		.json<FollowUpResponse>();
}

/**
 * 获取跟投分析历史记录
 */
export function fetchFollowUpHistory(stockCode?: string, limit = 30) {
	const searchParams: Record<string, any> = { limit };
	if (stockCode)
		searchParams.stock_code = stockCode;
	return request
		.get("strategy/combined/follow-up-history", {
			searchParams,
			timeout: 15000,
		})
		.json<FollowUpHistoryResponse>();
}

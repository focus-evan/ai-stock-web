import type { DailyPicksDetailResponse, DailyPicksHistoryResponse, DailyPicksResponse } from "./daily-picks-types";
import type {
	AuctionResponse,
	BreakthroughResponse,
	CombinedResponse,
	DragonHeadResponse,
	EventDrivenResponse,
	MoatValueResponse,
	MovingAverageResponse,
	NorthboundResponse,
	OvernightResponse,
	RelayResponse,
	SentimentResponse,
	StockAnalysisResponse,
	StrategiesSummaryResponse,
	TrendMomentumResponse,
	VolumePriceResponse,
} from "./types";
import { request } from "#src/utils/request";

export * from "./daily-picks-types";
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

// ===================== 龙头战法跟投指导 =====================

export interface DragonHeadFollowStock {
	code?: string
	name?: string
	stock_code?: string // relay follow uses this
	stock_name?: string // relay follow uses this
	action: string
	action_detail?: string // relay follow 操作详情
	target_price?: number
	stop_loss?: number
	stop_loss_price?: number // relay follow uses this
	current_price?: number
	change_pct?: number
	confidence?: number
	position_pct?: number
	reason?: string
	risk_warning?: string
	risk_level?: string
	holding_period?: string
	expected_return?: string
}

export interface DragonHeadFollowItem {
	id: number
	portfolio_id: number
	trading_date: string
	session_type: string
	stock_count: number
	market_overview: string
	strategy_summary: string
	risk_warning: string
	confidence_score: number
	generated_at: string
	recommendations: DragonHeadFollowStock[]
}

export interface DragonHeadFollowResponse {
	status: string
	data: {
		latest: DragonHeadFollowItem | null
		history: DragonHeadFollowItem[]
		total: number
	}
}

/**
 * 获取龙头战法跟投指导
 * @param limit - 返回记录数，默认10
 */
export function fetchDragonHeadFollow(limit: number = 10) {
	return request
		.get("strategy/dragon-head/follow", {
			searchParams: { limit },
			timeout: 30000,
		})
		.json<DragonHeadFollowResponse>();
}

/**
 * 手动触发龙头战法跟投指导生成
 */
export function triggerDragonHeadFollow() {
	return request
		.post("strategy/dragon-head/follow/trigger", {
			timeout: 300000,
		})
		.json<{ status: string, message: string }>();
}

/**
 * 获取连板接力推荐列表
 * @param limit - 返回推荐数量，默认10
 */
export function fetchRelayRecommendations(limit: number = 10) {
	return request
		.get("strategy/relay", {
			searchParams: { limit },
			timeout: 60000,
		})
		.json<RelayResponse>();
}

/**
 * 手动刷新连板接力推荐
 * @param limit - 返回推荐数量，默认10
 */
export function refreshRelayRecommendations(limit: number = 10) {
	return request
		.post("strategy/relay/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<RelayResponse>();
}

// ===================== 连板接力跟投指导 =====================

export function fetchRelayFollow(limit: number = 10) {
	return request
		.get("strategy/relay/follow", {
			searchParams: { limit },
			timeout: 30000,
		})
		.json<DragonHeadFollowResponse>();
}

export function triggerRelayFollow() {
	return request
		.post("strategy/relay/follow/trigger", {
			timeout: 300000,
		})
		.json<{ status: string, message: string }>();
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
 * 获取隔夜施工法推荐
 * @param limit - 返回推荐数量，默认13
 */
export function fetchOvernightRecommendations(limit: number = 13) {
	return request
		.get("strategy/overnight", {
			searchParams: { limit },
			timeout: 90000,
		})
		.json<OvernightResponse>();
}

export function refreshOvernightRecommendations(limit: number = 13) {
	return request
		.post("strategy/overnight/refresh", {
			searchParams: { limit },
			timeout: 180000,
		})
		.json<OvernightResponse>();
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

// ===================== 自选盯盘 =====================

export interface WatchlistAddPayload {
	stock_code: string
	stock_name: string
	buy_price: number
	buy_shares: number
	strategies: string[]
	strategy_names: string[]
	overlap_count?: number
	source_date?: string
	source_session?: string
	note?: string
}

export interface WatchlistItem {
	id: number
	stock_code: string
	stock_name: string
	buy_price: number
	buy_shares: number
	buy_amount: number
	strategies: string[]
	strategy_names: string[]
	overlap_count: number
	status: number
	current_price?: number
	change_pct?: number
	pnl_amount?: number
	pnl_pct?: number
	stop_loss_price?: number
	take_profit_price?: number
	stop_loss_pct?: number
	take_profit_pct?: number
	latest_guidance?: WatchlistGuidanceRecord
	created_at: string
}

export interface StrategyAnalysis {
	strategy: string
	strategy_name: string
	icon: string
	analysis: string
	action: string
	key_metrics: Record<string, any>
	risk_level: string
	trigger_prices?: { stop_loss?: number, take_profit?: number, add_position?: number }
}

export interface WatchlistGuidanceRecord {
	id: number
	watchlist_id: number
	stock_code: string
	stock_name: string
	current_price: number
	change_pct: number
	pnl_amount: number
	pnl_pct: number
	strategy_analyses: StrategyAnalysis[]
	overall_decision: string
	overall_summary: string
	trading_session: string
	guidance_time: string
}

/** 加入自选 */
export function addToWatchlist(payload: WatchlistAddPayload) {
	return request
		.post("strategy/combined/watchlist", {
			json: payload,
			timeout: 15000,
		})
		.json<{ status: string, data: { id: number }, message: string }>();
}

/** 获取自选列表 */
export function fetchWatchlist(status = 1) {
	return request
		.get("strategy/combined/watchlist", {
			searchParams: { status },
			timeout: 30000,
		})
		.json<{ status: string, data: { items: WatchlistItem[], total: number } }>();
}

/** 移除自选 */
export function removeFromWatchlist(id: number) {
	return request
		.delete(`strategy/combined/watchlist/${id}`, { timeout: 10000 })
		.json<{ status: string, message: string }>();
}

/** 标记清仓 */
export function closeWatchlistItem(id: number) {
	return request
		.put(`strategy/combined/watchlist/${id}/close`, { timeout: 10000 })
		.json<{ status: string, message: string }>();
}

/** 手动触发指导 */
export function triggerWatchlistGuidance(id: number) {
	return request
		.post(`strategy/combined/watchlist/${id}/guidance`, { timeout: 120000 })
		.json<{ status: string, data: WatchlistGuidanceRecord, message: string }>();
}

/** 获取指导历史 */
export function fetchWatchlistGuidance(id: number, limit = 20) {
	return request
		.get(`strategy/combined/watchlist/${id}/guidance`, {
			searchParams: { limit },
			timeout: 15000,
		})
		.json<{ status: string, data: { records: WatchlistGuidanceRecord[], total: number } }>();
}

/** 获取所有自选最新指导 */
export function fetchLatestGuidance() {
	return request
		.get("strategy/combined/watchlist/guidance/latest", { timeout: 15000 })
		.json<{ status: string, data: { records: WatchlistGuidanceRecord[], total: number } }>();
}

// ===================== 整体持仓分析 =====================

export interface PortfolioStockAnalysis {
	stock_code: string
	stock_name: string
	current_price: number
	buy_price: number
	/** 持有数量（股） */
	buy_shares: number
	pnl_pct: number
	/** 盈亏金额（元） */
	pnl_amount: number
	/** 市盈率 TTM（来自理杏仁） */
	pe_ttm?: number
	/** 市净率（来自理杏仁） */
	pb?: number
	/** 总市值（格式化后的字符串，如 "123.45亿"） */
	total_market_cap?: string
	sector: string
	main_business: string
	financial_analysis: {
		revenue_trend: string
		profit_trend: string
		debt_ratio_assessment?: string
		cash_flow_quality: string
	}
	growth_type: string
	growth_evidence: string
	moat: string
	moat_detail: string
	price_analysis: string
	operation_guidance: string
	/** 操作结论：买入/观望/卖出/继续持有 */
	action_verdict?: string
	/** 操作结论依据（基本面+技术面证据） */
	verdict_reason?: string
	risk_factors: string[]
	highlight: string
	prices_7d: Array<{
		date: string
		open?: number
		close?: number
		high?: number
		low?: number
		volume?: number
	}>
}

export interface PortfolioAnalysisData {
	stocks: PortfolioStockAnalysis[]
	total: number
	overall_summary: string
	generated_at?: string
}

/** 获取整体持仓分析 */
export function fetchPortfolioAnalysis(date?: string) {
	const searchParams: Record<string, any> = {};
	if (date)
		searchParams.date = date;
	return request
		.get("strategy/combined/watchlist/portfolio-analysis", {
			searchParams,
			timeout: 15000,
		})
		.json<{ status: string, data: PortfolioAnalysisData, generated_at?: string, sentiment_trigger?: { triggered_by_sentiment: boolean, trigger_reason: string, triggered_at: string, risk_level: string, advice: string } }>();
}

/** 触发生成整体持仓分析 */
export function triggerPortfolioAnalysis() {
	return request
		.post("strategy/combined/watchlist/portfolio-analysis", {
			timeout: 300000,
		})
		.json<{ status: string, data: PortfolioAnalysisData, message?: string }>();
}

// ===================== 当日精选 =====================

/**
 * 获取当日精选推荐（汇聚所有战法强烈推荐）
 * @param limit - 返回股票数量上限，默认10
 * @param withDeepAnalysis - 是否进行LLM深度分析，默认true
 */
export function fetchDailyPicks(limit: number = 10, withDeepAnalysis: boolean = true) {
	return request
		.get("strategy/daily-picks", {
			searchParams: { limit, with_deep_analysis: withDeepAnalysis },
			timeout: 300000, // 深度分析耗时较长
		})
		.json<DailyPicksResponse>();
}

/**
 * 强制刷新当日精选（重新聚合 + 重新深度分析）
 * @param limit - 返回股票数量上限，默认10
 */
export function refreshDailyPicks(limit: number = 10) {
	return request
		.post("strategy/daily-picks/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<DailyPicksResponse>();
}

/**
 * 查询当日精选历史列表（每个交易日最新一条）
 * @param days - 查询最近30天
 * @param page - 页码
 * @param pageSize - 每页条数
 */
export function fetchDailyPicksHistory(days: number = 30, page: number = 1, pageSize: number = 20) {
	return request
		.get("strategy/daily-picks/history", {
			searchParams: { days, page, page_size: pageSize },
			timeout: 15000,
		})
		.json<DailyPicksHistoryResponse>();
}

/**
 * 查询历史精选详情（含完整 deep_analysis）
 * @param recordId - 历史记录 ID
 */
export function fetchDailyPicksDetail(recordId: number) {
	return request
		.get(`strategy/daily-picks/history/${recordId}`, {
			timeout: 15000,
		})
		.json<DailyPicksDetailResponse>();
}

// ===================== 盘前情绪扫描 =====================

/** 手动触发盘前情绪扫描 */
export function triggerSentimentScan() {
	return request
		.post("strategy/combined/sentiment-scan", {
			timeout: 120000,
		})
		.json<{ status: string, data: any }>();
}

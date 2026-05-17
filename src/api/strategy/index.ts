import type { DailyPicksDetailResponse, DailyPicksHistoryResponse, DailyPicksResponse } from "./daily-picks-types";
import type {
	AuctionResponse,
	BreakthroughResponse,
	CombinedResponse,
	DragonEntrySignal,
	DragonHeadResponse,
	DragonMarketRegime,
	DragonThemeV2,
	EventDrivenResponse,
	MoatValueResponse,
	MovingAverageResponse,
	NorthboundResponse,
	OvernightResponse,
	RelayStock,
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
	position_advice?: string
	reason?: string
	risk_warning?: string
	risk_level?: string
	holding_period?: string
	entry_window?: string
	invalid_condition?: string
	signal_type?: string
	candidate_pool?: string
	related_themes?: string[]
	industry?: string
	expected_return?: string
}

export interface DragonHeadFollowRelayContext {
	market_regime?: DragonMarketRegime & {
		position_advice?: string
		operation_advice?: string
	}
	main_themes?: DragonThemeV2[]
	core_candidates?: RelayStock[]
	watch_candidates?: RelayStock[]
	avoid_candidates?: RelayStock[]
	entry_signals?: DragonEntrySignal[]
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
	relay_context?: DragonHeadFollowRelayContext
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

function mapEmotionRelayAction(stock: any): DragonHeadFollowStock["action"] {
	switch (stock?.candidate_pool) {
		case "core": return "买入";
		case "avoid": return "回避";
		case "watch": return "观望";
		default:
			switch (stock?.recommendation_level) {
				case "强烈推荐":
				case "推荐":
					return "买入";
				case "回避":
					return "回避";
				default:
					return "观望";
			}
	}
}

function mapEmotionRelayConfidence(stock: any): number {
	const score = Number(stock?.relay_score ?? stock?.signal_score ?? stock?.core_score ?? 0);
	if (Number.isFinite(score) && score > 0)
		return Math.max(0, Math.min(100, Math.round(score)));
	switch (stock?.candidate_pool) {
		case "core": return 80;
		case "watch": return 60;
		case "avoid": return 30;
		default: return 50;
	}
}

function mapEmotionRelayPosition(stock: any): number {
	if (stock?.candidate_pool === "core")
		return 50;
	if (stock?.candidate_pool === "watch")
		return 20;
	return 0;
}

function normalizeRelaySignal(code: string, stockName: string, payload: any): DragonEntrySignal | null {
	const signal = payload?.entry_signals?.find((item: any) => item?.code === code || item?.stock_code === code);
	if (!signal)
		return null;
	return {
		code,
		name: signal?.name || signal?.stock_name || stockName,
		candidate_pool: signal?.candidate_pool,
		signal_type: signal?.signal_type || signal?.entry_timing || "观察",
		signal_strength: Number(signal?.signal_strength ?? signal?.confidence ?? signal?.relay_score ?? 0) || 0,
		entry_window: signal?.entry_window || signal?.entry_timing || signal?.timing_window || "盘中确认",
		invalid_condition: signal?.invalid_condition || signal?.risk_warning || "信号失效后不再跟进",
		risk_level: signal?.risk_level || payload?.market_regime?.risk_level || "中",
		holding_horizon: signal?.holding_horizon || signal?.holding_period || "T+1~T+3",
		entry_plan: {
			buy_price_range: signal?.buy_price_range || signal?.buy_price,
			target_price: signal?.target_price,
			stop_loss_price: signal?.stop_loss_price,
			position_advice: signal?.position_advice,
		},
	};
}

function mapEmotionRelayThemes(payload: any): DragonThemeV2[] {
	const themes = Array.isArray(payload?.main_themes) ? payload.main_themes : [];
	return themes.map((theme: any) => ({
		name: theme?.name || "未命名题材",
		role: theme?.role || "观察",
		limit_up_count: Number(theme?.limit_up_count ?? theme?.stats?.limit_up_count ?? 0) || 0,
		leader_count: Number(theme?.leader_count ?? theme?.stats?.leader_count ?? 0) || 0,
		max_limit_up_days: Number(theme?.max_limit_up_days ?? theme?.stats?.max_limit_up_days ?? 0) || 0,
		concentration_score: Number(theme?.concentration_score ?? 0) || 0,
		catalyst_score: Number(theme?.catalyst_score ?? 0) || 0,
		sustainability_score: Number(theme?.sustainability_score ?? 0) || 0,
		change_pct: Number(theme?.change_pct ?? theme?.stats?.change_pct ?? 0) || 0,
		up_count: Number(theme?.up_count ?? theme?.stats?.up_count ?? 0) || 0,
		down_count: Number(theme?.down_count ?? theme?.stats?.down_count ?? 0) || 0,
		summary: theme?.summary || theme?.description || "暂无题材摘要",
		ladder: Array.isArray(theme?.ladder)
			? theme.ladder.map((item: any, index: number) => ({
				id: item?.id,
				theme_id: item?.theme_id,
				stock_code: item?.stock_code || item?.code || `ladder-${index}`,
				stock_name: item?.stock_name || item?.name || "-",
				ladder_role: item?.ladder_role || item?.role || "观察",
				ladder_rank: item?.ladder_rank,
				limit_up_days: Number(item?.limit_up_days ?? 0) || 0,
				price: item?.price,
				change_pct: item?.change_pct,
				first_limit_time: item?.first_limit_time,
				seal_amount: item?.seal_amount,
				turnover_rate: item?.turnover_rate,
				break_board_count: item?.break_board_count,
				theme_score: item?.theme_score,
			}))
			: [],
	}));
}

function buildEmotionRelayFollowItem(payload: any, limit: number): DragonHeadFollowItem {
	const merged = [
		...(payload?.core_candidates || []),
		...(payload?.watch_candidates || []),
		...(payload?.avoid_candidates || []),
		...(payload?.recommendations || []),
	];
	const seen = new Set<string>();
	const recommendations: DragonHeadFollowStock[] = [];

	for (const stock of merged) {
		const code = stock?.code || stock?.stock_code || "";
		if (!code || seen.has(code))
			continue;
		seen.add(code);
		const signal = normalizeRelaySignal(code, stock?.name || stock?.stock_name || "", payload);
		recommendations.push({
			code,
			name: stock?.name || stock?.stock_name || "",
			action: mapEmotionRelayAction(stock),
			target_price: stock?.target_price,
			stop_loss: stock?.stop_loss_price,
			current_price: stock?.price,
			change_pct: stock?.change_pct,
			confidence: mapEmotionRelayConfidence(stock),
			position_pct: mapEmotionRelayPosition(stock),
			position_advice: signal?.entry_plan?.position_advice,
			reason: Array.isArray(stock?.reasons) && stock.reasons.length > 0
				? stock.reasons[0]
				: stock?.buy_reason || stock?.operation_suggestion || stock?.theory_tag || stock?.recommendation_level || "情绪接力候选",
			risk_warning: stock?.risk_warning,
			risk_level: payload?.market_regime?.risk_level,
			holding_period: signal?.holding_horizon,
			entry_window: signal?.entry_window,
			invalid_condition: signal?.invalid_condition,
			signal_type: signal?.signal_type,
			candidate_pool: stock?.candidate_pool,
			related_themes: stock?.related_themes,
			industry: stock?.industry,
			action_detail: [
				signal?.signal_type ? `信号：${signal.signal_type}` : "",
				signal?.entry_window ? `窗口：${signal.entry_window}` : stock?.entry_timing ? `时机：${stock.entry_timing}` : "",
				signal?.holding_horizon ? `周期：${signal.holding_horizon}` : "",
			].filter(Boolean).join("｜") || undefined,
		});
		if (recommendations.length >= limit)
			break;
	}

	const phase = payload?.market_regime?.phase || "观察";
	const riskLevel = payload?.market_regime?.risk_level || "中";
	const overviewParts = [
		phase ? `情绪阶段：${phase}` : "",
		payload?.market_regime?.action_bias ? `策略倾向：${payload.market_regime.action_bias}` : "",
		payload?.market_regime?.description || "",
	].filter(Boolean);

	return {
		id: 0,
		portfolio_id: 0,
		trading_date: payload?.trading_date || "",
		session_type: "recommendation_pool",
		stock_count: recommendations.length,
		market_overview: overviewParts.join(" | "),
		strategy_summary: payload?.strategy_report || payload?.strategy_explanation || "情绪接力推荐池",
		risk_warning: `风险等级：${riskLevel}${payload?.market_regime?.operation_advice ? ` | ${payload.market_regime.operation_advice}` : ""}`,
		confidence_score: recommendations.length > 0
			? Math.round(recommendations.reduce((sum, stock) => sum + (stock.confidence || 0), 0) / recommendations.length)
			: 0,
		generated_at: payload?.generated_at || "",
		recommendations,
		relay_context: {
			market_regime: payload?.market_regime,
			main_themes: mapEmotionRelayThemes(payload),
			core_candidates: payload?.core_candidates || [],
			watch_candidates: payload?.watch_candidates || [],
			avoid_candidates: payload?.avoid_candidates || [],
			entry_signals: recommendations
				.map(stock => normalizeRelaySignal(stock.code || stock.stock_code || "", stock.name || stock.stock_name || "", payload))
				.filter(Boolean) as DragonEntrySignal[],
		},
	};
}

/**
 * 获取情绪接力推荐池（用于实盘跟投页展示）
 * @param limit - 返回记录数，默认10
 */
export function fetchEmotionRelayFollow(limit: number = 10) {
	return fetchEmotionRelayRecommendations(limit).then((res: any): DragonHeadFollowResponse => {
		const latest = res?.status === "success" && res?.data
			? buildEmotionRelayFollowItem(res.data, limit)
			: null;
		return {
			status: res?.status || "error",
			data: {
				latest,
				history: latest ? [latest] : [],
				total: latest ? 1 : 0,
			},
		};
	});
}

export function triggerEmotionRelayFollow() {
	return refreshEmotionRelayRecommendations(10).then((res: any) => ({ status: res.status, message: res.message || "情绪接力推荐池已刷新" }));
}

/**
 * 获取情绪接力推荐列表
 * @param limit - 返回推荐数量，默认15
 */
export function fetchEmotionRelayRecommendations(limit: number = 15) {
	return request
		.get("strategy/emotion-relay", {
			searchParams: { limit },
			timeout: 120000,
		})
		.json<any>();
}

/**
 * 手动刷新情绪接力推荐
 * @param limit - 返回推荐数量，默认15
 */
export function refreshEmotionRelayRecommendations(limit: number = 15) {
	return request
		.post("strategy/emotion-relay/refresh", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<any>();
}

/**
 * 获取情绪战法数据（已并入情绪接力）
 * @param _days - 返回历史天数，默认30
 */
export function fetchSentimentData(_days: number = 30) {
	return fetchEmotionRelayRecommendations(13);
}

/**
 * 手动刷新情绪战法推荐（已并入情绪接力）
 * @param limit - 返回推荐数量，默认13
 */
export function refreshSentimentRecommendations(limit: number = 13) {
	return refreshEmotionRelayRecommendations(limit);
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

// ===================== 精选跟进 =====================

export interface PicksFollowItem {
	id: number
	stock_code: string
	stock_name: string
	pick_date: string
	pick_price: number
	pick_reasons: string[]
	strategy_names: string[]
	pick_rank: number
	status: string
	closed_date?: string
	closed_reason?: string
	latest_price?: number
	latest_change_pct?: number
	latest_return_pct?: number
	latest_snapshot_date?: string
	created_at: string
}

export interface PicksFollowSnapshot {
	id: number
	follow_id: number
	snapshot_date: string
	close_price: number
	change_pct: number
	total_return_pct: number
	volume: number
}

/** 获取精选跟进列表 */
export function fetchPicksFollow(status: string = "tracking") {
	return request
		.get("strategy/daily-picks-follow", {
			searchParams: { status },
			timeout: 15000,
		})
		.json<{ status: string, data: { items: PicksFollowItem[], total: number } }>();
}

/** 从当日精选自动添加跟进 */
export function triggerAutoFollow(tradingDate?: string) {
	return request
		.post("strategy/daily-picks-follow/auto-add", {
			json: { trading_date: tradingDate },
			timeout: 30000,
		})
		.json<{ status: string, data: { added: number, message: string } }>();
}

/** 获取跟进股票详情+快照 */
export function fetchPicksFollowHistory(followId: number) {
	return request
		.get(`strategy/daily-picks-follow/${followId}/history`, {
			timeout: 15000,
		})
		.json<{ status: string, data: { follow: PicksFollowItem, snapshots: PicksFollowSnapshot[] } }>();
}

/** 结束跟进 */
export function closePicksFollow(followId: number, reason?: string) {
	return request
		.put(`strategy/daily-picks-follow/${followId}/close`, {
			json: { reason: reason || "" },
			timeout: 10000,
		})
		.json<{ status: string, message: string }>();
}

/** 手动触发快照更新 */
export function triggerPicksSnapshot() {
	return request
		.post("strategy/daily-picks-follow/snapshot", {
			timeout: 30000,
		})
		.json<{ status: string, message: string }>();
}

/** 获取周复盘报告 */
export function fetchWeeklyReview(weekStart?: string) {
	const searchParams: Record<string, string> = {};
	if (weekStart)
		searchParams.week_start = weekStart;
	return request
		.get("strategy/daily-picks-follow/weekly-review", {
			searchParams,
			timeout: 60000,
		})
		.json<{ status: string, data: { summary: any, review: string, generated_at: string } }>();
}

// ===================== 盘前扫描 =====================

/** 手动盘前扫描 */
export function triggerSentimentScan() {
	return request
		.post("strategy/combined/sentiment-scan", {
			timeout: 120000,
		})
		.json<{ status: string, data: any }>();
}

// ===================== 推荐追踪·算法自优化 =====================

export interface PerformanceTrackItem {
	id: number
	strategy_type: string
	trading_date: string
	session_type: string
	recommendation_level: string
	stock_code: string
	stock_name: string
	entry_price: number
	stop_loss_price: number
	target_price: number
	day1_return_pct: number | null
	day3_return_pct: number | null
	day5_return_pct: number | null
	mfe_pct: number | null
	mae_pct: number | null
	hit_take_profit: number | null
	hit_stop_loss: number | null
	algo_score: number | null
	eval_status: "pending" | "partial" | "complete"
	notes: string | null
	evaluated_at: string | null
	created_at: string
}

export interface PerformanceTrackResponse {
	status: string
	data: {
		items: PerformanceTrackItem[]
		total: number
		limit: number
		offset: number
	}
}

export interface StrategyPerformanceSummary {
	strategy_type: string
	strategy_label: string
	total_recs: number
	evaluated_count: number
	avg_day1_pct: number | null
	avg_day3_pct: number | null
	avg_day5_pct: number | null
	avg_mfe_pct: number | null
	avg_mae_pct: number | null
	day1_win_rate: number | null
	day3_win_rate: number | null
	take_profit_rate: number | null
	stop_loss_rate: number | null
	best_return_pct: number | null
	worst_return_pct: number | null
	level_distribution: { level: string, count: number, avg_day3_pct: number | null }[]
}

export interface PerformanceSummaryResponse {
	status: string
	data: {
		summaries: StrategyPerformanceSummary[]
		days: number
		since: string
		generated_at: string
	}
}

/** 查询推荐追踪列表 */
export function fetchPerformanceTracker(params: {
	strategy_type?: string
	recommendation_level?: string
	eval_status?: string
	days?: number
	limit?: number
	offset?: number
} = {}) {
	return request
		.get("strategy/performance-tracker", {
			searchParams: params as any,
			timeout: 20000,
		})
		.json<PerformanceTrackResponse>();
}

/** 获取算法效果汇总统计 */
export function fetchPerformanceSummary(days = 30) {
	return request
		.get("strategy/performance-tracker/summary", {
			searchParams: { days },
			timeout: 20000,
		})
		.json<PerformanceSummaryResponse>();
}

/** 手动触发推荐评估 */
export function triggerPerformanceEvaluation(lookback_days = 5) {
	return request
		.post("strategy/performance-tracker/trigger", {
			searchParams: { lookback_days },
			timeout: 30000,
		})
		.json<{ status: string, message: string }>();
}

/** 获取算法优化洞察报告 */
export function fetchOptimizationInsights(days = 30) {
	return request
		.get("strategy/performance-tracker/insights", {
			searchParams: { days },
			timeout: 60000,
		})
		.json<{ status: string, data: { insights: string, data_summary: string, days: number, generated_at: string } }>();
}

// ===================== 战法推荐跟进 =====================

export type StrategyFollowType = "dragon_head" | "emotion_relay" | "relay" | "northbound" | "overnight" | "sentiment" | "event_driven" | "breakthrough" | "volume_price" | "moving_average" | "trend_momentum" | "auction";

export interface StrategyFollowItem {
	id: number
	strategy_type: StrategyFollowType
	stock_code: string
	stock_name: string
	pick_date: string
	pick_price: number
	recommendation_level: string
	reasons: string[]
	pick_rank: number
	status: string
	closed_date?: string
	closed_reason?: string
	next_day_return_pct?: number
	latest_price?: number
	latest_change_pct?: number
	latest_return_pct?: number
	latest_snapshot_date?: string
	created_at: string
}

export interface StrategyFollowSnapshot {
	id: number
	follow_id: number
	snapshot_date: string
	close_price: number
	change_pct: number
	total_return_pct: number
	volume: number
}

/** \u83b7\u53d6\u6218\u6cd5\u8ddf\u8fdb\u5217\u8868 */
export function fetchStrategyFollow(strategyType: StrategyFollowType, status: string = "tracking") {
	return request
		.get("strategy/follow", {
			searchParams: { strategy_type: strategyType, status },
			timeout: 15000,
		})
		.json<{ status: string, data: { items: StrategyFollowItem[], total: number } }>();
}

/** \u4ece\u6700\u65b0\u63a8\u8350\u81ea\u52a8\u6dfb\u52a0\u8ddf\u8fdb */
export function triggerStrategyAutoFollow(strategyType: StrategyFollowType, tradingDate?: string) {
	return request
		.post("strategy/follow/auto-add", {
			json: { strategy_type: strategyType, trading_date: tradingDate },
			timeout: 30000,
		})
		.json<{ status: string, data: { added: number, message: string } }>();
}

/** \u83b7\u53d6\u8ddf\u8fdb\u80a1\u7968\u8be6\u60c5+\u5feb\u7167 */
export function fetchStrategyFollowHistory(followId: number) {
	return request
		.get(`strategy/follow/${followId}/history`, {
			timeout: 15000,
		})
		.json<{ status: string, data: { follow: StrategyFollowItem, snapshots: StrategyFollowSnapshot[] } }>();
}

/** \u7ed3\u675f\u8ddf\u8fdb */
export function closeStrategyFollow(followId: number, reason?: string) {
	return request
		.put(`strategy/follow/${followId}/close`, {
			json: { reason: reason || "" },
			timeout: 10000,
		})
		.json<{ status: string, message: string }>();
}

export interface DragonHeadLevelPerformanceSummary {
	recommendation_level: string
	count: number
	avg_day1_pct: number | null
	avg_day3_pct: number | null
	avg_day5_pct: number | null
	day1_win_rate: number | null
	day3_win_rate: number | null
	take_profit_rate: number | null
	stop_loss_rate: number | null
}

export interface DragonHeadPerformanceSummaryResponse {
	status: string
	data: {
		days: number
		since: string
		strong_recommend_summary: DragonHeadLevelPerformanceSummary
		recommend_summary: DragonHeadLevelPerformanceSummary
		comparison: {
			strong_minus_recommend_day3: number | null
			strong_minus_recommend_day3_win_rate: number | null
			optimization_hint: string
		}
		generated_at: string
	}
}

/** \u83b7\u53d6\u9f99\u5934\u6218\u6cd5\u63a8\u8350\u7b49\u7ea7\u6548\u679c\u6458\u8981 */
export function fetchDragonHeadPerformanceSummary(days = 30) {
	return request
		.get("strategy/performance-tracker/dragon-head-summary", {
			searchParams: { days },
			timeout: 20000,
		})
		.json<DragonHeadPerformanceSummaryResponse>();
}

/** \u624b\u52a8\u89e6\u53d1\u5feb\u7167\u66f4\u65b0 */
export function triggerStrategyFollowSnapshot(strategyType?: StrategyFollowType) {
	return request
		.post("strategy/follow/snapshot", {
			searchParams: strategyType ? { strategy_type: strategyType } : {},
			timeout: 30000,
		})
		.json<{ status: string, message: string }>();
}

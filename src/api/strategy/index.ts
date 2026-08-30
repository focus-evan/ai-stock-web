import type {
	BreakthroughResponse,
	CombinedResponse,
	DragonEntrySignal,
	DragonHeadResponse,
	DragonMarketRegime,
	DragonThemeV2,
	EventDrivenResponse,
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
		action_verdict: signal?.action_verdict,
		action: signal?.action,
		can_chase_limit_up: signal?.can_chase_limit_up,
		auction_scenario: signal?.auction_scenario,
		entry_style: signal?.entry_style,
		reason_short: signal?.reason_short,
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
				signal?.action_verdict ? `执行：${signal.action_verdict}` : `动作：${mapEmotionRelayAction(stock)}`,
				signal?.entry_style ? `方式：${signal.entry_style}` : "",
				signal?.entry_window ? `窗口：${signal.entry_window}` : stock?.entry_timing ? `时机：${stock.entry_timing}` : "",
				signal?.auction_scenario ? `场景：${signal.auction_scenario}` : "",
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
			timeout: 360000, // 6分钟：覆盖后端5分钟LLM超时及数据准备开销
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
/**
 * 手动刷新护城河价值推荐（绕过缓存）
 * @param limit - 返回推荐数量，默认13
 */
// ===================== 推荐历史 =====================

export interface RecommendationHistoryItem {
	id: number
	strategy_type: string
	trading_date: string
	session_type: string
	stock_count: number
	generated_at: string
	recommendations?: any[]
	metadata?: {
		candidates?: any[]
		checkpoint?: string
		session_policy?: Record<string, any>
		[key: string]: any
	}
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

// ===================== 短线四法 Skill 战法 =====================

export type SkillTacticsStrategyType =
  | "yangjia_emotion_cycle"
  | "kobe92_cycle_speculation"
  | "a_share_leader_tactics"
  | "beijing_chaogu_first_board";

export interface SkillTacticsCandidate {
	rank: number
	code: string
	name: string
	main_business?: string
	business_track?: string
	company_basic_info?: string
	company_profile_source?: string
	role?: string
	theme?: string
	score: number
	decision?: string
	native_action?: string
	buy_method?: string
	price_trigger?: string
	follow_action?: string
	observation_focus?: string
	buy_signal?: string
	buy_price?: string
	buy_price_value?: number
	trigger_checklist?: string[]
	execution_plan?: {
		follow_action?: string
		observation_focus?: string
		buy_signal?: string
		buy_price?: string
		buy_price_value?: number
		trigger_checklist?: string[]
		risk_stop?: string
	}
	position?: string
	invalid_condition?: string
	session_type?: string
	signal_state?: "buy_now" | "wait_trigger" | "no_buy" | "premarket_plan" | "review_only" | "seal_validation" | string
	action_summary?: string
	next_action_time?: string
	session_downgraded?: boolean
	session_policy?: {
		mode?: string
		label?: string
		can_open_new_position?: boolean
		max_direct_buys?: number
		reason?: string
	}
	risk_profile?: {
		stop_loss_pct?: number
		take_profit_pct?: number
		min_rr?: number
	}
	reason?: string
	recommendation_level?: string
	current_price?: number
	change_pct?: number
}

export interface SkillTacticsYieldSummary {
	tracked_count: number
	positive_count: number
	negative_count: number
	avg_score: number
	direct_buy_count: number
	recommended_buy_count?: number
	watch_count: number
	empty_seat_count: number
}

export interface SkillTacticsReport {
	strategy_type: SkillTacticsStrategyType
	framework: string
	strict_logic_version?: string
	current_logic_version?: string
	cache_status?: "hit" | "stale_logic_version" | "missing_cache" | string
	strategy_name: string
	short_name: string
	skill: string
	checkpoint: string
	timestamp: string
	trading_date?: string
	generated_at?: string
	requested_session_type?: string
	session_type?: string
	session_policy?: {
		mode?: string
		label?: string
		can_open_new_position?: boolean
		max_direct_buys?: number
		reason?: string
	}
	market_phase?: string
	mode?: string
	risk_gate?: string
	mainlines?: string[]
	top_verdict?: string
	direct_buy_count: number
	next_checkpoint?: string
	candidates: SkillTacticsCandidate[]
	recommendations?: any[]
	candidate_recommendations?: any[]
	candidate_total?: number
	prior_follow_up?: any[]
	yield_summary?: SkillTacticsYieldSummary
	yield_tracking?: any[]
	source?: {
		base_strategy?: string
		base_generated_at?: string
		note?: string
		cache_warning?: string
	}
	strategy_report?: string[]
	total?: number
}

export interface SkillTacticsDashboardResponse {
	status: string
	generated_at: string
	frameworks: SkillTacticsReport[]
	total: number
}

export interface SkillTacticsFrameworkResponse {
	status: string
	data: SkillTacticsReport
	message?: string
}

export function fetchSkillTacticsDashboard(limit: number = 5) {
	return request
		.get("strategy/skill-tactics", {
			searchParams: { limit },
			timeout: 30000,
		})
		.json<SkillTacticsDashboardResponse>();
}

export function fetchSkillTacticsFramework(strategyType: SkillTacticsStrategyType, limit: number = 5) {
	return request
		.get(`strategy/skill-tactics/${strategyType}`, {
			searchParams: { limit },
			timeout: 30000,
		})
		.json<SkillTacticsFrameworkResponse>();
}

export function refreshSkillTacticsFramework(strategyType: SkillTacticsStrategyType, limit: number = 5) {
	return request
		.post(`strategy/skill-tactics/${strategyType}/refresh`, {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<SkillTacticsFrameworkResponse>();
}

export function refreshAllSkillTactics(limit: number = 5) {
	return request
		.post("strategy/skill-tactics/refresh-all", {
			searchParams: { limit },
			timeout: 300000,
		})
		.json<SkillTacticsDashboardResponse & { message?: string }>();
}

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
	market?: "a" | "hk"
	currency?: "CNY" | "HKD"
	quote_source?: string
	quote_as_of?: string
	quote_stale?: boolean
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

// ===================== 不追加资金滚动降本 =====================

export interface UnwindTechnicalSnapshot {
	as_of: string
	current_price: number
	ma3: number
	ma16: number
	ma16_slope_pct: number
	deviation16_pct: number
	support_10d: number
	resistance_10d: number
	rsi14: number
	atr14: number
	volume_ratio_5d: number
	trend: "UP" | "DOWN" | "RANGE"
	trend_label: string
	bars: Array<{
		date: string
		open: number
		close: number
		high: number
		low: number
		volume: number
	}>
}

export interface UnwindExecutionStep {
	step: number
	action: string
	price?: number | null
	shares: number
	condition: string
	reason: string
}

export interface UnwindAnalysis {
	strategy_version?: string
	method: string
	capital_rule: string
	market?: "a" | "hk"
	market_label?: string
	currency?: "CNY" | "HKD"
	currency_symbol?: string
	lot_size?: number
	position_mode?: "ODD_ONLY" | "ONE_LOT_FULL_ROTATION" | "TWO_LOT_HALF_ROTATION" | "SMALL_ONE_LOT_ROTATION" | "STANDARD_CORE_ROTATION"
	position_mode_label?: string
	core_floor_shares?: number
	max_open_shares?: number
	requires_manual_confirmation?: boolean
	position_risk?: "medium" | "high" | "very_high"
	is_special_treatment?: boolean
	pnl_pct: number
	sell_shares: number
	buyback_shares: number
	min_spread_pct: number
	estimated_round_trip_cost_pct?: number
	sell_trigger_price?: number | null
	sell_zone_low?: number | null
	sell_zone_high?: number | null
	buyback_price?: number | null
	cancel_sell_above?: number | null
	pause_buy_below?: number | null
	expected_spread_per_share?: number
	expected_gross_reduction?: number
	estimated_fees?: number
	expected_net_reduction?: number
	projected_effective_cost?: number
	decision: string
	decision_label: string
	risk_level: string
	reason: string
	sell_reason?: string
	buyback_reason?: string
	invalid_condition: string
	no_trade_condition?: string
	next_check: string
	execution_steps?: UnwindExecutionStep[]
	deep_analysis: {
		trend: string
		location: string
		momentum: string
		volume: string
		position: string
		cost_filter?: string
	}
	technical: UnwindTechnicalSnapshot
	generated_at: string
}

export interface UnwindAnalysisRecord {
	id: number
	account_id: number
	trading_date: string
	current_price: number
	pnl_pct: number
	decision: string
	risk_level: string
	analysis_data: UnwindAnalysis
	generated_at: string
}

export interface UnwindTrade {
	id: number
	account_id: number
	side: "sell" | "buy"
	shares: number
	price: number
	fees: number
	gross_amount: number
	cash_change: number
	cost_reduction: number
	trade_date: string
	note?: string
	created_at: string
}

export interface UnwindPlan {
	id: number
	watchlist_id: number
	stock_code: string
	stock_name: string
	baseline_cost_price: number
	baseline_shares: number
	current_shares: number
	cash_pool: number
	open_sold_shares: number
	open_sell_amount: number
	cumulative_cost_reduction: number
	effective_cost: number
	status: string
	latest_analysis?: UnwindAnalysis | null
	analysis_history: UnwindAnalysisRecord[]
	trades: UnwindTrade[]
}

export interface UnwindMethod {
	name: string
	capital_rule: string
	position_rule: string
	trend_rule: string
	cost_rule?: string
	portfolio_rule?: string
	risk_notice: string
	schedule: string
	evidence?: Array<{ title: string, url: string }>
}

export function fetchUnwindPlans(historyLimit = 10) {
	return request
		.get("strategy/combined/watchlist/unwind-plans", {
			searchParams: { history_limit: historyLimit },
			timeout: 30000,
		})
		.json<{ status: string, data: { items: UnwindPlan[], total: number, method: UnwindMethod } }>();
}

export function refreshUnwindPlans(watchlistId?: number) {
	const searchParams: Record<string, number> = {};
	if (watchlistId)
		searchParams.watchlist_id = watchlistId;
	return request
		.post("strategy/combined/watchlist/unwind-plans/refresh", {
			searchParams,
			timeout: 180000,
		})
		.json<{ status: "success" | "partial", data: { generated: Array<{ watchlist_id: number, analysis: UnwindAnalysis }>, errors: Array<{ watchlist_id?: number, stock_code?: string, message: string }>, total: number }, message: string }>();
}

export interface RecordUnwindTradePayload {
	side: "sell" | "buy"
	shares: number
	price: number
	fees: number
	trade_date: string
	note?: string
}

export function recordUnwindTrade(watchlistId: number, payload: RecordUnwindTradePayload) {
	return request
		.post(`strategy/combined/watchlist/unwind-plans/${watchlistId}/trades`, {
			json: payload,
			timeout: 180000,
		})
		.json<{ status: string, data: { trade_id: number, account: UnwindPlan }, message: string }>();
}

export type StrategyFollowType = "dragon_head" | "emotion_relay" | "northbound" | "overnight" | "event_driven" | "breakthrough" | "volume_price" | "moving_average" | "trend_momentum" | "combined" | SkillTacticsStrategyType;

export interface StrategyFollowItem {
	id: number
	strategy_type: StrategyFollowType
	stock_code: string
	stock_name: string
	pick_date: string
	pick_price: number
	recommendation_level: string
	follow_type: "trade" | "watch"
	reasons: string[]
	pick_rank: number
	session_type?: string
	feature_snapshot?: {
		decision?: string
		native_action?: string
		follow_action?: string
		buy_method?: string
		price_trigger?: string
		buy_price_value?: number
		execution_plan?: {
			follow_action?: string
			observation_focus?: string
			buy_signal?: string
			buy_price?: string
			buy_price_value?: number
			trigger_checklist?: string[]
			risk_stop?: string
		}
		trigger_checklist?: string[]
		[key: string]: unknown
	}
	status: string
	closed_date?: string
	closed_reason?: string
	next_day_return_pct?: number
	latest_price?: number
	latest_change_pct?: number
	latest_return_pct?: number
	latest_snapshot_date?: string
	recommended_at: string
	created_at: string
}

export interface StrategyFollowSummary {
	total_count: number
	trade_count: number
	watch_count: number
	priced_count: number
	missing_snapshot_count: number
	profitable_count: number
	win_rate_pct?: number | null
	overall_return_pct?: number | null
	latest_snapshot_date?: string | null
	trade_performance: StrategyFollowPerformance
	watch_performance: StrategyFollowPerformance
	aggregation_method: "equal_weight_latest_return"
}

export interface StrategyFollowPerformance {
	total_count: number
	priced_count: number
	missing_snapshot_count: number
	profitable_count: number
	win_rate_pct?: number | null
	overall_return_pct?: number | null
	latest_snapshot_date?: string | null
}

export interface StrategyPerformanceMetric {
	sample_count: number
	win_count: number
	loss_count: number
	flat_count?: number
	win_rate_pct?: number | null
	avg_return_pct?: number | null
	median_return_pct?: number | null
	max_return_pct?: number | null
	min_return_pct?: number | null
	avg_mfe_pct?: number | null
	avg_mae_pct?: number | null
	avg_win_pct?: number | null
	avg_loss_pct?: number | null
	profit_loss_ratio?: number | null
	profit_factor?: number | null
	return_volatility_pct?: number | null
	max_drawdown_pct?: number | null
	stability_score?: number | null
	recent_sample_count: number
	recent_win_rate_pct?: number | null
	recent_avg_return_pct?: number | null
	recent_return_change_pct?: number | null
	trend_status: "improving" | "stable" | "weakening" | "insufficient"
}

export type StrategyEvolutionWeeklyStatus = "no_data" | "pending_analysis" | "analyzed" | "evolved" | "rollback";
export type StrategyEvolutionContinuity = "not_started" | "insufficient_history" | "continuous" | "interrupted";

export interface StrategyPerformanceWeekly {
	week_start: string
	week_end: string
	sample_count: number
	win_rate_pct?: number | null
	avg_return_pct?: number | null
	analysis_run_count: number
	analysis_new_sample_count: number
	applied_count: number
	rollback_count: number
	observed_count: number
	version_start?: number | null
	version_end?: number | null
	evolution_status: StrategyEvolutionWeeklyStatus
}

export interface StrategyPerformanceDashboardItem {
	strategy_type: StrategyFollowType
	strategy_name: string
	settlement_rule: {
		mode: string
		horizon_days: number
		label: string
	}
	trade: StrategyPerformanceMetric
	watch: StrategyPerformanceMetric
	confidence_level: "high" | "medium" | "low"
	ranking_eligible: boolean
	quality_score: number
	rank?: number | null
	current_version: number
	evolution_enabled: boolean
	last_decision: string
	last_reason: string
	last_analyzed_at?: string | null
	last_evolved_at?: string | null
	changed_param_count: number
	changed_params: string[]
	analysis_run_count: number
	parameter_update_count: number
	continuity_status: StrategyEvolutionContinuity
	weekly: StrategyPerformanceWeekly[]
}

export interface StrategyPerformanceDashboard {
	status: string
	generated_at: string
	performance_start_date: string
	week_count: number
	week_starts: string[]
	total_trade_samples: number
	ranking_min_samples: number
	eligible_strategy_count: number
	excellent_strategy_count: number
	analyzed_strategy_count: number
	evolved_strategy_count: number
	best_strategy_type?: StrategyFollowType | null
	excellent_strategy_types: StrategyFollowType[]
	analysis_report: {
		headline: string
		summary: string
		key_findings: string[]
		cautions: string[]
	}
	strategies: StrategyPerformanceDashboardItem[]
	methodology: {
		ranking: string
		win: string
		watch_samples_excluded: boolean
		weekly_basis: string
		evolution_basis: string
		drawdown_basis: string
		recent_basis: string
	}
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
export function fetchStrategyFollow(
	strategyType: StrategyFollowType,
	status: string = "tracking",
	followType?: "trade" | "watch",
) {
	const searchParams: Record<string, string> = {
		strategy_type: strategyType,
		status,
	};
	if (followType)
		searchParams.follow_type = followType;
	return request
		.get("strategy/follow", {
			searchParams,
			timeout: 15000,
		})
		.json<{ status: string, data: { items: StrategyFollowItem[], total: number, summary: StrategyFollowSummary } }>();
}

/** 获取全部战法累计收益、排名和周度自进化状态 */
export function fetchStrategyPerformanceDashboard(weeks: number = 12) {
	return request
		.get("strategy/follow/performance/dashboard", {
			searchParams: { weeks },
			timeout: 60000,
		})
		.json<{ status: string, data: StrategyPerformanceDashboard, message?: string }>();
}

/** \u4ece\u6700\u65b0\u63a8\u8350\u81ea\u52a8\u6dfb\u52a0\u8ddf\u8fdb */
export function triggerStrategyAutoFollow(strategyType: StrategyFollowType, tradingDate?: string) {
	return request
		.post("strategy/follow/auto-add", {
			json: { strategy_type: strategyType, trading_date: tradingDate },
			timeout: 120000,
		})
		.json<{ status: string, data: { added: number, added_trade: number, added_watch: number, selected: number, selected_trade: number, selected_watch: number, selected_codes: string[], snapshot_updated: number, message: string } }>();
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

/** \u624b\u52a8\u89e6\u53d1\u5feb\u7167\u66f4\u65b0 */
export function triggerStrategyFollowSnapshot(strategyType?: StrategyFollowType) {
	return request
		.post("strategy/follow/snapshot", {
			searchParams: strategyType ? { strategy_type: strategyType } : {},
			timeout: 120000,
		})
		.json<{ status: string, data?: { updated: number }, message: string }>();
}

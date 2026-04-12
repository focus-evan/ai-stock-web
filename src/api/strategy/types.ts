/**
 * 龙头战法 API Types
 */

/** 个股推荐信息 */
export interface StockRecommendation {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	float_market_cap: number
	total_market_cap: number
	turnover_rate: number
	limit_up_days: number
	first_limit_time: string
	seal_amount: number
	in_main_theme: boolean
	related_themes: string[]
	reasons: string[]
	recommendation_level: "强烈推荐" | "推荐" | "关注" | "回避"
	/** GPT-5.2 生成的风险提示 */
	risk_warning?: string
	/** GPT-5.2 生成的操作建议 */
	operation_suggestion?: string
}

/** 主线题材信息 */
export interface ThemeInfo {
	name: string
	details: {
		name?: string
		change_pct?: number
		up_count?: number
		down_count?: number
		limit_up_count?: number
	}
}

/** GPT-5.2 题材深度分析 */
export interface ThemeAnalysis {
	name: string
	/** 逻辑硬度：强/中/弱 */
	logic_hardness: "强" | "中" | "弱"
	/** 驱动力说明 */
	catalyst: string
	/** 持续性判断 */
	sustainability: string
}

/** GPT-5.2 市场情绪判断 */
export interface MarketSentiment {
	/** 情绪周期阶段 */
	phase: "启动" | "发酵" | "高潮" | "退潮"
	/** 情绪描述 */
	description: string
	/** 风险等级 */
	risk_level: "低" | "中" | "高"
}

/** 新闻情绪共振信息 */
export interface NewsResonance {
	news_keywords: { keyword: string, count: number }[]
	matching_themes: string[]
	resonance_score: number
	news_count: number
}

/** 龙头战法数据 */
export interface DragonHeadData {
	recommendations: StockRecommendation[]
	total: number
	main_themes: ThemeInfo[]
	news_resonance: NewsResonance
	strategy_explanation: string
	generated_at: string
	trading_date: string
	/** 是否经过 GPT-5.2 增强 */
	llm_enhanced?: boolean
	/** GPT-5.2 市场情绪判断 */
	market_sentiment?: MarketSentiment
	/** GPT-5.2 题材深度分析 */
	theme_analysis?: ThemeAnalysis[]
}

/** 龙头战法接口响应 */
export interface DragonHeadResponse {
	status: "success" | "error"
	data: DragonHeadData
	message?: string
}

// ===================== 情绪战法 Types =====================

/** 每日情绪快照 */
export interface SentimentSnapshot {
	trading_date: string
	limit_up_count: number
	limit_down_count: number
	pre_limit_up_count: number
	continuous_limit_up_count: number
	/** 涨停溢价率(%) */
	limit_up_premium: number
	/** 涨跌停比(0-1) */
	up_down_ratio: number
	/** 连板晋级率(0-1) */
	promotion_rate: number
	/** 溢价率Z分数 */
	z_premium: number
	/** 涨跌停比Z分数 */
	z_ratio: number
	/** 晋级率Z分数 */
	z_promotion: number
	/** 综合情绪指数 */
	composite_sentiment: number
	/** 情绪历史分位数(0-1) */
	sentiment_percentile: number
	/** 冰点转折信号 */
	is_ice_point: boolean
	/** 高潮退潮信号 */
	is_climax_retreat: boolean
	/** 信号文字描述 */
	signal_text: string
}

/** GPT-5.2 情绪深度分析 */
export interface SentimentLLMAnalysis {
	/** 情绪阶段：冰点/修复/升温/高潮/退潮 */
	emotion_phase: "冰点" | "修复" | "升温" | "高潮" | "退潮"
	/** 阶段描述 */
	phase_description: string
	/** 市场分析报告 */
	market_analysis: string
	/** 建议仓位 */
	position_advice: string
	/** 操作建议 */
	operation_advice: string
	/** 风险点 */
	risk_points: string[]
	/** 机会点 */
	opportunity_points: string[]
	/** 次日展望 */
	next_day_outlook: string
}

/** 推荐个股明细 */
export interface StockPickDetail {
	rank: number
	stock_code: string
	stock_name: string
	industry: string
	price: number
	change_pct: number
	amount: number
	turnover_rate: number
	total_market_cap: number
	float_market_cap: number
	limit_up_days: number
	pick_reason_tag: string
	recommendation_level: string
	llm_reason?: string | null
	llm_risk_warning?: string | null
	llm_operation?: string | null
}

/** 每日推荐股票 */
export interface StockPicksData {
	pick_strategy: string
	emotion_phase?: string | null
	stocks: StockPickDetail[]
	pick_count: number
	llm_enhanced: boolean
}

/** 情绪战法数据 */
export interface SentimentData {
	today: SentimentSnapshot
	history: SentimentSnapshot[]
	signal: string
	/** GPT-5.2 深度分析 */
	llm_analysis?: SentimentLLMAnalysis | null
	/** 是否经过 LLM 增强 */
	llm_enhanced?: boolean
	/** 每日推荐20只股票 */
	stock_picks?: StockPicksData | null
	generated_at: string
	trading_date: string
}

/** 情绪战法接口响应 */
export interface SentimentResponse {
	status: "success" | "error"
	data: SentimentData
	message?: string
}

// ===================== 事件驱动战法 Types =====================

/** 事件信息 */
export interface EventInfo {
	news_index: number
	title: string
	keywords: string[]
	impact_level: number
	impact_duration: string
	logic_chain: string
	sectors: string[]
	freshness: string
	summary: string
}

/** 事件驱动个股推荐 */
export interface EventStockRecommendation {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	total_market_cap: number
	turnover_rate: number
	event_score: number
	score_detail: {
		logic: number
		history: number
		capital: number
		scarcity: number
	}
	max_impact_level: number
	event_reason: string
	related_concepts: string[]
	concept_count: number
	reasons: string[]
	recommendation_level: "强烈推荐" | "推荐" | "关注" | "回避"
	risk_warning?: string
	operation_suggestion?: string
	logic_strength?: number
}

/** 事件概览 */
export interface EventsOverview {
	total_analyzed: number
	high_impact_count: number
	high_impact_events: EventInfo[]
	overall_assessment: string
}

/** 市场事件评估 */
export interface MarketAssessment {
	event_type: string
	heat_level: string
	risk_level: string
	description: string
}

/** 高质量新闻条目 */
export interface NewsDigestItem {
	title: string
	content?: string
	source: string
	category: string
	quality_score: number
}

/** 事件关联新闻 */
export interface EventRelatedNews {
	title: string
	source: string
	matched_keywords: string[]
}

/** 新闻摘要 */
export interface NewsDigest {
	total_captured: number
	by_source: Record<string, number>
	by_category: Record<string, number>
	high_quality_news: NewsDigestItem[]
	board_signals: string[]
	hot_stocks: string[]
	event_related_news: EventRelatedNews[]
}

/** 事件驱动完整数据 */
export interface EventDrivenData {
	recommendations: EventStockRecommendation[]
	total: number
	events: EventsOverview
	market_assessment?: MarketAssessment
	news_digest?: NewsDigest
	strategy_report: string
	llm_enhanced?: boolean
	generated_at: string
	trading_date: string
	/** Top 5 重要事件（按影响等级排序，供前端优先展示） */
	top_events?: EventInfo[]
}

/** 事件驱动接口响应 */
export interface EventDrivenResponse {
	status: "success" | "error"
	data: EventDrivenData
	message?: string
}

// ===================== 突破战法 =====================

/** 突破战法推荐股票 */
export interface BreakthroughStock {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	volume: number
	float_market_cap: number
	total_market_cap: number
	turnover_rate: number
	breakthrough_type: string
	breakthrough_price: number
	breakthrough_pct: number
	volume_ratio: number
	is_volume_confirmed: boolean
	high_20d: number
	high_60d: number
	ma5: number
	ma20: number
	above_ma: boolean
	breakthrough_score: number
	reasons: string[]
	recommendation_level: string
	risk_warning?: string
	operation_suggestion?: string
}

/** 突破战法完整数据 */
export interface BreakthroughData {
	recommendations: BreakthroughStock[]
	total: number
	breakthrough_summary: Record<string, number>
	strategy_report: string
	llm_enhanced: boolean
	generated_at: string
	trading_date: string
	market_assessment?: string
}

/** 突破战法接口响应 */
export interface BreakthroughResponse {
	status: "success" | "error"
	data: BreakthroughData
	message?: string
}

// ===================== 量价关系 =====================

/** 量价关系推荐股票 */
export interface VolumePriceStock {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	volume: number
	float_market_cap: number
	total_market_cap: number
	turnover_rate: number
	signal_type: string
	signal_score: number
	vol_ratio_5: number
	vol_ratio_20: number
	price_trend_5d: number
	vol_trend_5d: number
	avg_vol_5: number
	avg_vol_20: number
	reasons: string[]
	recommendation_level: string
	risk_warning?: string
	operation_suggestion?: string
}

/** 量价关系完整数据 */
export interface VolumePriceData {
	recommendations: VolumePriceStock[]
	total: number
	signal_summary: Record<string, number>
	strategy_report: string
	llm_enhanced: boolean
	generated_at: string
	trading_date: string
}

/** 量价关系接口响应 */
export interface VolumePriceResponse {
	status: "success" | "error"
	data: VolumePriceData
	message?: string
}

// ===================== 竞价/尾盘战法 =====================

/** 竞价/尾盘推荐股票 */
export interface AuctionStock {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	volume: number
	float_market_cap: number
	total_market_cap: number
	turnover_rate: number
	signal_type: string
	signal_score: number
	open_pct: number
	strength: number
	near_high_pct?: number
	reasons: string[]
	recommendation_level: string
	risk_warning?: string
	operation_suggestion?: string
}

/** 竞价/尾盘完整数据 */
export interface AuctionData {
	recommendations: AuctionStock[]
	total: number
	strategy_mode: string
	signal_summary: Record<string, number>
	strategy_report: string
	llm_enhanced: boolean
	generated_at: string
	trading_date: string
}

/** 竞价/尾盘接口响应 */
export interface AuctionResponse {
	status: "success" | "error"
	data: AuctionData
	message?: string
}

// ===================== 均线战法 =====================

// ===================== 隔夜施工法 =====================

/** 隔夜施工法推荐股票 */
export interface OvernightStock {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	volume: number
	float_market_cap: number
	total_market_cap: number
	turnover_rate: number
	volume_ratio: number
	signal_type: string
	signal_score: number
	ma5: number
	ma10: number
	ma20: number
	ma60: number
	ma_bullish: boolean
	has_limit_up: boolean
	vol_staircase_score: number
	reasons: string[]
	recommendation_level: string
	risk_warning?: string
	operation_suggestion?: string
}

/** 隔夜施工法完整数据 */
export interface OvernightData {
	recommendations: OvernightStock[]
	total: number
	signal_summary: Record<string, number>
	strategy_report: string
	llm_enhanced: boolean
	generated_at: string
	trading_date: string
}

/** 隔夜施工法接口响应 */
export interface OvernightResponse {
	status: "success" | "error"
	data: OvernightData
	message?: string
}

/** 均线战法推荐股票 */
export interface MovingAverageStock {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	volume: number
	float_market_cap: number
	total_market_cap: number
	turnover_rate: number
	signal_type: string
	signal_score: number
	ma5: number
	ma10: number
	ma20: number
	ma60: number
	is_bull_aligned: boolean
	price_vs_ma20: number
	vol_ratio: number
	reasons: string[]
	recommendation_level: string
	risk_warning?: string
	operation_suggestion?: string
}

/** 均线战法完整数据 */
export interface MovingAverageData {
	recommendations: MovingAverageStock[]
	total: number
	signal_summary: Record<string, number>
	strategy_report: string
	llm_enhanced: boolean
	generated_at: string
	trading_date: string
}

/** 均线战法接口响应 */
export interface MovingAverageResponse {
	status: "success" | "error"
	data: MovingAverageData
	message?: string
}

// ===================== 个股综合分析 =====================

/** 单个战法信号 */
export interface StrategySignal {
	strategy: string
	signal: "看多" | "看空" | "中性" | "无数据"
	detail: string
}

/** 价格点位 */
export interface PricePoint {
	price_low: number
	price_high: number
	description: string
}

/** 止损信息 */
export interface StopLossInfo {
	price: number
	description: string
}

/** 个股综合分析结果 */
export interface StockAnalysisData {
	stock_code: string
	stock_name: string
	market_date: string
	action: "买入" | "持有" | "卖出" | "观望"
	confidence: number
	score: number
	strategy_analysis: StrategySignal[]
	kline_analysis?: { trend?: string, pattern?: string, detail?: string }
	industry_analysis?: { industry?: string, sector?: string, industry_outlook?: string, position?: string }
	fundamental_analysis?: { moat?: string, competitive_advantage?: string, detail?: string }
	financial_summary?: { revenue_trend?: string, profit_trend?: string, growth?: string, detail?: string }
	risk_factors?: string[]
	positive_factors?: string[]
	short_term_outlook?: { direction?: string, target_price?: number, detail?: string }
	long_term_outlook?: { direction?: string, target_price?: number, detail?: string }
	buy_point: PricePoint
	sell_point: PricePoint
	stop_loss: StopLossInfo
	position_advice: string
	risk_level: "低" | "中" | "高"
	summary: string
	strategies_hit: number
	strategies_total: number
	llm_enhanced: boolean
	analyzed_at: string
	/** 实时行情数据 */
	current_price?: number
	change_pct?: number
	pe_ttm?: number
	pb?: number
	total_market_cap?: string
	industry?: string
	market_data?: any
	/** 模糊匹配时的候选股票 */
	fuzzy_match?: boolean
	candidates?: { stock_code: string, stock_name: string }[]
}

/** 个股分析接口响应 */
export interface StockAnalysisResponse {
	status: "success" | "error"
	data: StockAnalysisData
	message?: string
}

/** 轻量级策略命中查询 */
export interface StrategiesSummaryData {
	stock_code: string
	stock_name: string
	strategies_hit: number
	strategies_total: number
	quick_action: string
	strategy_details: {
		strategy: string
		in_recommendation: boolean
		rank?: number
		score?: number
		recommendation_level?: string
		signal_type?: string
	}[]
}

/** 策略命中查询响应 */
export interface StrategiesSummaryResponse {
	status: "success" | "error"
	data: StrategiesSummaryData
	message?: string
}

// ===================== 综合战法 =====================

/** 综合战法 - 单个战法对某只股票的推荐详情 */
export interface CombinedStrategyDetail {
	rank?: number
	score?: number
	reason?: string
	price?: number
	change_pct?: number
}

/** 综合战法推荐股票 */
export interface CombinedStock {
	rank: number
	code: string
	name: string
	overlap_count: number
	strategies: string[]
	strategy_names: string[]
	strategy_names_text: string
	strategy_details: Record<string, CombinedStrategyDetail>
	combined_score: number
	max_score: number
	avg_score: number
	/** 当前参考价 */
	current_price?: number
	/** 今日涨跌幅 */
	change_pct?: number
	/** 次日建议买入价 */
	suggested_buy_price?: number
	/** 目标卖出价 */
	suggested_sell_price?: number
	/** 止损价 */
	stop_loss_price?: number
	/** 买入理由（LLM 生成） */
	buy_reason?: string
	/** 卖出理由（LLM 生成） */
	sell_reason?: string
	/** 次日操作建议（LLM 生成） */
	operation_advice?: string
	/** 风险等级：低/中/高 */
	risk_level?: string
	/** 信心分数 1-100 */
	confidence?: number
}

/** 综合战法完整数据 */
export interface CombinedData {
	recommendations: CombinedStock[]
	total: number
	intersection_threshold?: number
	strategy_contribution?: Record<string, number>
	source_strategies?: Record<string, number>
	strategy_report?: string
	llm_enhanced: boolean
	generated_at: string
	trading_date?: string
	session_type?: string
}

/** 综合战法接口响应 */
export interface CombinedResponse {
	status: "success" | "error"
	data: CombinedData
	message?: string
}

// ===================== 北向资金 =====================

/** 北向资金推荐股票 */
export interface NorthboundStock {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	total_market_cap: number
	float_market_cap: number
	turnover_rate: number
	in_northbound: boolean
	hold_value: number
	hold_ratio: number
	increase: number
	main_net_inflow: number
	super_large_net: number
	large_net: number
	is_contrarian: boolean
	consecutive_days: number
	is_accelerating: boolean
	ratio_change_5d: number
	ratio_change_10d: number
	hold_ratio_5d: number
	hold_ratio_10d: number
	northbound_score: number
	score_detail: {
		hold: number
		increase: number
		consecutive: number
		trend: number
		capital: number
		market: number
		contrarian: number
	}
	reasons: string[]
	recommendation_level: string
	risk_warning?: string
	operation_suggestion?: string
}

/** 北向资金完整数据 */
export interface NorthboundData {
	recommendations: NorthboundStock[]
	total: number
	signal_summary: Record<string, number>
	strategy_report: string
	llm_enhanced: boolean
	generated_at: string
	trading_date: string
	session_type?: string
}

/** 北向资金接口响应 */
export interface NorthboundResponse {
	status: "success" | "error"
	data: NorthboundData
	message?: string
}

// ===================== 趋势动量 =====================

/** 趋势动量推荐股票 */
export interface TrendMomentumStock {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	volume: number
	float_market_cap: number
	total_market_cap: number
	turnover_rate: number
	signal_type: string
	momentum_5d: number
	momentum_20d: number
	momentum_60d: number
	momentum_deceleration: boolean
	momentum_exhaustion: boolean
	rsi_divergence: boolean
	macd_bar_divergence: boolean
	exhaustion_warnings: string[]
	macd_golden: boolean
	macd_bullish: boolean
	macd_histogram: number
	adx: number | null
	is_20d_high: boolean
	is_60d_high: boolean
	ma5: number
	ma10: number
	ma20: number
	ma60: number
	is_bull_aligned: boolean
	rsi_14: number | null
	momentum_score: number
	score_detail: {
		momentum: number
		macd: number
		adx: number
		new_high: number
		ma_form: number
		tech: number
		exhaustion_penalty: number
	}
	reasons: string[]
	recommendation_level: string
	risk_warning?: string
	operation_suggestion?: string
}

/** 趋势动量完整数据 */
export interface TrendMomentumData {
	recommendations: TrendMomentumStock[]
	total: number
	signal_summary: Record<string, number>
	strategy_report: string
	llm_enhanced: boolean
	generated_at: string
	trading_date: string
	session_type?: string
}

/** 趋势动量接口响应 */
export interface TrendMomentumResponse {
	status: "success" | "error"
	data: TrendMomentumData
	message?: string
}

// ===================== 护城河价值 =====================

/** 市场周期信息 */
export interface MoatValueCycleInfo {
	index_name: string
	index_pe: number
	index_pb: number
	pe_percentile: number
	pb_percentile: number
	cycle_phase: string
	dca_signal: string
	dca_multiplier: number
}

/** 护城河价值推荐股票 */
export interface MoatValueStock {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	total_market_cap: number
	pe_ttm: number
	pb: number
	ps_ttm: number
	dv_ttm: number
	pe_percentile: number
	pb_percentile: number
	pe_pb_product: number
	valuation_status: string
	moat_score: number
	score_detail: {
		moat: number
		valuation: number
		cashflow: number
		cycle: number
		dca: number
	}
	reasons: string[]
	recommendation_level: string
	risk_warning?: string
	operation_suggestion?: string
}

/** 护城河价值完整数据 */
export interface MoatValueData {
	recommendations: MoatValueStock[]
	total: number
	cycle_info: MoatValueCycleInfo
	signal_summary: Record<string, number>
	strategy_report: string
	llm_enhanced: boolean
	generated_at: string
	trading_date: string
	session_type?: string
}

/** 护城河价值接口响应 */
export interface MoatValueResponse {
	status: "success" | "error"
	data: MoatValueData
	message?: string
}

// ===================== 连板接力战法 =====================

/** 连板接力推荐股票 */
export interface RelayStock {
	rank: number
	code: string
	name: string
	price: number
	change_pct: number
	amount: number
	float_market_cap: number
	turnover_rate: number
	limit_up_days: number
	first_limit_time: string
	seal_amount: number
	industry: string
	relay_score: number
	score_detail: {
		seal_time: number
		seal_strength: number
		sector_heat: number
		board_height: number
		turnover: number
		market_cap: number
	}
	board_label: string
	relay_type: string
	recommendation_level: string
	reasons: string[]

	// LLM 增强字段
	relay_probability?: string
	relay_probability_pct?: number
	entry_timing?: string
	buy_price?: number
	stop_loss_price?: number
	target_price?: number
	position_pct?: string
	confidence?: number
	buy_reason?: string
	risk_warning?: string
	next_day_outlook?: string
}

/** 连板接力完整数据 */
export interface RelayData {
	recommendations: RelayStock[]
	total: number
	strategy_explanation: string
	market_emotion?: string
	total_limit_up?: number
	board_distribution?: Record<string, number>
	llm_enhanced: boolean
	generated_at: string
	trading_date: string
	session_type?: string
}

/** 连板接力接口响应 */
export interface RelayResponse {
	status: "success" | "error"
	data: RelayData
	message?: string
}

/**
 * 当日精选 API 类型定义
 */

/** 单只股票的深度分析 */
export interface StockDeepAnalysis {
	code: string
	name: string
	/** 所属细分赛道 */
	sector: string
	/** 赛道增速描述 */
	sector_growth: string
	/** 竞争格局 */
	competitive_landscape: string
	/** 公司在行业中的地位 */
	company_position: string
	/** 护城河描述 */
	moat: string
	/** 主营业务结构 */
	main_business: string
	/** 近三季度营收趋势 */
	revenue_trend: string
	/** 近三季度净利润趋势 */
	profit_trend: string
	/** 成长性判断 */
	growth_potential: string
	/** 成长性标签 */
	growth_label: "高成长" | "稳定" | "低增长" | "转型期" | "待分析"
	/** 近期涨跌幅原因 */
	recent_move_reason: string
	/** 核心风险 */
	key_risks: string[]
	/** 近期催化剂 */
	catalysts: string[]
	/** 综合深度评价 */
	deep_summary: string
	/** 操作结论：买入/观望/卖出 */
	action_verdict?: string
	/** 操作结论依据（基本面+技术面证据） */
	verdict_reason?: string
	/** 是否 LLM 增强 */
	llm_enhanced: boolean
}

/** 精选股票信息 */
export interface DailyPickStock {
	/** 精选排名 */
	pick_rank: number
	code: string
	name: string
	/** 来源战法（第一个命中的） */
	from_strategy: string
	strategy_display: string
	/** 所有强烈推荐的战法列表 */
	strong_recommend_from: string[]
	/** 命中战法数量 */
	strategy_count: number
	strategy_names: string[]
	strategy_names_text: string
	strategy_details: Record<string, {
		recommendation_level?: string
		reason?: string
		score?: number
		price?: number
	}>
	current_price: number
	change_pct: number
	combined_score: number
	overlap_count: number
	confidence: number
	recommendation_level: string
	rank: number
	is_combined: boolean
	buy_reason?: string
	operation_advice?: string
	suggested_buy_price?: number
	suggested_sell_price?: number
	stop_loss_price?: number
	risk_warning?: string
	operation_suggestion?: string
	/** 市盈率 TTM（来自理杏仁） */
	pe_ttm?: number
	/** 市净率（来自理杏仁） */
	pb?: number
	/** 总市值（格式化后的字符串，如 "123.45亿"） */
	total_market_cap?: string
	/** 深度分析结果（LLM 生成） */
	deep_analysis?: StockDeepAnalysis
}

/** 本周推荐核心逻辑 */
export interface WeeklyLogic {
	/** 本周推荐逻辑（150字） */
	weekly_logic: string
	/** 市场主线主题 */
	market_theme: string
	/** 核心机会 */
	key_opportunities: string[]
	/** 风险提示 */
	risk_warning: string
	/** 整体操作建议 */
	operation_advice: string
}

/** 当日精选数据 */
export interface DailyPicksData {
	picks: DailyPickStock[]
	total: number
	weekly_logic: WeeklyLogic
	generated_at: string
	strategy_count: number
	strategy_summaries?: Record<string, string>
}

/** 当日精选接口响应 */
export interface DailyPicksResponse {
	status: "success" | "error"
	data: DailyPicksData | null
	message?: string
}

/** 历史精选列表项（摘要，不含 deep_analysis） */
export interface DailyPicksHistoryItem {
	id: number
	trading_date: string
	batch_no: string
	pick_count: number
	strategy_count: number
	trigger_type: "manual" | "scheduled"
	generated_at: string
	stocks_summary: { code: string, name: string }[]
	weekly_theme: string
}

export interface DailyPicksHistoryData {
	list: DailyPicksHistoryItem[]
	total: number
	page: number
	page_size: number
}

export interface DailyPicksHistoryResponse {
	status: "success" | "error"
	data: DailyPicksHistoryData | null
	message?: string
}

export interface DailyPicksDetailData {
	id: number
	trading_date: string
	batch_no: string
	pick_count: number
	strategy_count: number
	trigger_type: "manual" | "scheduled"
	generated_at: string
	picks: DailyPickStock[]
	weekly_logic: WeeklyLogic
	strategy_summaries: Record<string, string>
}

export interface DailyPicksDetailResponse {
	status: "success" | "error"
	data: DailyPicksDetailData | null
	message?: string
}

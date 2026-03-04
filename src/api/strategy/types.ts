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

/** 情绪战法数据 */
export interface SentimentData {
	today: SentimentSnapshot
	history: SentimentSnapshot[]
	signal: string
	/** GPT-5.2 深度分析 */
	llm_analysis?: SentimentLLMAnalysis | null
	/** 是否经过 LLM 增强 */
	llm_enhanced?: boolean
	generated_at: string
	trading_date: string
}

/** 情绪战法接口响应 */
export interface SentimentResponse {
	status: "success" | "error"
	data: SentimentData
	message?: string
}

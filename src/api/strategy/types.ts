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
	recommendation_level: "强烈推荐" | "推荐" | "关注"
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
}

/** 龙头战法接口响应 */
export interface DragonHeadResponse {
	status: "success" | "error"
	data: DragonHeadData
	message?: string
}

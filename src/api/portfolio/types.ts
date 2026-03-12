/**
 * 模拟交易系统 API Types
 */

/** 组合配置 */
export interface PortfolioConfig {
	id: number
	strategy_type: "dragon_head" | "sentiment" | "event_driven"
	name: string
	initial_capital: number
	available_cash: number
	total_asset: number
	total_profit: number
	total_profit_pct: number
	auto_trade: number
	status: "active" | "paused" | "closed"
	created_at?: string
	updated_at?: string
}

/** 持仓条目 */
export interface PortfolioPosition {
	id?: number
	portfolio_id?: number
	stock_code: string
	stock_name: string
	quantity: number
	avg_cost: number
	current_price: number
	market_value: number
	profit: number
	profit_pct: number
	weight: number
	status?: string
	buy_date?: string
}

/** 交易记录 */
export interface PortfolioTrade {
	id?: number
	portfolio_id?: number
	stock_code: string
	stock_name: string
	direction: "buy" | "sell"
	price: number
	quantity: number
	amount: number
	profit?: number | null
	profit_pct?: number | null
	reason?: string | null
	trade_date: string
	created_at?: string
}

/** 每日汇总 */
export interface DailySummary {
	trading_date: string
	total_asset: number
	available_cash: number
	market_value: number
	daily_profit: number
	daily_profit_pct: number
	total_profit: number
	total_profit_pct: number
	position_count: number
	trade_count: number
}

/** 组合详情响应 */
export interface PortfolioDetailResponse {
	status: string
	data: {
		portfolio: PortfolioConfig
		positions: PortfolioPosition[]
		recent_trades: PortfolioTrade[]
	}
}

/** 组合列表响应 */
export interface PortfolioListResponse {
	status: string
	data: {
		portfolios: PortfolioConfig[]
		total: number
	}
}

/** 收益曲线响应 */
export interface PerformanceResponse {
	status: string
	data: {
		performance: DailySummary[]
		total: number
	}
}

/** 交易记录响应 */
export interface TradesResponse {
	status: string
	data: {
		trades: PortfolioTrade[]
		total: number
	}
}

/** 创建组合请求 */
export interface CreatePortfolioRequest {
	strategy_type: "dragon_head" | "sentiment" | "event_driven"
	name: string
	initial_capital: number
}

/** 通用响应 */
export interface PortfolioResponse {
	status: string
	message?: string
	portfolio?: PortfolioConfig
	positions?: PortfolioPosition[]
	allocation_summary?: string
	portfolio_id?: number
	trade_count?: number
	total_asset?: number
	total_profit_pct?: number
	daily_profit_pct?: number
	decision_summary?: string
}

/** 复盘记录 */
export interface ReviewItem {
	id?: number
	portfolio_id: number
	strategy_type: "dragon_head" | "sentiment" | "event_driven"
	trading_date: string
	trade_count: number
	buy_count: number
	sell_count: number
	daily_profit: number
	daily_profit_pct: number
	overall_score: number
	overall_comment: string
	highlights: string[]
	shortcomings: string[]
	lessons: string[]
	suggestions: string[]
	position_analysis?: Array<{
		stock_code: string
		stock_name: string
		analysis: string
		action_suggestion: string
	}> | null
	risk_assessment?: string | null
	generated_at?: string
}

/** 复盘列表响应 */
export interface ReviewListResponse {
	status: string
	data: {
		reviews: ReviewItem[]
		total: number
	}
}

/** 复盘详情响应 */
export interface ReviewDetailResponse {
	status: string
	data?: ReviewItem
	message?: string
}

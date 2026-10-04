export type Metric = number | null | undefined;

export interface DashboardPosition {
	id?: number
	portfolio_id?: number
	portfolio_name?: string
	strategy_type: string
	stock_code: string
	stock_name?: string
	quantity?: number
	avg_cost?: Metric
	current_price?: Metric
	profit?: Metric
	unrealized_pnl?: Metric
	profit_pct?: Metric
	quote_source?: string
	quote_refreshed?: boolean
}

export interface DashboardStrategy {
	portfolio_id: number
	strategy_type: string
	name?: string
	total_asset?: Metric
	available_cash?: Metric
	total_profit?: Metric
	total_profit_pct?: Metric
	daily_profit?: Metric
	daily_profit_available?: boolean
	positions_count?: number
	auto_trade?: number | boolean
	decision_status?: string
	decision_reason?: string
	last_run_at?: string
	last_run_date?: string
	last_actual_trade_at?: string
	last_actual_trade_date?: string
	last_trade_count?: number
}

export interface DashboardTrade {
	id?: number
	portfolio_id?: number
	strategy_type: string
	stock_code: string
	stock_name?: string
	direction?: string
	action?: string
	quantity?: number
	price?: Metric
	trade_date?: string
	created_at?: string
}

export interface RecommendationStock {
	stock_code?: string
	code?: string
	stock_name?: string
	name?: string
	score?: Metric
	reason?: string
}

export interface DashboardRecommendation {
	stocks?: RecommendationStock[]
	generated_at?: string | null
	trading_date?: string | null
	is_current_trading_date?: boolean
	is_empty_result?: boolean
	availability?: "available" | "missing" | "unavailable"
	source_status?: { status?: string, reason?: string }
}

export interface DashboardPerformance {
	trading_date?: string
	date?: string
	total_profit_pct?: Metric
	profit_pct?: Metric
}

export interface DashboardData {
	generated_at?: string
	overview: {
		total_asset?: Metric
		total_initial?: Metric
		total_profit?: Metric
		total_profit_pct?: Metric
		available_cash?: Metric
		market_value?: Metric
		portfolios_count?: number
		positions_count?: number
	}
	strategy_summary: DashboardStrategy[]
	positions: DashboardPosition[]
	recent_trades: DashboardTrade[]
	performance?: Record<string, DashboardPerformance[]>
	performance_series?: { portfolio_id: number, strategy_type: string, name: string, data: DashboardPerformance[] }[]
	recommendations: Record<string, DashboardRecommendation | RecommendationStock[]>
	data_quality?: { quote_requested: number, quote_received: number, stored_price_positions: number, recommendation_failures: string[] }
}

export interface DashboardResponse {
	status: string
	message?: string
	data?: DashboardData
	result?: { status?: string, data?: DashboardData }
}

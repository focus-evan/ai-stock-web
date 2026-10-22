import type { UnwindAnalysis, UnwindPlan, UnwindTrade } from "#src/api/strategy";
import { request } from "#src/utils/request";

// 解套策略层（诊断分流、三维基本面、补仓分档、复盘线、回测、实时提醒）的类型与接口。
// 放在独立文件里，避免和 strategy/index.ts 中其他未提交的改动混在一起。

export type UnwindTradeSide = "sell" | "buy" | "add" | "reduce";

export interface UnwindSettings {
	add_thesis?: string
	add_max_price?: number
	risk_group?: string
	risk_event_note?: string
	risk_event_at?: string | null
	logic_broken: boolean
	review_line_pct: number
	max_wait_days: number
	add_budget: number
	wait_start_date: string | null
}

export interface UnwindFundamentalLayer {
	key: "industry" | "company" | "valuation"
	label: string
	status: "有利" | "中性" | "承压" | "数据不足"
	conclusion: string
}

export interface UnwindFundamentals {
	verdict: "HEALTHY" | "CAUTION" | "DETERIORATED" | "UNKNOWN" | "REVIEW_REQUIRED"
	verdict_label: string
	layers: UnwindFundamentalLayer[]
	analyzed_at?: string | null
	age_days?: number | null
	stale: boolean
	reasons: string[]
}

export interface UnwindDiagnosis {
	class: "A" | "B" | "C" | "D" | "E"
	label: string
	why: string
}

export interface UnwindAddPlan {
	status: string
	status_label: string
	tier: number
	max_tiers: number
	trigger_price: number | null
	shares: number
	amount: number
	price: number
	budget: number
	remaining: number
	projected_cost?: number
	breakeven_rise_pct?: number | null
	current_breakeven_rise_pct?: number | null
}

export interface UnwindReducePlan {
	ratio: number
	shares: number
	price: number
	trailing_stop: number
}

export interface UnwindReview {
	triggered: boolean
	pending?: boolean
	completed?: boolean
	reasons: string[]
	pnl_vs_baseline_pct: number
	review_line_pct: number
	wait_days: number
	max_wait_days: number
}

export interface UnwindGate {
	allowed: boolean
	status: string
	reason: string
}

export interface UnwindBacktestCycle {
	sell_date: string
	buy_date: string
	sell_price: number
	buy_price: number
	shares: number
	fees: number
	net: number
	days: number
	forced: boolean
	unfinished: boolean
}

export interface UnwindBacktestSummary {
	policy_version?: string
	test_start?: string
	scope?: string
	final_equity?: number
	incremental_equity?: number
	max_drawdown_pct?: number
	open_sold_shares?: number
	comparisons?: { name: string, available?: boolean, final_equity?: number, max_drawdown_pct?: number, reason?: string }[]
	bars: number
	cycles: number
	wins: number
	win_rate: number
	forced_count: number
	forced_ratio: number
	avg_net: number
	total_net: number
	total_net_per_baseline_share: number
	worst_net: number
	best_net: number
	avg_days: number
	recent_cycles: UnwindBacktestCycle[]
	assumptions: string[]
}

export interface UnwindBacktestResult {
	watchlist_id: number
	stock_code: string
	stock_name?: string
	summary: UnwindBacktestSummary | null
	gate: UnwindGate
}

export type UnwindAnalysisExt = UnwindAnalysis & Partial<{
	recovery: UnwindRecovery
	capital_capacity: { allowed_amount: number, reason: string }
	trailing_protection: { active: boolean, peak: number, price: number }
	diagnosis: UnwindDiagnosis
	fundamentals: UnwindFundamentals
	add_plan: UnwindAddPlan
	reduce_plan: UnwindReducePlan
	review: UnwindReview
	rotation_gate: UnwindGate | null
	backtest: UnwindBacktestSummary | null
	limit_pct: number
	limit_up_price: number
	limit_down_price: number
	at_limit_up: boolean
	at_limit_down: boolean
	open_days: number
	open_since: string | null
	buyback_max_days: number
}>;

export type UnwindTradeExt = Omit<UnwindTrade, "side"> & { side: UnwindTradeSide };

export type UnwindPlanExt = Omit<UnwindPlan, "latest_analysis" | "trades"> & {
	recovery?: UnwindRecovery
	latest_analysis?: UnwindAnalysisExt | null
	trades: UnwindTradeExt[]
	settings?: UnwindSettings
	add_summary?: {
		add_count: number
		add_spent: number
		add_budget: number
		add_remaining: number
		last_add_price: number
	}
	open_days?: number
	open_since?: string | null
};

export interface UnwindRecovery {
	available: boolean
	reason?: string
	initial_cost?: number
	additional_capital?: number
	total_pnl?: number
	total_pnl_pct?: number
	total_recovered?: boolean
	remaining_breakeven_price?: number | null
	scope?: string
}

export interface UnwindPortfolioRisk {
	net_assets: number
	available_cash: number
	cash_floor: number
	total_add_budget: number
	max_single_weight_pct: number
	max_group_weight_pct: number
	stress_drop_pct: number
	max_stress_loss_pct: number
	confirmed_at?: string | null
	add_spent?: number
}

export function fetchUnwindPortfolioRisk() {
	return request.get("strategy/combined/watchlist/unwind-portfolio-risk").json<{ status: string, data: UnwindPortfolioRisk }>();
}

export function saveUnwindPortfolioRisk(payload: UnwindPortfolioRisk) {
	return request.put("strategy/combined/watchlist/unwind-portfolio-risk", { json: payload }).json<{ status: string, data: UnwindPortfolioRisk }>();
}

export type UnwindAlertLevel = "BUY_NOW" | "ADD_READY" | "REDUCE_NOW" | "DECISION_LINE" | "TIMEOUT" | "BREAKDOWN" | "NEAR";

export interface UnwindAlert {
	key: string
	level: UnwindAlertLevel
	watchlist_id: number
	stock_code: string
	stock_name: string
	price: number
	target_price?: number | null
	shares: number
	currency_symbol: string
	decision: string
	decision_label?: string
	message: string
	as_of: string
}

export interface RecordUnwindTradePayloadExt {
	side: UnwindTradeSide
	shares: number
	price: number
	fees: number
	trade_date: string
	note?: string
}

export function fetchUnwindAlerts(signal?: AbortSignal) {
	return request
		.get("strategy/combined/watchlist/unwind-plans/alerts", { timeout: 20000, signal })
		.json<{ status: string, data: { items: UnwindAlert[], total: number, checked_at: string } }>();
}

export function saveUnwindSettings(watchlistId: number, payload: Partial<UnwindSettings>) {
	return request
		.put(`strategy/combined/watchlist/unwind-plans/${watchlistId}/settings`, {
			json: payload,
			timeout: 180000,
		})
		.json<{ status: string, data: { settings: UnwindSettings }, message: string }>();
}

export function fetchUnwindBacktest(watchlistId: number) {
	return request
		.get(`strategy/combined/watchlist/unwind-plans/${watchlistId}/backtest`, { timeout: 60000 })
		.json<{ status: string, data: UnwindBacktestResult }>();
}

export function recordUnwindTradeExt(watchlistId: number, payload: RecordUnwindTradePayloadExt) {
	return request
		.post(`strategy/combined/watchlist/unwind-plans/${watchlistId}/trades`, {
			json: payload,
			timeout: 180000,
		})
		.json<{ status: string, data: { trade_id: number, account: UnwindPlanExt }, message: string }>();
}

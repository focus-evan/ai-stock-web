import { request } from "#src/utils/request";

export interface OptimizationMetrics {
	sample_count: number
	win_count: number
	loss_count: number
	flat_count: number
	win_rate_pct: number | null
	avg_return_pct: number | null
	total_profit: number | null
	profit_factor: number | null
	win_rate_ci95_pct: [number, number] | null
}

export interface OptimizationBatch {
	id: number
	release_key: string
	name: string
	description: string
	effective_at: string
	strategies: string[]
	backend_revision: string
	frontend_revision: string
	created_at: string
	rule_snapshot: { cost_pct: number }
}

export interface OptimizationSide {
	window: { start: string | null, end: string | null, session_count: number }
	trades: {
		closed_cycles: number
		excluded_cycles: number
		transition_cycles: number
		open_cycles: number
		recorded: OptimizationMetrics
		normalized: OptimizationMetrics
		verified: OptimizationMetrics
	}
	signals: {
		total_count: number
		mature_count: number
		forward_count: number
		excluded_reasons: Record<string, number>
		metrics: OptimizationMetrics
	}
}

export interface OptimizationCycle {
	cohort?: "before" | "after"
	portfolio_id: number
	stock_code: string
	stock_name: string
	entry_at: string
	exit_at: string | null
	status: "closed" | "open"
	buy_count: number
	sell_count: number
	gross_profit: number
	normalized_profit: number | null
	net_profit: number | null
	return_pct: number | null
	verified: boolean
	issues: string[]
}

export interface OptimizationAccountWindow {
	return_pct: number | null
	max_drawdown_pct: number | null
	snapshot_count: number
	status: string
}

export interface OptimizationAccountPeriod {
	portfolio_id: number
	name: string
	status: string
	before: OptimizationAccountWindow
	after: OptimizationAccountWindow
}

export interface OptimizationComparisonRow {
	strategy_type: string
	strategy_name: string
	before: OptimizationSide
	after: OptimizationSide
	deltas: {
		recorded_win_rate_pp: number | null
		normalized_win_rate_pp: number | null
		normalized_avg_return_pp: number | null
		verified_win_rate_pp: number | null
		signal_win_rate_pp: number | null
		signal_avg_return_pp: number | null
	}
	comparison_status: "collecting" | "descriptive"
	notices: string[]
	account_periods: OptimizationAccountPeriod[]
	trade_details: { before: OptimizationCycle[], after: OptimizationCycle[], transition: OptimizationCycle[] }
}

export interface OptimizationComparison {
	batch: OptimizationBatch
	as_of: string
	window_days: number
	methodology: string[]
	rows: OptimizationComparisonRow[]
}

export interface CreateOptimizationBatch {
	release_key: string
	name: string
	description?: string
	effective_at?: string
	strategies?: string[]
	backend_revision?: string
	frontend_revision?: string
}

interface OptimizationResponse<T> {
	status: string
	message?: string
	data: T
}

export function fetchOptimizationBatches(signal?: AbortSignal) {
	return request.get("portfolio/optimization-batches", { signal, timeout: 60000 })
		.json<OptimizationResponse<{ batches: OptimizationBatch[], schema_ready: boolean, strategy_options: { value: string, label: string }[] }>>();
}

export function createOptimizationBatch(payload: CreateOptimizationBatch) {
	return request.post("portfolio/optimization-batches", { json: payload, retry: 0 })
		.json<OptimizationResponse<{ batch: OptimizationBatch, created: boolean }>>();
}

export function fetchOptimizationComparison(batchId: number, windowDays: number, strategyType?: string, signal?: AbortSignal) {
	const searchParams: Record<string, string> = { window_days: String(windowDays) };
	if (strategyType)
		searchParams.strategy_type = strategyType;
	return request.get(`portfolio/optimization-batches/${batchId}/comparison`, { searchParams, signal, timeout: 60000 })
		.json<OptimizationResponse<OptimizationComparison>>();
}

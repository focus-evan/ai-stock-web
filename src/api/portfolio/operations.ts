import { request } from "#src/utils/request";

export interface StrategyOperationAccount {
	portfolio_id: number
	name: string
	strategy_type: string
	account_status: string
	new_account_in_period: boolean
	operation: { status: string, label: string, last_scan_at: string | null, last_task_at: string | null, executable_candidate_count: number, candidate_count: number, blocking_reasons: { reason: string, count: number }[], last_rejections: { stock_code: string, reason: string }[] }
	book: { pnl: number | null, return_pct: number | null, baseline_date: string | null, through_date: string | null, stale: boolean }
	ledger: { trade_count: number, forward_source_count: number, accounting_repair_count: number, reconstruction_count: number, verified_execution_count: number }
	model: { closed_cycle_count: number, excluded_closed_cycle_count: number, net_pnl: number | null, win_rate_pct: number | null, note: string }
}

export interface StrategyOperations {
	start_date: string
	end_date: string
	is_intraday: boolean
	accounts: StrategyOperationAccount[]
	totals: { account_count: number, book_pnl: number, ledger_trade_count: number, accounting_repair_count: number, forward_source_count: number }
}

export function fetchStrategyOperations() {
	return request.get("portfolio/operations", { timeout: 30000, retry: 0 }).json<{ status: string, data: StrategyOperations }>();
}

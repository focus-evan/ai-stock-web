import { request } from "#src/utils/request";

export interface WildmanCandidate {
	stock_code: string
	stock_name: string
	strategy_type: string
	strategy_name: string
	reason: string
	reason_codes?: string[]
	reasons?: string[]
	reference_price: number | null
	entry_low: number | null
	entry_high: number | null
	stop_loss: number | null
	target_price: number | null
	generated_at: string | null
	validation_status: string | null
	recommendation_kind?: "conditional_plan"
	execution_status?: "awaiting_confirmation"
	current_action?: "WAIT"
	execution_reason?: string
}

export interface WildmanSource {
	strategy_type: string
	strategy_name: string
	status: "available" | "empty" | "pending" | "unavailable" | "stale" | "closed" | "paused"
	generated_at: string | null
	trading_date: string | null
	count: number | null
	reason: string
}

export interface WildmanDaily {
	trading_date: string
	server_time: string
	is_trading_day: boolean
	recommendation_status: "recommended" | "no_recommendation" | "pending" | "unavailable" | "closed"
	headline: string
	reason_codes: string[]
	reasons: string[]
	market_gate: { allowed?: boolean, regime?: string, reason?: string, basis_date?: string, observed_at?: string } | null
	recommended: WildmanCandidate[]
	not_recommended: WildmanCandidate[]
	source_snapshots: WildmanSource[]
	methodology_note: string
}

export interface WildmanHolding {
	watchlist_id: number
	stock_code: string
	stock_name: string
	current_shares: number | null
	effective_cost: number | null
	has_unwind_account: boolean
	position_conflict: boolean
	registration_complete?: boolean
	account_status?: string
}

export interface WildmanHoldings {
	source: "user_recorded"
	items: WildmanHolding[]
	total: number
	initialized: number
	pending: number
}

/** Both readers are side-effect-free. Creating an unwind plan is a separate user action. */
export async function fetchWildmanDaily(signal?: AbortSignal): Promise<WildmanDaily> {
	const response = await request.get("strategy/wildman/daily", { signal, timeout: 30000, retry: 0 })
		.json<{ status: string, data: WildmanDaily }>();
	const data = response.data;
	if (response.status !== "success" || !data)
		throw new Error("每日研判数据不完整");
	const complete = [data.recommended, data.not_recommended, data.source_snapshots, data.reasons].every(Array.isArray);
	if (!complete || !["recommended", "no_recommendation", "pending", "unavailable", "closed"].includes(data.recommendation_status)) {
		throw new Error("每日研判数据不完整");
	}
	return data;
}

export async function fetchWildmanHoldings(signal?: AbortSignal): Promise<WildmanHoldings> {
	const response = await request.get("strategy/combined/watchlist/holdings-summary", { signal, timeout: 30000, retry: 0 })
		.json<{ status: string, data: WildmanHoldings }>();
	const data = response.data;
	if (response.status !== "success" || !data || data.source !== "user_recorded" || !Array.isArray(data.items))
		throw new Error("持仓摘要数据不完整");
	if (![data.total, data.initialized, data.pending].every(value => typeof value === "number" && Number.isFinite(value) && value >= 0)) {
		throw new Error("持仓摘要数据不完整");
	}
	return data;
}

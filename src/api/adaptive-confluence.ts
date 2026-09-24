import { request } from "#src/utils/request";

export interface AdaptiveCandidate {
	code: string
	name: string
	theme?: string
	score: number
	decision: string
	entry_min: number
	entry_max: number
	stop_loss_price: number
	target_price: number
	max_position_pct: number
	valid_until?: string
	blocking_reasons: string[]
	score_breakdown: Record<string, number>
	quant_evidence: { reason: string, pullback_pct?: number, volume_contraction?: number, atr14?: number }
	catalyst_evidence: { reason: string, evidence: { title: string, published_at: string, source: string, url?: string, tier: string, mapping: string }[] }
}
export interface AdaptiveData {
	runtime?: { scheduler_running: boolean, strategy_loop_running: boolean }
	generated_at?: string
	trading_date?: string
	recommendations: AdaptiveCandidate[]
	market_gate?: { phase: string, score: number, position_cap_pct: number, allowed: boolean, failures: string[], breadth_pct: number }
	source_status?: { status: string, reason?: string, news_count?: number }
	evolution?: {
		version: number
		status: string
		last_reason?: string
		last_decision?: string
		active_params?: { min_score?: number }
		latest_metrics?: { sample_count?: number, entry_date_count?: number, win_rate_pct?: number | null, avg_return_pct?: number | null, profit_factor?: number | null, win_rate_ci95_pct?: number[] }
	}
}
export function fetchAdaptiveConfluence() {
	return request.get("strategy/adaptive-confluence").json<{ status: string, data: AdaptiveData }>();
}
export function refreshAdaptiveConfluence() {
	return request.post("strategy/adaptive-confluence/refresh", { timeout: 240000 }).json<{ status: string, message?: string }>();
}
export function analyzeAdaptiveEvolution() {
	return request.post("strategy/evolution/run", { json: { strategy_type: "adaptive_confluence", force: true } }).json<{ status: string }>();
}
export function freezeAdaptiveEvolution(frozen: boolean) {
	return request.put("strategy/evolution/adaptive_confluence/status", { json: { status: frozen ? "frozen" : "active" } }).json<{ status: string }>();
}

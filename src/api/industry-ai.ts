import { request } from "#src/utils/request";

export interface AIJudgment {
	subject_id: string
	name: string
	decision: "focus" | "watch" | "exclude"
	quality_score: number
	thesis: string
	counterargument: string
	next_check: string
	evidence_ids: string[]
	gate_issues: string[]
	sector_ids?: string[]
	forecast?: { metric: string, direction: string, baseline_value: number | null, baseline_period: string, status: string } | null
}
export interface AIEvidence { id: string, title: string, kind: string, url?: string | null, as_of?: string | null, source?: string, scope?: string }
export interface AIResearchRun {
	run_id: string
	status: string
	started_at: string
	finished_at?: string | null
	error?: string | null
	model_version?: string
	model?: string
	summary?: string
	output?: { summary: string, sectors: AIJudgment[], companies: AIJudgment[], learning_applied: string[], research_review: { settled: number, confirmed: number, contradicted: number, status: string } }
	evidence?: AIEvidence[]
	source_status?: { financial_checked: number, company_count: number, relevant_news_count: number }
}
export interface AIResearchState {
	current: boolean
	latest: AIResearchRun | null
	attempt: AIResearchRun | null
	history: AIResearchRun[]
	reviews: { id: string, stock_name: string, metric: string, outcome: string, before: number, after: number, period: string, previous_thesis: string }[]
}
export interface IndustryAIStrategy {
	name: string
	version: string
	generated_at?: string
	recommendations: { code: string, name: string, score: number, decision: string, blocking_reasons: string[], chain_code: string, research_run_id: string }[]
	evolution: { version: number, last_decision: string, last_reason: string, active_params: { min_score: number }, latest_metrics?: { sample_count: number, win_rate_pct?: number | null, avg_return_pct?: number | null } } | null
	evolution_history: { id: number, created_at: string, decision: string, reason: string, version_before: number, version_after: number }[]
	runtime: { scheduler_running: boolean, loop_running: boolean, research_times: string[], entry_windows: string[] }
}
export function fetchIndustryAI(chain: string, signal?: AbortSignal) {
	return request.get(`industry/ai-research/${encodeURIComponent(chain)}`, { signal, timeout: 30000, retry: 0, ignoreLoading: true }).json<{ data: AIResearchState }>();
}
export function fetchIndustryAIStrategy(signal?: AbortSignal) {
	return request.get("industry/ai-research/strategy", { signal, timeout: 30000, retry: 0, ignoreLoading: true }).json<{ data: IndustryAIStrategy }>();
}
export function refreshIndustryAI(chain: string) {
	return request.post(`industry/ai-research/${encodeURIComponent(chain)}/refresh`, { timeout: 30000, retry: 0 }).json<{ status: string, run_id: string }>();
}

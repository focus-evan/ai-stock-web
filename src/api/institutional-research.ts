import { request } from "#src/utils/request";

export interface ResearchImpact {
	symbol: string
	name: string
	direction: string
	relation: string
	mechanism: string
	evidence_quote: string
	watch_next: string
	report_id?: string
	title?: string
	institution?: string
}
export interface ResearchReview {
	as_of: string
	status: string
	cohort: string
	eligible: boolean
	excluded_reasons: string[]
	entry_date?: string
	entry_price?: number
	reason?: string
	note?: string
	price_source?: string
	adjustment?: string
	curve?: { date: string, stock: number, benchmark: number }[]
	event_reaction?: { date: string, stock_return: number, benchmark_return: number, note: string }
	horizons: { sessions: number, status: string, stock_return?: number, benchmark_return?: number, excess_return?: number, direction_match?: boolean, max_gain?: number, max_loss?: number, reason?: string }[]
	target: { status: string, reason?: string, deadline?: string, adjusted_target?: number, intraday_touch_date?: string | null, close_touch_date?: string | null, expiry_return?: number | null }
}
export interface ResearchReport {
	id: string
	institution: string
	published_at: string
	first_seen_at: string
	content_hash: string
	payload: {
		title: string
		report_key: string
		summary: string
		source_url: string
		content?: string
		evidence_level: string
		time_precision: string
		verified: boolean
		scope: string
		direction: string
		evaluation_symbol: string
		benchmark: string
		direction_basis?: string
		published_at?: string
		target_basis_date?: string | null
		target_deadline?: string | null
		rating?: string | null
		target_price?: number | null
		impacts: ResearchImpact[]
	}
	review: ResearchReview | null
}
export interface ResearchOverview {
	reports: ResearchReport[]
	scorecards: { institution: string, direction: string, direction_basis: string, sessions: number, cohort: string, samples: number, hit_rate: number, excess_hit_rate: number | null, mean_excess_return: number, sample_warning: string }[]
	history: { id: string, status: string, started_at: string, error?: string, payload: { sources?: { source_id: string, source_name: string, status: string, count: number, errors?: string[] }[], errors?: string[], new_reports?: number, review?: { completed: number, errors: { report_id: string, reason: string }[] } } }[]
	sources: { id: string, name: string, pages: string[], limitations: string }[]
	runtime: { enabled: boolean, running: boolean, time: string, timezone: string }
	holdings_status: string
	holdings_as_of: string
	holdings: { symbol: string, name: string, shares: number, impacts: ResearchImpact[] }[]
	fresh_report_ids: string[]
	coverage_note: string
	record_limit: number
}
export const fetchInstitutionalResearch = () => request.get("institutional-research", { ignoreLoading: true, retry: 0 }).json<{ data: ResearchOverview }>();
export const fetchInstitutionalReport = (id: string) => request.get(`institutional-research/reports/${encodeURIComponent(id)}`, { retry: 0 }).json<{ data: ResearchReport }>();
export const refreshInstitutionalResearch = () => request.post("institutional-research/refresh", { retry: 0 }).json<{ status: string, run_id?: string }>();
export const backfillInstitutionalResearch = () => request.post("institutional-research/backfill", { retry: 0 }).json<{ status: string, run_id?: string }>();
export const importInstitutionalReport = (json: Record<string, unknown>) => request.post("institutional-research/reports", { json, retry: 0 }).json<{ id: string }>();

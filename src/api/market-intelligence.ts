import { request } from "#src/utils/request";

export interface IntelligenceArticle {
	id: string
	source_id: string
	source_name: string
	category: string
	title: string
	url: string
	published_at: string | null
	fetched_at: string
	publisher: string
	content: string
	evidence_level: "official" | "reprint" | "summary"
	freshness: "current" | "unknown"
	is_new?: boolean
	duplicate_source_ids: string[]
}
export interface IntelligenceHighlight {
	title: string
	priority: "high" | "medium" | "watch"
	category: string
	fact: string
	why_it_matters: string
	impact: "positive" | "negative" | "mixed" | "uncertain"
	affected_sectors: string[]
	watch_next: string
	uncertainty: string
	evidence_ids: string[]
}
export interface IntelligenceAnalysis {
	headline: string
	summary: string
	highlights: IntelligenceHighlight[]
	risks: string[]
	disagreements: string[]
	watchlist: string[]
}
export interface SourceStatus {
	source_id: string
	source_name: string
	category: string
	status: string
	count: number
	errors: string[]
	checked_at: string
}
export interface IntelligenceRun {
	run_id: string
	status: string
	started_at: string
	finished_at?: string | null
	cutoff: string
	error?: string | null
	source_status?: SourceStatus[]
	report?: {
		analysis_status: string
		analysis?: IntelligenceAnalysis | null
		articles: IntelligenceArticle[]
		window_start?: string
		coverage?: { enabled: number, responded: number, failed: number, limited: number, articles: number, new_articles: number, analyzed: number, undated: number }
	}
}
export interface IntelligenceSource {
	id: string
	name: string
	category: string
	enabled: boolean
	priority: string
	intended_use: string
	limitations: string
}
export interface IntelligenceOverview {
	run: IntelligenceRun | null
	history: IntelligenceRun[]
	sources: IntelligenceSource[]
	categories: { id: string, name: string }[]
	runtime: { enabled: boolean, running: boolean, time: string, timezone: string, every_day: boolean, next_run_at: string | null, catch_up: string }
}
export const fetchIntelligence = () => request.get("market-intelligence", { ignoreLoading: true }).json<{ data: IntelligenceOverview }>();
export const fetchIntelligenceRun = (id: string) => request.get(`market-intelligence/runs/${encodeURIComponent(id)}`, { ignoreLoading: true }).json<{ data: IntelligenceRun }>();
export const refreshIntelligence = () => request.post("market-intelligence/refresh", { retry: 0 }).json<{ status: string, run_id?: string }>();
export const setIntelligenceSource = (id: string, enabled: boolean) => request.patch(`market-intelligence/sources/${encodeURIComponent(id)}`, { json: { enabled }, retry: 0 }).json<{ status: string }>();

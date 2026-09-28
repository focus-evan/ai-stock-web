export interface CapitalEvidence {
	id: string
	kind: string
	scope: "market" | "sector" | "stock"
	scope_key: string
	label: string
	entity: string
	value: number | null
	unit: string
	direction: string
	actor_ids: string[]
	as_of: string | null
	published_at: string | null
	observed_at: string | null
	available_at?: string
	source: { name: string, url: string, dataset?: string, transport?: string }
	basis: "fact" | "proxy" | "inference"
	status: string
	historical: boolean
	usable_for_timing: boolean
	note: string
	details: Record<string, unknown>
}

export interface CapitalStockCard {
	state: "pending" | "observe" | "risk_review" | "not_applicable"
	decision: string
	industry: string
	sector: string
	evidence_ids: string[]
	facts: string[]
	inferences: string[]
	missing: string[]
	entry_conditions: string[]
	invalidations: string[]
	next_check: string
	evaluated_at?: string
}

export interface PortfolioCapitalTracking {
	version: string
	generated_at: string
	status: string
	market: { state: string, conclusion: string, warnings: string[], evidence_ids: string[] }
	sectors: Array<{ name: string, stock_codes: string[], evidence_ids: string[] }>
	evidence: CapitalEvidence[]
	actors: Array<{ id: string, name: string, status: string, evidence_ids: string[], boundary: string }>
	stock_cards: Record<string, CapitalStockCard>
	coverage: { evidence_count: number, current_count: number, historical_count: number, rejected_count: number }
	data_gaps: Array<{ dataset: string, message: string, query?: Record<string, unknown> }>
	workflow: Array<{ stage: string, task: string }>
	exposure: {
		by_currency: Array<{ currency: string, market_value: number, largest_stock_pct: number, sectors: Array<{ name: string, weight_pct: number }> }>
		note: string
	}
	review: {
		status: string
		previous_generated_at?: string
		note: string
		items: Array<{ stock_code: string, sessions: number, from_date: string, to_date: string, observation_return_pct: number, relative_index_pct: number | null, worst_from_open_pct: number }>
	}
	rule_note: string
}

import type { AggTrack } from "#src/api/shadow-stock";

export function isListedIPOStatus(value: unknown): boolean {
	if (typeof value !== "string")
		return false;
	const status = value.trim().toLowerCase();
	return status.startsWith("已上市") || ["已发行上市", "上市交易", "listed", "normally_listed", "listing_completed", "delisted"].includes(status);
}

export function formatMetric(value: unknown, digits = 1, suffix = "", positiveOnly = false): string {
	return typeof value === "number" && Number.isFinite(value) && (!positiveOnly || value > 0)
		? `${value.toFixed(digits)}${suffix}`
		: "待核验";
}

export function metricValue(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export interface ShadowDimensionItem {
	holder_name: string
	holder_stock_code: string
	holder_market_cap: number
	holder_main_business: string
	risk_level: string
	linked_companies: Array<{
		company_name: string
		ipo_status: string
		track_name: string
		holding_ratio: number
		holding_type: string
		gain_ratio: number
		calculation_available?: boolean
	}>
	linked_count: number
	max_ratio: number
	avg_gain: number | null
}

const riskOrder: Record<string, number> = { low: 0, medium: 1, unknown: 2, high: 3 };
function normalizedRisk(value: string): string {
	return Object.hasOwn(riskOrder, value) ? value : "unknown";
}

/** A company shown in several tracks is still one economic exposure. */
export function buildShadowDimension(tracks: AggTrack[]): ShadowDimensionItem[] {
	const holders = new Map<string, ShadowDimensionItem>();
	for (const track of tracks) {
		for (const company of track.companies) {
			if (isListedIPOStatus(company.ipo_status))
				continue;
			for (const holding of company.shadow_stocks) {
				const code = holding.holder_stock_code?.trim().toUpperCase() || "";
				const key = code || holding.holder_name?.trim();
				if (!key)
					continue;
				if (!holders.has(key)) {
					holders.set(key, {
						holder_name: holding.holder_name,
						holder_stock_code: code,
						holder_market_cap: holding.holder_market_cap,
						holder_main_business: holding.holder_main_business,
						risk_level: normalizedRisk(holding.risk_level),
						linked_companies: [],
						linked_count: 0,
						max_ratio: 0,
						avg_gain: null,
					});
				}
				const item = holders.get(key)!;
				const risk = normalizedRisk(holding.risk_level);
				if (riskOrder[risk] > riskOrder[item.risk_level])
					item.risk_level = risk;
				const existing = item.linked_companies.find(c => c.company_name.trim() === company.company_name.trim());
				if (existing) {
					const tracks = new Set(existing.track_name.split(" / "));
					tracks.add(track.track_name);
					existing.track_name = [...tracks].join(" / ");
					continue;
				}
				item.linked_companies.push({
					company_name: company.company_name,
					ipo_status: company.ipo_status,
					track_name: track.track_name,
					holding_ratio: holding.holding_ratio,
					holding_type: holding.holding_type,
					gain_ratio: holding.gain_ratio,
					calculation_available: holding.calculation_available,
				});
			}
		}
	}
	return [...holders.values()].map((item) => {
		const values = item.linked_companies.filter(c => c.calculation_available !== false && Number.isFinite(c.gain_ratio));
		return {
			...item,
			linked_count: item.linked_companies.length,
			max_ratio: Math.max(...item.linked_companies.map(c => metricValue(c.holding_ratio))),
			avg_gain: values.length === item.linked_companies.length ? values.reduce((sum, c) => sum + c.gain_ratio, 0) / values.length : null,
		};
	}).sort((a, b) => b.linked_count - a.linked_count || b.max_ratio - a.max_ratio);
}

/** All conditions must match the same relationship; statistics use only matching rows. */
export function filterAggregateTracks(tracks: AggTrack[], companyQuery: string, holderQuery: string, statuses: string[]): AggTrack[] {
	const companyKeyword = companyQuery.trim().toLowerCase();
	const holderKeyword = holderQuery.trim().toLowerCase();
	return tracks.map((track) => {
		const companies = track.companies.filter(company =>
			!isListedIPOStatus(company.ipo_status)
			&& (!companyKeyword || [company.company_name, ...(company.company_aliases || [])].some(name => name.toLowerCase().includes(companyKeyword)))
			&& (!statuses.length || statuses.includes(company.ipo_status)),
		).map(company => ({
			...company,
			shadow_stocks: company.shadow_stocks.filter((holding) => {
				return !holderKeyword || !!holding.holder_name?.toLowerCase().includes(holderKeyword) || !!holding.holder_stock_code?.toLowerCase().includes(holderKeyword);
			}),
		})).filter(company => !holderKeyword || company.shadow_stocks.length);
		return { ...track, companies, company_count: companies.length };
	}).filter(track => track.companies.length);
}
